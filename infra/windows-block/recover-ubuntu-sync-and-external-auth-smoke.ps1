param(
  [string]$RemoteHost = "77.66.186.75",
  [int]$RemotePort = 2222,
  [string]$RemoteUser = "mi50",
  [string]$SshKeyPath = "",
  [string]$PublicBaseUrl = "http://77.66.186.75",
  [string]$BearerToken = "",
  [string]$BearerTokenEnvVar = "OWMCGP_REMOTE_RELAY_API_TOKEN",
  [string]$InternalBaseUrl = "http://127.0.0.1:8081",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$InternalAdminToken = "local-internal-admin-token",
  [string]$HostControllerToken = "local-host-controller-token",
  [string]$ReverseTunnelTaskName = "OWMCGP Browser Block - Reverse Tunnels",
  [int]$TaskStartWaitSeconds = 20,
  [int]$TunnelRetentionWaitSeconds = 15,
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptCompatibilityVersion = "phase26-ubuntu-sync-recovery-v1"
$canonicalPublicUpstream = "ubuntu_nginx_to_127.0.0.1:4010"
$requiredTunnelPorts = @(14021, 14022, 14023, 14024, 14025, 14026, 14027, 14040)
$externalModel = "owmcgp-browser"

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

function ConvertTo-ShellLiteral {
  param([string]$Value)

  if ($null -eq $Value) {
    return "''"
  }

  return "'" + ($Value -replace "'", "'\''") + "'"
}

function Resolve-BearerToken {
  param(
    [string]$ExplicitToken,
    [string]$EnvVarName
  )

  if (-not [string]::IsNullOrWhiteSpace($ExplicitToken)) {
    return [pscustomobject]@{
      value = $ExplicitToken.Trim()
      source = "parameter"
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($EnvVarName)) {
    $envValue = [Environment]::GetEnvironmentVariable($EnvVarName)

    if (-not [string]::IsNullOrWhiteSpace($envValue)) {
      return [pscustomobject]@{
        value = $envValue.Trim()
        source = "env:$EnvVarName"
      }
    }
  }

  return [pscustomobject]@{
    value = ""
    source = "missing"
  }
}

function Get-ObjectPropertyValue {
  param(
    [object]$InputObject,
    [string]$PropertyName,
    [object]$DefaultValue = $null
  )

  if ($null -eq $InputObject -or [string]::IsNullOrWhiteSpace($PropertyName)) {
    return $DefaultValue
  }

  $property = $InputObject.PSObject.Properties[$PropertyName]

  if ($null -eq $property -or $null -eq $property.Value) {
    return $DefaultValue
  }

  return $property.Value
}

function ConvertFrom-JsonSafe {
  param([string]$Raw)

  if ([string]::IsNullOrWhiteSpace($Raw)) {
    return $null
  }

  try {
    return $Raw | ConvertFrom-Json
  } catch {
    return $null
  }
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

function Invoke-HttpRequestSafe {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [string]$Method = "GET",
    [hashtable]$Headers = @{},
    [string]$Body = "",
    [int]$TimeoutSeconds = 60
  )

  $handler = $null
  $client = $null
  $request = $null

  try {
    $handler = [System.Net.Http.HttpClientHandler]::new()
    $client = [System.Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds($TimeoutSeconds)
    $request = [System.Net.Http.HttpRequestMessage]::new(
      [System.Net.Http.HttpMethod]::new($Method.ToUpperInvariant()),
      $Url
    )

    if (-not [string]::IsNullOrWhiteSpace($Body)) {
      $request.Content = [System.Net.Http.StringContent]::new(
        $Body,
        [System.Text.Encoding]::UTF8,
        "application/json"
      )
    }

    foreach ($headerName in $Headers.Keys) {
      $headerValue = [string]$Headers[$headerName]

      if ([string]::IsNullOrWhiteSpace($headerValue)) {
        continue
      }

      $null = $request.Headers.TryAddWithoutValidation($headerName, $headerValue)
    }

    $response = $client.SendAsync($request).GetAwaiter().GetResult()
    $responseBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $statusCode = [int]$response.StatusCode

    return [pscustomobject]@{
      ok = $statusCode -ge 200 -and $statusCode -lt 400
      statusCode = $statusCode
      body = $responseBody
      errorKind =
        if ($statusCode -ge 200 -and $statusCode -lt 400) {
          $null
        } else {
          "http_error"
        }
      error =
        if ($statusCode -ge 200 -and $statusCode -lt 400) {
          $null
        } else {
          "HTTP $statusCode"
        }
      requestUrl = $Url
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      statusCode = $null
      body = ""
      errorKind = "transport_error"
      error = "$_"
      requestUrl = $Url
    }
  } finally {
    if ($null -ne $request) {
      $request.Dispose()
    }

    if ($null -ne $client) {
      $client.Dispose()
    }

    if ($null -ne $handler) {
      $handler.Dispose()
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
  $lastRunTime = $null
  $nextRunTime = $null

  if ($info) {
    if ($null -ne $info.LastRunTime -and $info.LastRunTime -is [datetime] -and $info.LastRunTime.Year -gt 1) {
      $lastRunTime = $info.LastRunTime.ToString("o")
    }

    if ($null -ne $info.NextRunTime -and $info.NextRunTime -is [datetime] -and $info.NextRunTime.Year -gt 1) {
      $nextRunTime = $info.NextRunTime.ToString("o")
    }
  }

  return [pscustomobject]@{
    exists = $true
    state = [string]$task.State
    lastRunTime = $lastRunTime
    lastTaskResult =
      if ($info) {
        $info.LastTaskResult
      } else {
        $null
      }
    nextRunTime = $nextRunTime
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

function Get-UbuntuHttpStatus {
  param(
    [string]$SshExecutable,
    [string]$Url,
    [string]$Token = ""
  )

  $curlArguments = @(
    "curl",
    "-sS",
    "-o",
    "/dev/null",
    "-w",
    "%{http_code}"
  )

  if (-not [string]::IsNullOrWhiteSpace($Token)) {
    $curlArguments += "-H"
    $curlArguments += "Authorization: Bearer $Token"
  }

  $curlArguments += $Url
  $command = @($curlArguments | ForEach-Object { ConvertTo-ShellLiteral -Value "$_" }) -join " "
  $bashCommand = "bash -lc " + (ConvertTo-ShellLiteral -Value $command)
  $sshResult = Invoke-SshCommandSafe -SshExecutable $SshExecutable -Command $bashCommand

  if (-not $sshResult.ok) {
    return [pscustomobject]@{
      ok = $false
      statusCode = $null
      error = $sshResult.error
      attempted = $true
    }
  }

  $rawStatusCode = ($sshResult.lines -join "").Trim()
  $parsedStatusCode = 0

  if (-not [int]::TryParse($rawStatusCode, [ref]$parsedStatusCode)) {
    return [pscustomobject]@{
      ok = $false
      statusCode = $null
      error = "Unexpected status payload from Ubuntu curl: $rawStatusCode"
      attempted = $true
    }
  }

  return [pscustomobject]@{
    ok = $parsedStatusCode -ge 200 -and $parsedStatusCode -lt 400
    statusCode = $parsedStatusCode
    error =
      if ($parsedStatusCode -ge 200 -and $parsedStatusCode -lt 400) {
        $null
      } else {
        "HTTP $parsedStatusCode"
      }
    attempted = $true
  }
}

function Get-UbuntuLocalRelayStatus {
  param(
    [string]$SshExecutable,
    [string]$Token
  )

  $healthz = Get-UbuntuHttpStatus -SshExecutable $SshExecutable -Url "http://127.0.0.1:4010/healthz"
  $models =
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
      Get-UbuntuHttpStatus -SshExecutable $SshExecutable -Url "http://127.0.0.1:4010/v1/models" -Token $Token
    } else {
      [pscustomobject]@{
        ok = $false
        statusCode = $null
        error = "missing_bearer_token"
        attempted = $false
      }
    }

  return [pscustomobject]@{
    checkedAt = (Get-Date).ToString("o")
    healthz = $healthz
    models = $models
  }
}

function Invoke-PublicProbe {
  param(
    [string]$RepoRoot,
    [string]$ResolvedToken
  )

  if ([string]::IsNullOrWhiteSpace($ResolvedToken)) {
    return $null
  }

  $probeScript = Join-Path $RepoRoot "infra\windows-block\probe-public-api.ps1"
  $raw = & $probeScript `
    -BaseUrl $PublicBaseUrl `
    -ApiToken $ResolvedToken `
    -IncludeChatProbe `
    -HopName "ubuntu_public_owner"

  if ($LASTEXITCODE -ne 0) {
    throw "probe-public-api.ps1 exited with code $LASTEXITCODE"
  }

  return ConvertFrom-JsonSafe -Raw ($raw -join "`n")
}

function New-BlockedExternalSmoke {
  param([string]$Reason)

  return [pscustomobject]@{
    tokenAvailable = $false
    tokenSource = "missing"
    healthz = $null
    models = [pscustomobject]@{
      ok = $false
      statusCode = $null
      errorKind = "missing_bearer_token"
      requestUrl = "$($PublicBaseUrl.TrimEnd('/'))/v1/models"
    }
    chat = [pscustomobject]@{
      ok = $false
      statusCode = $null
      errorKind = "missing_bearer_token"
      requestUrl = "$($PublicBaseUrl.TrimEnd('/'))/v1/chat/completions"
      assistantReplyText = $null
      workerId = $null
      model = $externalModel
    }
    blockedReason = $Reason
  }
}

function Get-ProbeStep {
  param(
    [object]$ProbePayload,
    [string]$PropertyName,
    [string[]]$AlternatePropertyNames = @(),
    [string]$FallbackPath
  )

  $candidatePropertyNames = @($PropertyName) + @($AlternatePropertyNames | Where-Object {
    -not [string]::IsNullOrWhiteSpace([string]$_)
  })

  foreach ($candidatePropertyName in $candidatePropertyNames) {
    $step = Get-ObjectPropertyValue -InputObject $ProbePayload -PropertyName $candidatePropertyName

    if ($null -ne $step) {
      return $step
    }
  }

  return [pscustomobject]@{
    success = $false
    statusCode = $null
    errorKind = "missing_probe_step"
    requestUrl = "$($PublicBaseUrl.TrimEnd('/'))$FallbackPath"
    body = ""
  }
}

function Get-ProbeChatPayload {
  param([object]$ProbePayload)

  $chatProbe = Get-ProbeStep `
    -ProbePayload $ProbePayload `
    -PropertyName "chatCompletions" `
    -AlternatePropertyNames @("chat") `
    -FallbackPath "/v1/chat/completions"

  return ConvertFrom-JsonSafe -Raw (Get-ObjectPropertyValue -InputObject $chatProbe -PropertyName "body" -DefaultValue "")
}

function Get-ProbeChatReplyText {
  param([object]$ProbePayload)

  $chatPayload = Get-ProbeChatPayload -ProbePayload $ProbePayload
  $choices = @(Get-ObjectPropertyValue -InputObject $chatPayload -PropertyName "choices" -DefaultValue @())

  if ($choices.Count -eq 0) {
    return $null
  }

  $message = Get-ObjectPropertyValue -InputObject $choices[0] -PropertyName "message"
  return Get-ObjectPropertyValue -InputObject $message -PropertyName "content"
}

function Get-ProbeWorkerId {
  param([object]$ProbePayload)

  $chatPayload = Get-ProbeChatPayload -ProbePayload $ProbePayload
  return Get-ObjectPropertyValue -InputObject $chatPayload -PropertyName "worker_id"
}

function Get-ProbeModel {
  param([object]$ProbePayload)

  $chatPayload = Get-ProbeChatPayload -ProbePayload $ProbePayload
  return Get-ObjectPropertyValue -InputObject $chatPayload -PropertyName "model"
}

function Convert-PublicProbeResult {
  param([object]$ProbePayload)

  $healthProbe = Get-ProbeStep -ProbePayload $ProbePayload -PropertyName "healthz" -FallbackPath "/healthz"
  $modelsProbe = Get-ProbeStep -ProbePayload $ProbePayload -PropertyName "models" -FallbackPath "/v1/models"
  $chatProbe = Get-ProbeStep `
    -ProbePayload $ProbePayload `
    -PropertyName "chatCompletions" `
    -AlternatePropertyNames @("chat") `
    -FallbackPath "/v1/chat/completions"
  $replyText = Get-ProbeChatReplyText -ProbePayload $ProbePayload

  return [pscustomobject]@{
    tokenAvailable = $true
    tokenSource = $null
    healthz = [pscustomobject]@{
      ok = [bool]$healthProbe.success
      statusCode = $healthProbe.statusCode
      errorKind = $healthProbe.errorKind
      requestUrl = $healthProbe.requestUrl
    }
    models = [pscustomobject]@{
      ok = [bool]$modelsProbe.success
      statusCode = $modelsProbe.statusCode
      errorKind = $modelsProbe.errorKind
      requestUrl = $modelsProbe.requestUrl
    }
    chat = [pscustomobject]@{
      ok = ([bool]$chatProbe.success) -and $replyText -eq "probe-ok"
      statusCode = $chatProbe.statusCode
      errorKind =
        if ([bool]$chatProbe.success -and $replyText -ne "probe-ok") {
          "unexpected_reply"
        } else {
          $chatProbe.errorKind
        }
      requestUrl = $chatProbe.requestUrl
      assistantReplyText = $replyText
      workerId = Get-ProbeWorkerId -ProbePayload $ProbePayload
      model = Get-ProbeModel -ProbePayload $ProbePayload
    }
    blockedReason = $null
  }
}

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\phases\26-deployed-ubuntu-sync-recovery-reverse-tunnel-task-retention-and-external-authenticated-smoke-restoration"

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\data\post-phase25-external-restoration\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "26-EXTERNAL-RESTORATION-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "26-EXTERNAL-RESTORATION-SUMMARY.md"
}

$sshExecutable = Resolve-SshExecutable
$resolvedToken = Resolve-BearerToken -ExplicitToken $BearerToken -EnvVarName $BearerTokenEnvVar
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

if ($TunnelRetentionWaitSeconds -gt 0) {
  Start-Sleep -Seconds $TunnelRetentionWaitSeconds
}

$taskSnapshot = Get-ScheduledTaskSnapshot -TaskName $ReverseTunnelTaskName
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

$ubuntuProbe = Invoke-SshCommandSafe -SshExecutable $sshExecutable -Command "echo phase26-ubuntu-sync-check"
$ubuntuSshStatus = [pscustomobject]@{
  reachable = $ubuntuProbe.ok
  exitCode = $ubuntuProbe.exitCode
  error = $ubuntuProbe.error
}
$canonicalPublicUpstreamStatus = Get-CanonicalPublicUpstreamStatus -SshExecutable $sshExecutable
$ubuntuTunnelListenerStatus = Get-UbuntuTunnelListenerStatus -SshExecutable $sshExecutable
$ubuntuLocalRelayStatus = Get-UbuntuLocalRelayStatus -SshExecutable $sshExecutable -Token $resolvedToken.value
$windowsLoopbackListeners = [pscustomobject]@{
  port4040 = Test-LocalListener -Port 4040
  port8081 = Test-LocalListener -Port 8081
  port80 = Test-LocalListener -Port 80
  port443 = Test-LocalListener -Port 443
}

$reverseTunnelTaskStatus = [pscustomobject]@{
  taskName = $ReverseTunnelTaskName
  taskStartedByWrapper = $taskStartedByWrapper
  retentionWindowSeconds = $TunnelRetentionWaitSeconds
  exists = $taskSnapshot.exists
  state = $taskSnapshot.state
  lastRunTime = $taskSnapshot.lastRunTime
  lastTaskResult = $taskSnapshot.lastTaskResult
  nextRunTime = $taskSnapshot.nextRunTime
}

$publicHealthStatus = Invoke-HttpRequestSafe -Url "$($PublicBaseUrl.TrimEnd('/'))/healthz"
$publicSmoke =
  if (-not [string]::IsNullOrWhiteSpace($resolvedToken.value)) {
    $probePayload = Invoke-PublicProbe -RepoRoot $repoRoot -ResolvedToken $resolvedToken.value
    $probeResult = Convert-PublicProbeResult -ProbePayload $probePayload
    $probeResult.tokenSource = $resolvedToken.source
    $probeResult
  } else {
    $blocked = New-BlockedExternalSmoke -Reason "missing_bearer_token"
    $blocked.healthz = [pscustomobject]@{
      ok = $publicHealthStatus.ok
      statusCode = $publicHealthStatus.statusCode
      errorKind = $publicHealthStatus.errorKind
      requestUrl = $publicHealthStatus.requestUrl
    }
    $blocked
  }

$verdict =
  if (
    $ubuntuSshStatus.reachable -and
    $canonicalPublicUpstreamStatus.matchesExpected -and
    $ubuntuLocalRelayStatus.healthz.ok -and
    $reverseTunnelTaskStatus.exists -and
    $reverseTunnelTaskStatus.state -eq "Running" -and
    $ubuntuTunnelListenerStatus.allRequiredPresent -and
    $readyWorkerCount -gt 0 -and
    $publicSmoke.tokenAvailable -and
    $publicSmoke.healthz.ok -and
    $publicSmoke.models.ok -and
    $publicSmoke.chat.ok
  ) {
    "externally_ready"
  } else {
    "hold_rollout"
  }

$summary =
  if ($verdict -eq "externally_ready") {
    "GitHub-backed Ubuntu sync, reverse-tunnel retention, and authenticated external smoke are all green."
  } else {
    "Hold rollout: ubuntuSshReachable=$($ubuntuSshStatus.reachable), canonicalUpstreamMatchesExpected=$($canonicalPublicUpstreamStatus.matchesExpected), reverseTunnelTaskState=$($reverseTunnelTaskStatus.state), ubuntuTunnelListenersReady=$($ubuntuTunnelListenerStatus.allRequiredPresent), readyWorkerCount=$readyWorkerCount/$totalWorkerCount, externalHealth=$($publicSmoke.healthz.ok), externalModels=$($publicSmoke.models.ok), externalChat=$($publicSmoke.chat.ok)."
  }

$result = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  repoBranch = "windows-browser-block-api-20260331"
  canonicalPublicUpstream = $canonicalPublicUpstream
  ubuntuSshReachable = $ubuntuSshStatus.reachable
  ubuntuSshStatus = $ubuntuSshStatus
  canonicalPublicUpstreamStatus = $canonicalPublicUpstreamStatus
  ubuntuLocalRelayStatus = $ubuntuLocalRelayStatus
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
  publicBaseUrl = $PublicBaseUrl
  externalModelUsed = $externalModel
  authenticatedSmokeExecutionHost = [System.Net.Dns]::GetHostName()
  authenticatedSmokeTokenSource = $resolvedToken.source
  externalHealthStatus = $publicSmoke.healthz
  externalModelsStatus = $publicSmoke.models
  externalChatStatus = $publicSmoke.chat
  externalSmoke = $publicSmoke
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
  "# Phase 26 External Restoration Summary",
  "",
  "- Generated: $($result.generatedAt)",
  "- Script compatibility version: $($result.scriptCompatibilityVersion)",
  "- Canonical public upstream: $($result.canonicalPublicUpstream)",
  "- Verdict: $($result.verdict)",
  "- Summary: $($result.summary)",
  "",
  "## Ubuntu Sync And Upstream Truth",
  "",
  "- ubuntuSshReachable: $($result.ubuntuSshReachable)",
  "- canonical upstream matches expected: $($result.canonicalPublicUpstreamStatus.matchesExpected)",
  "- proxyPass4010Present: $($result.canonicalPublicUpstreamStatus.proxyPass4010Present)",
  "- proxyPassWindowsPresent: $($result.canonicalPublicUpstreamStatus.proxyPassWindowsPresent)",
  "- ubuntu local /healthz: $($result.ubuntuLocalRelayStatus.healthz.statusCode)",
  "- ubuntu local /v1/models: $(if ($result.ubuntuLocalRelayStatus.models.attempted) { $result.ubuntuLocalRelayStatus.models.statusCode } else { 'skipped-missing-token' })",
  "",
  "## Reverse Tunnels",
  "",
  "- reverseTunnelTaskStatus: exists=$($result.reverseTunnelTaskStatus.exists) state=$($result.reverseTunnelTaskStatus.state) lastTaskResult=$($result.reverseTunnelTaskStatus.lastTaskResult)",
  "- ubuntuTunnelListenerStatus: reachable=$($result.ubuntuTunnelListenerStatus.reachable) presentPorts=$(@($result.ubuntuTunnelListenerStatus.presentPorts) -join ', ') missingPorts=$(if (@($result.ubuntuTunnelListenerStatus.missingPorts).Count -gt 0) { @($result.ubuntuTunnelListenerStatus.missingPorts) -join ', ' } else { 'none' })",
  "- readyWorkerCount: $($result.readyWorkerCount)/$($result.totalWorkerCount)",
  "- readyWorkerIds: $(if (@($result.readyWorkerIds).Count -gt 0) { @($result.readyWorkerIds) -join ', ' } else { 'none' })",
  "",
  "## External Authenticated Smoke",
  "",
  "- tokenSource: $($result.authenticatedSmokeTokenSource)",
  "- smokeExecutionHost: $($result.authenticatedSmokeExecutionHost)",
  "- external healthz: $($result.externalHealthStatus.statusCode) ok=$($result.externalHealthStatus.ok)",
  "- external models: $($result.externalModelsStatus.statusCode) ok=$($result.externalModelsStatus.ok)",
  "- external chat: $($result.externalChatStatus.statusCode) ok=$($result.externalChatStatus.ok)",
  "- external chat worker: $(if ($result.externalChatStatus.workerId) { $result.externalChatStatus.workerId } else { 'none' })",
  "- external model used: $($result.externalModelUsed)",
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
