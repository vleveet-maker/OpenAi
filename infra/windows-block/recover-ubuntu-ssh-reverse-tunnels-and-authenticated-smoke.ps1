param(
  [string]$RemoteHost = "77.66.186.75",
  [int]$RemotePort = 2222,
  [string]$RemoteUser = "mi50",
  [string]$SshKeyPath = "",
  [string]$RemoteRepoPath = "",
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

$scriptCompatibilityVersion = "phase27-ubuntu-ssh-recovery-v1"
$canonicalPublicUpstream = "ubuntu_nginx_to_127.0.0.1:4010"
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

function Get-SshFailureKind {
  param([string]$ErrorText)

  if ([string]::IsNullOrWhiteSpace($ErrorText)) {
    return $null
  }

  $normalized = $ErrorText.ToLowerInvariant()

  if ($normalized -match "host key verification failed") {
    return "host_key_verification_failed"
  }

  if ($normalized -match "permission denied") {
    return "auth_failed"
  }

  if ($normalized -match "connection refused") {
    return "connection_refused"
  }

  if ($normalized -match "timed out" -or $normalized -match "banner exchange") {
    return "ssh_banner_exchange_failed"
  }

  if ($normalized -match "no route to host" -or $normalized -match "network is unreachable") {
    return "network_unreachable"
  }

  return "ssh_failed_unknown"
}

function Get-UbuntuRepoStatus {
  param([string]$SshExecutable)

  $candidateList = New-Object System.Collections.Generic.List[string]

  if (-not [string]::IsNullOrWhiteSpace($RemoteRepoPath)) {
    $candidateList.Add($RemoteRepoPath.Trim())
  }

  $candidateList.Add("/opt/owmcgp-remote-relay")
  $candidateList.Add("/srv/owmcgp-remote-relay")
  $candidateList.Add('$HOME/OpenAi')
  $candidateList.Add('$HOME/owmcgp-remote-relay')

  $literalCandidates = @($candidateList | ForEach-Object {
    if ($_ -match '^\$HOME/') {
      $_
    } else {
      ConvertTo-ShellLiteral -Value $_
    }
  }) -join " "

  $script = @"
for candidate in $literalCandidates; do
  if [ -d "$candidate/.git" ]; then
    cd "$candidate"
    printf 'repo_path=%s\n' "$PWD"
    printf 'repo_commit=%s\n' "$(git rev-parse --short HEAD 2>/dev/null)"
    exit 0
  fi
done
exit 11
"@
  $command = "bash -lc " + (ConvertTo-ShellLiteral -Value $script)
  $result = Invoke-SshCommandSafe -SshExecutable $SshExecutable -Command $command

  if (-not $result.ok) {
    return [pscustomobject]@{
      found = $false
      repoPath = $null
      repoCommit = $null
      error = $result.error
    }
  }

  $repoPath = $null
  $repoCommit = $null

  foreach ($line in $result.lines) {
    if ($line -match "^repo_path=(.+)$") {
      $repoPath = $Matches[1].Trim()
    } elseif ($line -match "^repo_commit=(.+)$") {
      $repoCommit = $Matches[1].Trim()
    }
  }

  return [pscustomobject]@{
    found = -not [string]::IsNullOrWhiteSpace($repoPath)
    repoPath = $repoPath
    repoCommit = $repoCommit
    error =
      if (-not [string]::IsNullOrWhiteSpace($repoPath)) {
        $null
      } else {
        "remote_repo_not_found"
      }
  }
}

function Get-UbuntuNginxTestStatus {
  param([string]$SshExecutable)

  $result = Invoke-SshCommandSafe -SshExecutable $SshExecutable -Command "sudo nginx -t 2>&1"

  return [pscustomobject]@{
    ok = $result.ok
    exitCode = $result.exitCode
    output = @($result.lines)
    error = $result.error
  }
}

function Get-RemoteBearerToken {
  param(
    [string]$SshExecutable,
    [string]$EnvVarName,
    [string]$RepoPath
  )

  if (-not [string]::IsNullOrWhiteSpace($EnvVarName)) {
    $envCommand = "bash -lc " + (ConvertTo-ShellLiteral -Value "printf '%s' `$$EnvVarName")
    $envResult = Invoke-SshCommandSafe -SshExecutable $SshExecutable -Command $envCommand
    $envToken = ($envResult.lines -join "").Trim()

    if ($envResult.ok -and -not [string]::IsNullOrWhiteSpace($envToken)) {
      return [pscustomobject]@{
        value = $envToken
        source = "remote_env:$EnvVarName"
        host = $RemoteHost
      }
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($RepoPath)) {
    $settingsPath = "$RepoPath/infra/data/control-api/remote-relay.local.json"
    $nodeScript = @"
const fs = require('fs');
const path = process.argv[1];
const raw = fs.readFileSync(path, 'utf8');
const parsed = JSON.parse(raw.replace(/^\uFEFF/, ''));
process.stdout.write((parsed.apiToken || '').trim());
"@
    $settingsCommand = "bash -lc " + (ConvertTo-ShellLiteral -Value "if [ -f $(ConvertTo-ShellLiteral -Value $settingsPath) ]; then node -e $(ConvertTo-ShellLiteral -Value $nodeScript) $(ConvertTo-ShellLiteral -Value $settingsPath); fi")
    $settingsResult = Invoke-SshCommandSafe -SshExecutable $SshExecutable -Command $settingsCommand
    $settingsToken = ($settingsResult.lines -join "").Trim()

    if ($settingsResult.ok -and -not [string]::IsNullOrWhiteSpace($settingsToken)) {
      return [pscustomobject]@{
        value = $settingsToken
        source = "remote_settings"
        host = $RemoteHost
      }
    }
  }

  return [pscustomobject]@{
    value = ""
    source = "missing"
    host = $RemoteHost
  }
}

function Invoke-Phase26Wrapper {
  param(
    [string]$WrapperPath,
    [string]$Phase26LatestPath,
    [string]$Phase26JsonPath,
    [string]$Phase26MarkdownPath,
    [hashtable]$Overrides = @{}
  )

  $params = @{
    RemoteHost = $RemoteHost
    RemotePort = $RemotePort
    RemoteUser = $RemoteUser
    SshKeyPath = $SshKeyPath
    PublicBaseUrl = $PublicBaseUrl
    BearerToken = $BearerToken
    BearerTokenEnvVar = $BearerTokenEnvVar
    InternalBaseUrl = $InternalBaseUrl
    HostControllerBaseUrl = $HostControllerBaseUrl
    InternalAdminToken = $InternalAdminToken
    HostControllerToken = $HostControllerToken
    ReverseTunnelTaskName = $ReverseTunnelTaskName
    TaskStartWaitSeconds = $TaskStartWaitSeconds
    TunnelRetentionWaitSeconds = $TunnelRetentionWaitSeconds
    LatestJsonPath = $Phase26LatestPath
    OutputJsonPath = $Phase26JsonPath
    OutputMarkdownPath = $Phase26MarkdownPath
  }

  foreach ($key in $Overrides.Keys) {
    $params[$key] = $Overrides[$key]
  }

  $raw = & $WrapperPath @params
  $wrapperExitCode = $LASTEXITCODE
  $parsed = ConvertFrom-JsonSafe -Raw ($raw -join "`n")

  if ($null -ne $parsed) {
    return $parsed
  }

  if ($wrapperExitCode -ne 0) {
    throw "recover-ubuntu-sync-and-external-auth-smoke.ps1 exited with code $wrapperExitCode"
  }

  return ConvertFrom-JsonSafe -Raw (Get-Content -LiteralPath $Phase26JsonPath -Raw)
}

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\phases\27-deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion"
$phase26WrapperPath = Join-Path $repoRoot "infra\windows-block\recover-ubuntu-sync-and-external-auth-smoke.ps1"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("owmcgp-phase27-" + [System.Guid]::NewGuid().ToString("N"))
$phase26LatestPath = Join-Path $tempRoot "latest.json"
$phase26JsonPath = Join-Path $tempRoot "phase26-summary.json"
$phase26MarkdownPath = Join-Path $tempRoot "phase26-summary.md"

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\data\post-phase26-ubuntu-ssh-recovery\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "27-SSH-RECOVERY-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "27-SSH-RECOVERY-SUMMARY.md"
}

Ensure-ParentDirectory -Path $phase26JsonPath
Ensure-ParentDirectory -Path $OutputJsonPath
Ensure-ParentDirectory -Path $OutputMarkdownPath
Ensure-ParentDirectory -Path $LatestJsonPath

$baseResult = Invoke-Phase26Wrapper `
  -WrapperPath $phase26WrapperPath `
  -Phase26LatestPath $phase26LatestPath `
  -Phase26JsonPath $phase26JsonPath `
  -Phase26MarkdownPath $phase26MarkdownPath

$sshExecutable = Resolve-SshExecutable
$ubuntuProbe = Invoke-SshCommandSafe -SshExecutable $sshExecutable -Command "echo phase27-ubuntu-ssh-recovery-check"
$sshFailureKind = Get-SshFailureKind -ErrorText $ubuntuProbe.error
$ubuntuRepoStatus = [pscustomobject]@{
  found = $false
  repoPath = $null
  repoCommit = $null
  error = if ($ubuntuProbe.ok) { "not_checked" } else { $ubuntuProbe.error }
}
$ubuntuNginxTestStatus = [pscustomobject]@{
  ok = $false
  exitCode = $null
  output = @()
  error = if ($ubuntuProbe.ok) { "not_checked" } else { $ubuntuProbe.error }
}
$resolvedTokenSource = [string](Get-ObjectPropertyValue -InputObject $baseResult -PropertyName "authenticatedSmokeTokenSource" -DefaultValue "missing")
$resolvedTokenHost =
  if ($resolvedTokenSource -eq "missing") {
    $null
  } else {
    [System.Net.Dns]::GetHostName()
  }

if ($ubuntuProbe.ok) {
  $ubuntuRepoStatus = Get-UbuntuRepoStatus -SshExecutable $sshExecutable
  $ubuntuNginxTestStatus = Get-UbuntuNginxTestStatus -SshExecutable $sshExecutable

  if ($resolvedTokenSource -eq "missing") {
    $remoteToken = Get-RemoteBearerToken `
      -SshExecutable $sshExecutable `
      -EnvVarName $BearerTokenEnvVar `
      -RepoPath ([string](Get-ObjectPropertyValue -InputObject $ubuntuRepoStatus -PropertyName "repoPath" -DefaultValue ""))

    if (-not [string]::IsNullOrWhiteSpace($remoteToken.value)) {
      $baseResult = Invoke-Phase26Wrapper `
        -WrapperPath $phase26WrapperPath `
        -Phase26LatestPath $phase26LatestPath `
        -Phase26JsonPath $phase26JsonPath `
        -Phase26MarkdownPath $phase26MarkdownPath `
        -Overrides @{ BearerToken = $remoteToken.value }
      $resolvedTokenSource = $remoteToken.source
      $resolvedTokenHost = $remoteToken.host
    }
  }
}

$verdict =
  if (
    [bool](Get-ObjectPropertyValue -InputObject $baseResult -PropertyName "ubuntuSshReachable" -DefaultValue $false) -and
    $ubuntuRepoStatus.found -and
    -not [string]::IsNullOrWhiteSpace([string]$ubuntuRepoStatus.repoCommit) -and
    $ubuntuNginxTestStatus.ok -and
    [bool](Get-ObjectPropertyValue -InputObject (Get-ObjectPropertyValue -InputObject $baseResult -PropertyName "canonicalPublicUpstreamStatus") -PropertyName "matchesExpected" -DefaultValue $false) -and
    [bool](Get-ObjectPropertyValue -InputObject (Get-ObjectPropertyValue -InputObject $baseResult -PropertyName "reverseTunnelTaskStatus") -PropertyName "retainedRunning" -DefaultValue $false) -and
    [bool](Get-ObjectPropertyValue -InputObject (Get-ObjectPropertyValue -InputObject $baseResult -PropertyName "ubuntuTunnelListenerStatus") -PropertyName "allRequiredPresent" -DefaultValue $false) -and
    [int](Get-ObjectPropertyValue -InputObject $baseResult -PropertyName "readyWorkerCount" -DefaultValue 0) -gt 0 -and
    [bool](Get-ObjectPropertyValue -InputObject (Get-ObjectPropertyValue -InputObject $baseResult -PropertyName "externalHealthStatus") -PropertyName "ok" -DefaultValue $false) -and
    [bool](Get-ObjectPropertyValue -InputObject (Get-ObjectPropertyValue -InputObject $baseResult -PropertyName "externalModelsStatus") -PropertyName "ok" -DefaultValue $false) -and
    [bool](Get-ObjectPropertyValue -InputObject (Get-ObjectPropertyValue -InputObject $baseResult -PropertyName "externalChatStatus") -PropertyName "ok" -DefaultValue $false)
  ) {
    "externally_ready"
  } else {
    "hold_rollout"
  }

$summary =
  if ($verdict -eq "externally_ready") {
    "Repo-backed Ubuntu SSH recovery, reverse-tunnel retention, and authenticated external smoke are all green."
  } else {
    "Hold rollout: ubuntuSshReachable=$($baseResult.ubuntuSshReachable), sshFailureKind=$(if ($sshFailureKind) { $sshFailureKind } else { 'none' }), ubuntuRepoFound=$($ubuntuRepoStatus.found), nginxTestOk=$($ubuntuNginxTestStatus.ok), canonicalUpstreamMatchesExpected=$(Get-ObjectPropertyValue -InputObject $baseResult.canonicalPublicUpstreamStatus -PropertyName 'matchesExpected' -DefaultValue $false), reverseTunnelRetainedRunning=$(Get-ObjectPropertyValue -InputObject $baseResult.reverseTunnelTaskStatus -PropertyName 'retainedRunning' -DefaultValue $false), ubuntuTunnelListenersReady=$(Get-ObjectPropertyValue -InputObject $baseResult.ubuntuTunnelListenerStatus -PropertyName 'allRequiredPresent' -DefaultValue $false), readyWorkerCount=$($baseResult.readyWorkerCount)/$($baseResult.totalWorkerCount), externalHealth=$(Get-ObjectPropertyValue -InputObject $baseResult.externalHealthStatus -PropertyName 'ok' -DefaultValue $false), externalModels=$(Get-ObjectPropertyValue -InputObject $baseResult.externalModelsStatus -PropertyName 'ok' -DefaultValue $false), externalChat=$(Get-ObjectPropertyValue -InputObject $baseResult.externalChatStatus -PropertyName 'ok' -DefaultValue $false)."
  }

$result = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  baseScriptCompatibilityVersion = $baseResult.scriptCompatibilityVersion
  repoBranch = "windows-browser-block-api-20260331"
  canonicalPublicUpstream = $canonicalPublicUpstream
  ubuntuSshReachable = $baseResult.ubuntuSshReachable
  sshFailureKind = $sshFailureKind
  ubuntuSshStatus = $baseResult.ubuntuSshStatus
  ubuntuRepoPath = $ubuntuRepoStatus.repoPath
  ubuntuRepoCommit = $ubuntuRepoStatus.repoCommit
  ubuntuRepoStatus = $ubuntuRepoStatus
  ubuntuNginxTestStatus = $ubuntuNginxTestStatus
  canonicalPublicUpstreamStatus = $baseResult.canonicalPublicUpstreamStatus
  ubuntuLocalRelayStatus = $baseResult.ubuntuLocalRelayStatus
  reverseTunnelTaskName = $baseResult.reverseTunnelTaskName
  reverseTunnelTaskStatus = $baseResult.reverseTunnelTaskStatus
  ubuntuTunnelListenerStatus = $baseResult.ubuntuTunnelListenerStatus
  readyWorkerCount = $baseResult.readyWorkerCount
  totalWorkerCount = $baseResult.totalWorkerCount
  readyWorkerIds = $baseResult.readyWorkerIds
  internalReadyzStatus = $baseResult.internalReadyzStatus
  windowsLoopbackListeners = $baseResult.windowsLoopbackListeners
  hostControllerReachable = $baseResult.hostControllerReachable
  internalWorkersReachable = $baseResult.internalWorkersReachable
  internalReadyzReachable = $baseResult.internalReadyzReachable
  remoteHost = $RemoteHost
  remotePort = $RemotePort
  remoteUser = $RemoteUser
  publicBaseUrl = $PublicBaseUrl
  externalModelUsed = $externalModel
  authenticatedSmokeExecutionHost = $baseResult.authenticatedSmokeExecutionHost
  authenticatedSmokeTokenSource = $resolvedTokenSource
  authenticatedSmokeTokenHost = $resolvedTokenHost
  externalHealthStatus = $baseResult.externalHealthStatus
  externalModelsStatus = $baseResult.externalModelsStatus
  externalChatStatus = $baseResult.externalChatStatus
  externalSmoke = $baseResult.externalSmoke
  summary = $summary
  verdict = $verdict
  preserveFirst = $baseResult.preserveFirst
}

$jsonOutput = $result | ConvertTo-Json -Depth 12
$jsonOutput | Set-Content -Path $LatestJsonPath -Encoding UTF8
$jsonOutput | Set-Content -Path $OutputJsonPath -Encoding UTF8

$markdown = @(
  "# Phase 27 SSH Recovery Summary",
  "",
  "- Generated: $($result.generatedAt)",
  "- Script compatibility version: $($result.scriptCompatibilityVersion)",
  "- Canonical public upstream: $($result.canonicalPublicUpstream)",
  "- Verdict: $($result.verdict)",
  "- Summary: $($result.summary)",
  "",
  "## Ubuntu SSH And Repo Truth",
  "",
  "- ubuntuSshReachable: $($result.ubuntuSshReachable)",
  "- sshFailureKind: $(if ($result.sshFailureKind) { $result.sshFailureKind } else { 'none' })",
  "- ubuntuRepoPath: $(if ($result.ubuntuRepoPath) { $result.ubuntuRepoPath } else { 'unknown' })",
  "- ubuntuRepoCommit: $(if ($result.ubuntuRepoCommit) { $result.ubuntuRepoCommit } else { 'unknown' })",
  "- nginx -t ok: $($result.ubuntuNginxTestStatus.ok)",
  "- canonical upstream matches expected: $(Get-ObjectPropertyValue -InputObject $result.canonicalPublicUpstreamStatus -PropertyName 'matchesExpected' -DefaultValue $false)",
  "",
  "## Reverse Tunnels",
  "",
  "- reverseTunnelTaskStatus: exists=$(Get-ObjectPropertyValue -InputObject $result.reverseTunnelTaskStatus -PropertyName 'exists' -DefaultValue $false) state=$(Get-ObjectPropertyValue -InputObject $result.reverseTunnelTaskStatus -PropertyName 'state' -DefaultValue 'unknown') retainedRunning=$(Get-ObjectPropertyValue -InputObject $result.reverseTunnelTaskStatus -PropertyName 'retainedRunning' -DefaultValue $false) lastTaskResult=$(Get-ObjectPropertyValue -InputObject $result.reverseTunnelTaskStatus -PropertyName 'lastTaskResult' -DefaultValue 'unknown')",
  "- ubuntuTunnelListenerStatus: reachable=$(Get-ObjectPropertyValue -InputObject $result.ubuntuTunnelListenerStatus -PropertyName 'reachable' -DefaultValue $false) presentPorts=$(@((Get-ObjectPropertyValue -InputObject $result.ubuntuTunnelListenerStatus -PropertyName 'presentPorts' -DefaultValue @())) -join ', ') missingPorts=$(if (@((Get-ObjectPropertyValue -InputObject $result.ubuntuTunnelListenerStatus -PropertyName 'missingPorts' -DefaultValue @())).Count -gt 0) { @((Get-ObjectPropertyValue -InputObject $result.ubuntuTunnelListenerStatus -PropertyName 'missingPorts' -DefaultValue @())) -join ', ' } else { 'none' })",
  "- readyWorkerCount: $($result.readyWorkerCount)/$($result.totalWorkerCount)",
  "",
  "## External Authenticated Smoke",
  "",
  "- tokenSource: $($result.authenticatedSmokeTokenSource)",
  "- tokenHost: $(if ($result.authenticatedSmokeTokenHost) { $result.authenticatedSmokeTokenHost } else { 'unknown' })",
  "- smokeExecutionHost: $($result.authenticatedSmokeExecutionHost)",
  "- external healthz: $(Get-ObjectPropertyValue -InputObject $result.externalHealthStatus -PropertyName 'statusCode' -DefaultValue 'unknown') ok=$(Get-ObjectPropertyValue -InputObject $result.externalHealthStatus -PropertyName 'ok' -DefaultValue $false)",
  "- external models: $(Get-ObjectPropertyValue -InputObject $result.externalModelsStatus -PropertyName 'statusCode' -DefaultValue 'unknown') ok=$(Get-ObjectPropertyValue -InputObject $result.externalModelsStatus -PropertyName 'ok' -DefaultValue $false)",
  "- external chat: $(Get-ObjectPropertyValue -InputObject $result.externalChatStatus -PropertyName 'statusCode' -DefaultValue 'unknown') ok=$(Get-ObjectPropertyValue -InputObject $result.externalChatStatus -PropertyName 'ok' -DefaultValue $false)",
  "- external chat worker: $(if (Get-ObjectPropertyValue -InputObject $result.externalChatStatus -PropertyName 'workerId') { Get-ObjectPropertyValue -InputObject $result.externalChatStatus -PropertyName 'workerId' } else { 'none' })",
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

$markdown | Set-Content -Path $OutputMarkdownPath -Encoding UTF8
$jsonOutput
