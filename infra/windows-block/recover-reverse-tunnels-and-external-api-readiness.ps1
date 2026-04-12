param(
  [string]$RemoteHost = "77.66.186.75",
  [int]$RemotePort = 2222,
  [string]$RemoteUser = "mi50",
  [string]$SshKeyPath = "",
  [string]$InternalBaseUrl = "http://127.0.0.1:8081",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$InternalAdminToken = "local-internal-admin-token",
  [string]$HostControllerToken = "local-host-controller-token",
  [string]$ReverseTunnelTaskName = "OWMCGP Browser Block - Reverse Tunnels",
  [int]$TaskStartWaitSeconds = 20,
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptCompatibilityVersion = "phase25-live-fix-backport-v1"
$canonicalPublicUpstream = "ubuntu_nginx_to_127.0.0.1:4010"
$requiredTunnelPorts = @(14021, 14022, 14023, 14024, 14025, 14026, 14027, 14040)

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Ensure-ParentDirectory {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return
  }

  $parent = Split-Path -Parent $Path

  if (-not [string]::IsNullOrWhiteSpace($parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
}

function Resolve-SshExecutable {
  $candidate = Get-Command "ssh.exe" -ErrorAction SilentlyContinue

  if ($candidate) {
    return $candidate.Source
  }

  $knownPath = "C:\Windows\System32\OpenSSH\ssh.exe"

  if (Test-Path $knownPath) {
    return $knownPath
  }

  throw "ssh.exe was not found on this host."
}

function Invoke-JsonRequestSafe {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Method,
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [hashtable]$Headers = @{},
    [object]$Body = $null,
    [int]$TimeoutSeconds = 20
  )

  $invokeParams = @{
    Method = $Method
    Uri = $Url
    Headers = $Headers
    ContentType = "application/json"
    TimeoutSec = $TimeoutSeconds
  }

  if ($null -ne $Body) {
    $invokeParams.Body = ($Body | ConvertTo-Json -Depth 8 -Compress)
  }

  try {
    return [pscustomobject]@{
      ok = $true
      payload = Invoke-RestMethod @invokeParams
      error = $null
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      payload = $null
      error = "$_"
    }
  }
}

function Invoke-SshCommandSafe {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(Mandatory = $true)]
    [string]$SshExecutable
  )

  $arguments = New-Object System.Collections.Generic.List[string]
  $arguments.Add("-p")
  $arguments.Add("$RemotePort")
  $arguments.Add("-o")
  $arguments.Add("BatchMode=yes")
  $arguments.Add("-o")
  $arguments.Add("ConnectTimeout=10")

  if ($SshKeyPath -and $SshKeyPath.Trim().Length -gt 0) {
    $arguments.Add("-i")
    $arguments.Add($SshKeyPath)
  }

  $arguments.Add("$RemoteUser@$RemoteHost")
  $arguments.Add($Command)

  try {
    $output = & $SshExecutable @arguments 2>&1
    $exitCode = $LASTEXITCODE
  } catch {
    return [pscustomobject]@{
      ok = $false
      exitCode = -1
      lines = @("$($_)")
      error = "$_"
    }
  }

  return [pscustomobject]@{
    ok = $exitCode -eq 0
    exitCode = $exitCode
    lines = @($output | ForEach-Object { "$_" })
    error =
      if ($exitCode -eq 0) {
        $null
      } else {
        @($output | ForEach-Object { "$_" }) -join "`n"
      }
  }
}

function Get-ScheduledTaskSnapshot {
  param([string]$TaskName)

  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

  if ($null -eq $task) {
    return [pscustomobject]@{
      exists = $false
      state = "missing"
      lastRunTime = $null
      lastTaskResult = $null
      nextRunTime = $null
    }
  }

  $info = Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction SilentlyContinue

  return [pscustomobject]@{
    exists = $true
    state = [string]$task.State
    lastRunTime =
      if ($info) {
        $info.LastRunTime.ToString("o")
      } else {
        $null
      }
    lastTaskResult =
      if ($info) {
        $info.LastTaskResult
      } else {
        $null
      }
    nextRunTime =
      if ($info) {
        $info.NextRunTime.ToString("o")
      } else {
        $null
      }
  }
}

function Wait-ForScheduledTaskState {
  param(
    [string]$TaskName,
    [string]$ExpectedState,
    [int]$TimeoutSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    $snapshot = Get-ScheduledTaskSnapshot -TaskName $TaskName

    if ($snapshot.state -eq $ExpectedState) {
      return $snapshot
    }

    Start-Sleep -Seconds 1
  }

  return Get-ScheduledTaskSnapshot -TaskName $TaskName
}

function Test-LocalListener {
  param([int]$Port)

  return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Get-UbuntuTunnelListenerStatus {
  param([string]$SshExecutable)

  $ssResult = Invoke-SshCommandSafe -SshExecutable $SshExecutable -Command "ss -ltnH"

  if (-not $ssResult.ok) {
    return [pscustomobject]@{
      checkedAt = (Get-Date).ToString("o")
      reachable = $false
      expectedPorts = @($requiredTunnelPorts)
      presentPorts = @()
      missingPorts = @($requiredTunnelPorts)
      allRequiredPresent = $false
      error = $ssResult.error
    }
  }

  $presentPorts = New-Object System.Collections.Generic.List[int]

  foreach ($line in $ssResult.lines) {
    if ($line -match "127\.0\.0\.1:(\d+)") {
      $port = [int]$Matches[1]

      if ($requiredTunnelPorts -contains $port -and -not $presentPorts.Contains($port)) {
        $presentPorts.Add($port)
      }
    }
  }

  $missingPorts = @(
    $requiredTunnelPorts | Where-Object {
      -not $presentPorts.Contains($_)
    }
  )

  return [pscustomobject]@{
    checkedAt = (Get-Date).ToString("o")
    reachable = $true
    expectedPorts = @($requiredTunnelPorts)
    presentPorts = @($presentPorts)
    missingPorts = @($missingPorts)
    allRequiredPresent = $missingPorts.Count -eq 0
    error = $null
  }
}

function Get-CanonicalPublicUpstreamStatus {
  param([string]$SshExecutable)

  $nginxResult = Invoke-SshCommandSafe -SshExecutable $SshExecutable -Command "sudo nginx -T 2>&1"

  if (-not $nginxResult.ok) {
    return [pscustomobject]@{
      checkedAt = (Get-Date).ToString("o")
      reachable = $false
      expectedUpstream = "http://127.0.0.1:4010"
      proxyPass4010Present = $false
      proxyPassWindowsPresent = $false
      matchesExpected = $false
      error = $nginxResult.error
    }
  }

  $raw = $nginxResult.lines -join "`n"
  $proxyPass4010Present = $raw.Contains("proxy_pass http://127.0.0.1:4010")
  $proxyPassWindowsPresent = $raw.Contains("proxy_pass http://192.168.88.250")

  return [pscustomobject]@{
    checkedAt = (Get-Date).ToString("o")
    reachable = $true
    expectedUpstream = "http://127.0.0.1:4010"
    proxyPass4010Present = $proxyPass4010Present
    proxyPassWindowsPresent = $proxyPassWindowsPresent
    matchesExpected = $proxyPass4010Present -and -not $proxyPassWindowsPresent
    error = $null
  }
}

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\phases\25-deployed-windows-post-phase24-live-fix-smoke-wrapper-backport-and-persistent-disconnected-runtime-forced-host-public-owner-503-remediation"

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\data\post-phase24-external-api-readiness\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "25-EXTERNAL-READINESS-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "25-EXTERNAL-READINESS-SUMMARY.md"
}

$sshExecutable = Resolve-SshExecutable
$taskSnapshot = Get-ScheduledTaskSnapshot -TaskName $ReverseTunnelTaskName
$taskStartedByWrapper = $false

if ($taskSnapshot.exists -and $taskSnapshot.state -ne "Running") {
  try {
    Start-ScheduledTask -TaskName $ReverseTunnelTaskName -ErrorAction Stop
    $taskStartedByWrapper = $true
    $taskSnapshot = Wait-ForScheduledTaskState `
      -TaskName $ReverseTunnelTaskName `
      -ExpectedState "Running" `
      -TimeoutSeconds $TaskStartWaitSeconds
  } catch {
    $taskSnapshot = Get-ScheduledTaskSnapshot -TaskName $ReverseTunnelTaskName
  }
}

$caddyService = Get-Service *caddy* -ErrorAction SilentlyContinue
$caddyProcess = Get-Process caddy -ErrorAction SilentlyContinue
$windowsCaddyPresent = [bool]($caddyService -or $caddyProcess)

$readyzResponse = Invoke-JsonRequestSafe -Method "GET" -Url "$($InternalBaseUrl.TrimEnd('/'))/readyz"
$workersResponse = Invoke-JsonRequestSafe `
  -Method "GET" `
  -Url "$($InternalBaseUrl.TrimEnd('/'))/internal/workers" `
  -Headers @{ "x-internal-admin-token" = $InternalAdminToken }
$hostHealthResponse = Invoke-JsonRequestSafe `
  -Method "GET" `
  -Url "$($HostControllerBaseUrl.TrimEnd('/'))/health" `
  -Headers @{ "x-host-controller-token" = $HostControllerToken }

$readyWorkerCount = 0
$totalWorkerCount = 0
$readyWorkerIds = @()
$internalReadyzStatus = "unreachable"

if ($readyzResponse.ok -and $readyzResponse.payload) {
  $internalReadyzStatus = [string]$readyzResponse.payload.status
  $totalWorkerCount = [int]$readyzResponse.payload.totalWorkers

  if ($readyzResponse.payload.workerStatusCounts.PSObject.Properties.Match("ready").Count -gt 0) {
    $readyWorkerCount = [int]$readyzResponse.payload.workerStatusCounts.ready
  }
}

if ($workersResponse.ok -and $workersResponse.payload) {
  $readyWorkerIds = @(
    @($workersResponse.payload.workers) |
      Where-Object { $_.status.status -eq "ready" } |
      ForEach-Object { $_.workerId }
  )

  if ($readyWorkerIds.Count -gt $readyWorkerCount) {
    $readyWorkerCount = $readyWorkerIds.Count
  }

  if ($totalWorkerCount -eq 0) {
    $totalWorkerCount = @($workersResponse.payload.workers).Count
  }
}

$ubuntuTunnelListenerStatus = Get-UbuntuTunnelListenerStatus -SshExecutable $sshExecutable
$canonicalPublicUpstreamStatus = Get-CanonicalPublicUpstreamStatus -SshExecutable $sshExecutable
$windowsLoopbackListeners = [pscustomobject]@{
  port4040 = Test-LocalListener -Port 4040
  port8081 = Test-LocalListener -Port 8081
  port80 = Test-LocalListener -Port 80
  port443 = Test-LocalListener -Port 443
}
$reverseTunnelTaskStatus = [pscustomobject]@{
  taskName = $ReverseTunnelTaskName
  taskStartedByWrapper = $taskStartedByWrapper
  exists = $taskSnapshot.exists
  state = $taskSnapshot.state
  lastRunTime = $taskSnapshot.lastRunTime
  lastTaskResult = $taskSnapshot.lastTaskResult
  nextRunTime = $taskSnapshot.nextRunTime
}

$verdict =
  if (
    $reverseTunnelTaskStatus.exists -and
    $reverseTunnelTaskStatus.state -eq "Running" -and
    $canonicalPublicUpstreamStatus.matchesExpected -and
    $ubuntuTunnelListenerStatus.allRequiredPresent -and
    $readyWorkerCount -gt 0
  ) {
    "ready_for_external_smoke"
  } else {
    "hold_rollout"
  }

$summary =
  if ($verdict -eq "ready_for_external_smoke") {
    "Reverse tunnels, Ubuntu canonical upstream, and ready-worker truth are aligned for the authenticated external smoke."
  } else {
    "Hold rollout: reverseTunnelTaskState=$($reverseTunnelTaskStatus.state), canonicalUpstreamMatchesExpected=$($canonicalPublicUpstreamStatus.matchesExpected), ubuntuTunnelListenersReady=$($ubuntuTunnelListenerStatus.allRequiredPresent), readyWorkerCount=$readyWorkerCount/$totalWorkerCount."
  }

$result = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  canonicalPublicUpstream = $canonicalPublicUpstream
  canonicalPublicUpstreamStatus = $canonicalPublicUpstreamStatus
  windowsCaddyPresent = $windowsCaddyPresent
  reverseTunnelTaskName = $ReverseTunnelTaskName
  reverseTunnelTaskStatus = $reverseTunnelTaskStatus
  ubuntuTunnelListenerStatus = $ubuntuTunnelListenerStatus
  readyWorkerCount = $readyWorkerCount
  totalWorkerCount = $totalWorkerCount
  readyWorkerIds = @($readyWorkerIds)
  internalReadyzStatus = $internalReadyzStatus
  windowsLoopbackListeners = $windowsLoopbackListeners
  hostControllerReachable = $hostHealthResponse.ok
  internalWorkersReachable = $workersResponse.ok
  internalReadyzReachable = $readyzResponse.ok
  remoteHost = $RemoteHost
  remotePort = $RemotePort
  remoteUser = $RemoteUser
  summary = $summary
  verdict = $verdict
  preserveFirst = [pscustomobject][ordered]@{
    profilesDeleted = $false
    cookiesCleared = $false
    localStorageCleared = $false
    blindFullPoolRestartPerformed = $false
    massReloginPerformed = $false
  }
}

$jsonOutput = $result | ConvertTo-Json -Depth 12

Ensure-ParentDirectory -Path $LatestJsonPath
$jsonOutput | Set-Content -Path $LatestJsonPath -Encoding UTF8

Ensure-ParentDirectory -Path $OutputJsonPath
$jsonOutput | Set-Content -Path $OutputJsonPath -Encoding UTF8

$markdown = @(
  "# Phase 25 External API Readiness Summary",
  "",
  "- Generated: $($result.generatedAt)",
  "- Script compatibility version: $($result.scriptCompatibilityVersion)",
  "- Canonical public upstream: $($result.canonicalPublicUpstream)",
  "- Verdict: $($result.verdict)",
  "- Summary: $($result.summary)",
  "",
  "## Reverse Tunnels",
  "",
  "- reverseTunnelTaskName: $($result.reverseTunnelTaskName)",
  "- reverseTunnelTaskStatus: exists=$($result.reverseTunnelTaskStatus.exists) state=$($result.reverseTunnelTaskStatus.state) lastTaskResult=$($result.reverseTunnelTaskStatus.lastTaskResult)",
  "- ubuntuTunnelListenerStatus: reachable=$($result.ubuntuTunnelListenerStatus.reachable) presentPorts=$(@($result.ubuntuTunnelListenerStatus.presentPorts) -join ', ') missingPorts=$(if (@($result.ubuntuTunnelListenerStatus.missingPorts).Count -gt 0) { @($result.ubuntuTunnelListenerStatus.missingPorts) -join ', ' } else { 'none' })",
  "",
  "## Canonical Public Upstream",
  "",
  "- expectedUpstream: $($result.canonicalPublicUpstreamStatus.expectedUpstream)",
  "- proxyPass4010Present: $($result.canonicalPublicUpstreamStatus.proxyPass4010Present)",
  "- proxyPassWindowsPresent: $($result.canonicalPublicUpstreamStatus.proxyPassWindowsPresent)",
  "- matchesExpected: $($result.canonicalPublicUpstreamStatus.matchesExpected)",
  "- windowsCaddyPresent: $($result.windowsCaddyPresent)",
  "",
  "## Runtime Readiness",
  "",
  "- internalReadyzStatus: $($result.internalReadyzStatus)",
  "- readyWorkerCount: $($result.readyWorkerCount)/$($result.totalWorkerCount)",
  "- readyWorkerIds: $(if (@($result.readyWorkerIds).Count -gt 0) { @($result.readyWorkerIds) -join ', ' } else { 'none' })",
  "- windowsLoopbackListeners: 4040=$($result.windowsLoopbackListeners.port4040) 8081=$($result.windowsLoopbackListeners.port8081) 80=$($result.windowsLoopbackListeners.port80) 443=$($result.windowsLoopbackListeners.port443)",
  "",
  "## Preserve-First",
  "",
  "- profilesDeleted: $($result.preserveFirst.profilesDeleted)",
  "- cookiesCleared: $($result.preserveFirst.cookiesCleared)",
  "- localStorageCleared: $($result.preserveFirst.localStorageCleared)",
  "- blindFullPoolRestartPerformed: $($result.preserveFirst.blindFullPoolRestartPerformed)",
  "- massReloginPerformed: $($result.preserveFirst.massReloginPerformed)"
)

Ensure-ParentDirectory -Path $OutputMarkdownPath
$markdown | Set-Content -Path $OutputMarkdownPath -Encoding UTF8

$jsonOutput
