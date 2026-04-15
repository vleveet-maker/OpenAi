param(
  [string[]]$RemoteHosts = @("77.66.186.75", "95.78.126.163"),
  [int]$RemotePort = 2222,
  [string]$RemoteUser = "mi50",
  [string]$SshKeyPath = "",
  [string]$SshPassword = "",
  [string]$RemoteRepoPath = "/opt/owmcgp-remote-relay/services/control-api",
  [string]$PublicBaseUrl = "http://77.66.186.75",
  [string]$ApiToken = "",
  [string]$ApiTokenEnvVar = "OWMCGP_REMOTE_RELAY_API_TOKEN",
  [string]$WorkerId = "wife",
  [string]$ReverseTunnelTaskName = "OWMCGP Browser Block - Reverse Tunnels",
  [int]$TunnelRecoveryWaitSeconds = 20,
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptCompatibilityVersion = "phase37-reverse-tunnel-chat-smoke-v1"
$requiredListenerPorts = @(14021, 14022, 14023, 14024, 14025, 14026, 14027, 14040)

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

function ConvertTo-ShellLiteral {
  param([string]$Value)

  if ($null -eq $Value) {
    return "''"
  }

  return "'" + ($Value -replace "'", "'\''") + "'"
}

function Resolve-PythonExecutable {
  foreach ($commandName in @("python.exe", "python", "py.exe", "py")) {
    $candidate = Get-Command $commandName -ErrorAction SilentlyContinue

    if ($candidate) {
      return $candidate.Source
    }
  }

  throw "python was not found on this host."
}

function Resolve-SshPassword {
  if (-not [string]::IsNullOrWhiteSpace($SshPassword)) {
    return $SshPassword.Trim()
  }

  $envValue = [Environment]::GetEnvironmentVariable("OWMCGP_REMOTE_SSH_PASSWORD")

  if (-not [string]::IsNullOrWhiteSpace($envValue)) {
    return $envValue.Trim()
  }

  return ""
}

function Invoke-SshCommandSafe {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RemoteHostName,
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [int]$MaxAttempts = 6
  )

  $resolvedPassword = Resolve-SshPassword

  if ([string]::IsNullOrWhiteSpace($resolvedPassword) -and [string]::IsNullOrWhiteSpace($SshKeyPath)) {
    return [pscustomobject]@{
      ok = $false
      exitCode = -1
      lines = @()
      error = "ssh_credentials_missing"
    }
  }

  $lastResult = $null

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      $pythonExecutable = Resolve-PythonExecutable
      $env:OWMCGP_INLINE_SSH_HOST = $RemoteHostName
      $env:OWMCGP_INLINE_SSH_PORT = "$RemotePort"
      $env:OWMCGP_INLINE_SSH_USER = $RemoteUser
      $env:OWMCGP_INLINE_SSH_PASSWORD = $resolvedPassword
      $env:OWMCGP_INLINE_SSH_KEY_PATH = $SshKeyPath
      $env:OWMCGP_INLINE_SSH_COMMAND = $Command

      $pythonOutput = @'
import json
import logging
import os
import sys
import time
import paramiko

logging.getLogger("paramiko").setLevel(logging.CRITICAL)

host = os.environ["OWMCGP_INLINE_SSH_HOST"]
port = int(os.environ["OWMCGP_INLINE_SSH_PORT"])
user = os.environ["OWMCGP_INLINE_SSH_USER"]
password = os.environ.get("OWMCGP_INLINE_SSH_PASSWORD", "")
key_path = os.environ.get("OWMCGP_INLINE_SSH_KEY_PATH", "")
command = os.environ["OWMCGP_INLINE_SSH_COMMAND"]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    kwargs = {
        "hostname": host,
        "port": port,
        "username": user,
        "timeout": 30,
        "banner_timeout": 70,
        "auth_timeout": 30,
        "look_for_keys": False,
        "allow_agent": False,
    }
    if key_path:
        kwargs["key_filename"] = key_path
    else:
        kwargs["password"] = password

    client.connect(**kwargs)
    stdin, stdout, stderr = client.exec_command(command, timeout=180)

    if "PHASE37_SUDO_PASSWORD" in command:
        stdin.write(password + "\n")
        stdin.flush()

    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    print(json.dumps({
        "ok": code == 0,
        "exitCode": code,
        "lines": out.splitlines() + err.splitlines(),
        "error": None if code == 0 else (err or out or f"ssh exit {code}")
    }))
except Exception as exc:
    print(json.dumps({
        "ok": False,
        "exitCode": -1,
        "lines": [],
        "error": str(exc)
    }))
finally:
    client.close()
'@ | & $pythonExecutable -
      $parsed = ConvertFrom-JsonSafe -Raw ($pythonOutput -join "`n")

      if ($null -ne $parsed) {
        $lastResult = [pscustomobject]@{
          ok = [bool]$parsed.ok
          exitCode = [int]$parsed.exitCode
          lines = @($parsed.lines | ForEach-Object { "$_" })
          error = $parsed.error
        }

        $errorText = "$($lastResult.error)"
        $isRetryable =
          [string]::IsNullOrWhiteSpace($errorText) -or
          $errorText -match "Error reading SSH protocol banner|No existing session|timed out|EOF|WinError 10038|Connection reset"

        if ($lastResult.ok -or -not $isRetryable -or $attempt -eq $MaxAttempts) {
          return $lastResult
        }
      } else {
        $lastResult = [pscustomobject]@{
          ok = $false
          exitCode = -1
          lines = @()
          error = "ssh_output_unparseable"
        }
      }
    } catch {
      $lastResult = [pscustomobject]@{
        ok = $false
        exitCode = -1
        lines = @("$($_)")
        error = "$_"
      }
    } finally {
      Remove-Item Env:OWMCGP_INLINE_SSH_HOST -ErrorAction SilentlyContinue
      Remove-Item Env:OWMCGP_INLINE_SSH_PORT -ErrorAction SilentlyContinue
      Remove-Item Env:OWMCGP_INLINE_SSH_USER -ErrorAction SilentlyContinue
      Remove-Item Env:OWMCGP_INLINE_SSH_PASSWORD -ErrorAction SilentlyContinue
      Remove-Item Env:OWMCGP_INLINE_SSH_KEY_PATH -ErrorAction SilentlyContinue
      Remove-Item Env:OWMCGP_INLINE_SSH_COMMAND -ErrorAction SilentlyContinue
    }

    if ($attempt -lt $MaxAttempts) {
      Start-Sleep -Seconds ([Math]::Min(30, 5 * $attempt))
    }
  }

  if ($null -ne $lastResult) {
    return $lastResult
  }

  return [pscustomobject]@{
    ok = $false
    exitCode = -1
    lines = @()
    error = "ssh_output_unparseable"
  }
}

function Get-SshFailureKind {
  param([string]$ErrorText)

  if ([string]::IsNullOrWhiteSpace($ErrorText)) {
    return "ssh_empty_response"
  }

  $normalized = $ErrorText.ToLowerInvariant()

  if ($normalized -match "ssh_credentials_missing") {
    return "ssh_credentials_missing"
  }

  if ($normalized -match "permission denied|authentication failed") {
    return "auth_failed"
  }

  if ($normalized -match "connection refused") {
    return "connection_refused"
  }

  if ($normalized -match "timed out|banner exchange|ssh protocol banner") {
    return "ssh_timeout_or_banner_failed"
  }

  if ($normalized -match "no route to host|network is unreachable") {
    return "network_unreachable"
  }

  return "ssh_failed_unknown"
}

function Get-UbuntuServerTruth {
  param([string]$RemoteHostName)

  $repoLiteral = ConvertTo-ShellLiteral -Value $RemoteRepoPath
  $portsList = $requiredListenerPorts -join " "
  $names = @($ApiTokenEnvVar, "OWMCGP_REMOTE_RELAY_API_TOKEN", "REMOTE_RELAY_API_TOKEN") |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Select-Object -Unique
  $nameList = $names -join " "

  $script = @"
read -r PHASE37_SUDO_PASSWORD || PHASE37_SUDO_PASSWORD=""
printf 'phase37_ssh_ok=1\n'

if cd $repoLiteral 2>/dev/null; then
  printf 'repo_path=%s\n' "`$PWD"
  printf 'repo_commit=%s\n' "`$(git rev-parse --short HEAD 2>/dev/null)"
  printf 'repo_branch=%s\n' "`$(git branch --show-current 2>/dev/null)"
else
  printf 'repo_error=repo_path_unreachable\n'
fi

if printf '%s\n' "`$PHASE37_SUDO_PASSWORD" | sudo -S -p '' nginx -t >/tmp/phase37-nginx-test.out 2>&1; then
  printf 'nginx_config_ok=true\n'
else
  printf 'nginx_config_ok=false\n'
fi

if (printf '%s\n' "`$PHASE37_SUDO_PASSWORD" | sudo -S -p '' nginx -T 2>/dev/null || true) | grep -E 'proxy_pass[[:space:]]+http://127\.0\.0\.1:4010' >/dev/null 2>&1; then
  printf 'canonical_public_upstream_present=true\n'
else
  printf 'canonical_public_upstream_present=false\n'
fi

for p in $portsList; do
  if ss -ltnH "sport = :`$p" 2>/dev/null | grep -q LISTEN; then
    printf 'listener_%s=present\n' "`$p"
  else
    printf 'listener_%s=missing\n' "`$p"
  fi
done

token_found=false
for name in $nameList; do
  value=`$(printenv "`$name")
  if [ -n "`$value" ]; then
    printf 'token_source=remote_env:%s\n' "`$name"
    printf 'token=%s\n' "`$value"
    token_found=true
    break
  fi
done

if [ "`$token_found" != "true" ]; then
  env_file_content=`$((printf '%s\n' "`$PHASE37_SUDO_PASSWORD" | sudo -S -p '' cat /etc/owmcgp/remote-relay.env 2>/dev/null || cat /etc/owmcgp/remote-relay.env 2>/dev/null) || true)
  if [ -n "`$env_file_content" ]; then
    for name in $nameList; do
      value=`$(printf '%s\n' "`$env_file_content" | sed -n "s/^`$name=//p" | tail -n 1)
      if [ -n "`$value" ]; then
        printf 'token_source=remote_env_file:%s\n' "`$name"
        printf 'token=%s\n' "`$value"
        token_found=true
        break
      fi
    done
  fi
fi

if [ "`$token_found" != "true" ]; then
  printf 'token_source=missing\n'
fi
"@

  $result = Invoke-SshCommandSafe `
    -RemoteHostName $RemoteHostName `
    -Command ("bash -lc " + (ConvertTo-ShellLiteral -Value $script))

  $repoPath = ""
  $repoCommit = ""
  $repoBranch = ""
  $repoError = $null
  $nginxConfigOk = $false
  $canonicalPublicUpstreamPresent = $false
  $present = New-Object System.Collections.Generic.List[int]
  $missing = New-Object System.Collections.Generic.List[int]
  $token = ""
  $tokenSource = "missing"

  foreach ($line in @($result.lines)) {
    if ($line -match "^repo_path=(.+)$") {
      $repoPath = $Matches[1].Trim()
    } elseif ($line -match "^repo_commit=(.*)$") {
      $repoCommit = $Matches[1].Trim()
    } elseif ($line -match "^repo_branch=(.*)$") {
      $repoBranch = $Matches[1].Trim()
    } elseif ($line -match "^repo_error=(.+)$") {
      $repoError = $Matches[1].Trim()
    } elseif ($line -match "^nginx_config_ok=(true|false)$") {
      $nginxConfigOk = $Matches[1] -eq "true"
    } elseif ($line -match "^canonical_public_upstream_present=(true|false)$") {
      $canonicalPublicUpstreamPresent = $Matches[1] -eq "true"
    } elseif ($line -match "^listener_(\d+)=(present|missing)$") {
      if ($Matches[2] -eq "present") {
        $present.Add([int]$Matches[1])
      } else {
        $missing.Add([int]$Matches[1])
      }
    } elseif ($line -match "^token_source=(.+)$") {
      $tokenSource = $Matches[1].Trim()
    } elseif ($line -match "^token=(.+)$") {
      $token = $Matches[1].Trim()
    }
  }

  return [pscustomobject]@{
    sshOk = $result.ok -and (@($result.lines | Where-Object { $_ -eq "phase37_ssh_ok=1" }).Count -gt 0)
    sshError = $result.error
    repo = [pscustomobject]@{
      reachable = $result.ok -and -not [string]::IsNullOrWhiteSpace($repoPath)
      path = $repoPath
      commit = $repoCommit
      branch = $repoBranch
      error = if ([string]::IsNullOrWhiteSpace($repoPath)) { if ($repoError) { $repoError } else { $result.error } } else { $null }
    }
    nginx = [pscustomobject]@{
      configOk = $nginxConfigOk
      canonicalPublicUpstreamPresent = $canonicalPublicUpstreamPresent
      canonicalPublicUpstream = if ($canonicalPublicUpstreamPresent) { "Ubuntu nginx -> 127.0.0.1:4010" } else { "unconfirmed" }
    }
    listenerTruth = [pscustomobject]@{
      reachable = $result.ok
      requiredPorts = $requiredListenerPorts
      presentPorts = $present.ToArray()
      missingPorts = $missing.ToArray()
      allRequiredPresent = $result.ok -and $missing.Count -eq 0 -and $present.Count -eq $requiredListenerPorts.Count
      error = if ($result.ok) { $null } else { $result.error }
    }
    token = [pscustomobject]@{
      value = $token
      source = if ([string]::IsNullOrWhiteSpace($token)) { "missing" } else { "ssh:${RemoteHostName}:$tokenSource" }
      secretValueRecorded = $false
    }
  }
}

function Get-ReverseTunnelTaskSnapshot {
  $task = Get-ScheduledTask -TaskName $ReverseTunnelTaskName -ErrorAction SilentlyContinue

  if ($null -eq $task) {
    return [pscustomobject]@{
      exists = $false
      state = "missing"
      lastTaskResult = $null
      lastRunTime = $null
      nextRunTime = $null
    }
  }

  $info = Get-ScheduledTaskInfo -TaskName $ReverseTunnelTaskName -ErrorAction SilentlyContinue

  return [pscustomobject]@{
    exists = $true
    state = "$($task.State)"
    lastTaskResult = if ($info) { $info.LastTaskResult } else { $null }
    lastRunTime = if ($info) { $info.LastRunTime } else { $null }
    nextRunTime = if ($info) { $info.NextRunTime } else { $null }
  }
}

function Get-ReverseTunnelProcessSnapshot {
  $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
      ($_.CommandLine -match "start-reverse-tunnels") -or
      ($_.Name -match "ssh.exe" -and $_.CommandLine -match "14021")
    }

  return @($processes | ForEach-Object {
    [pscustomobject]@{
      processId = $_.ProcessId
      name = $_.Name
      commandLineRedacted = ($_.CommandLine -replace "OWMCGP_REMOTE_SSH_PASSWORD=[^ ;]+", "OWMCGP_REMOTE_SSH_PASSWORD=<redacted>")
    }
  })
}

function Get-LocalListenerTruth {
  $ports = @(4021, 4022, 4023, 4024, 4025, 4026, 4027, 4040, 8081)
  $connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue
  $present = New-Object System.Collections.Generic.List[int]
  $missing = New-Object System.Collections.Generic.List[int]

  foreach ($port in $ports) {
    if (@($connections | Where-Object { $_.LocalPort -eq $port }).Count -gt 0) {
      $present.Add([int]$port)
    } else {
      $missing.Add([int]$port)
    }
  }

  return [pscustomobject]@{
    checkedPorts = $ports
    presentPorts = $present.ToArray()
    missingPorts = $missing.ToArray()
  }
}

function Get-WorkerAgentPort {
  param([string]$CurrentWorkerId)

  $map = @{
    "dad" = 4021
    "wife" = 4022
    "shared-1" = 4023
    "shared-2" = 4024
    "shared-3" = 4025
    "shared-4" = 4026
    "shared-5" = 4027
  }

  if ($map.ContainsKey($CurrentWorkerId)) {
    return [int]$map[$CurrentWorkerId]
  }

  return $null
}

function Start-DirectReverseTunnel {
  param([string]$RemoteHostName)

  $startScript = Join-Path (Resolve-RepoRoot) "infra\windows-block\start-reverse-tunnels.ps1"
  $resolvedPassword = Resolve-SshPassword
  $previousPassword = $env:OWMCGP_REMOTE_SSH_PASSWORD

  if ([string]::IsNullOrWhiteSpace($resolvedPassword) -and [string]::IsNullOrWhiteSpace($SshKeyPath)) {
    return [pscustomobject]@{
      attempted = $false
      owner = "none"
      ok = $false
      error = "ssh_credentials_missing"
    }
  }

  try {
    if (-not [string]::IsNullOrWhiteSpace($resolvedPassword) -and [string]::IsNullOrWhiteSpace($SshKeyPath)) {
      $env:OWMCGP_REMOTE_SSH_PASSWORD = $resolvedPassword
    }

    $arguments = @{
      RemoteHost = $RemoteHostName
      RemotePort = $RemotePort
      RemoteUser = $RemoteUser
      IncludeHostController = $true
    }

    if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) {
      $arguments.SshKeyPath = $SshKeyPath
    }

    & $startScript @arguments | Out-Null

    return [pscustomobject]@{
      attempted = $true
      owner = "temporary_process"
      ok = $true
      error = $null
    }
  } catch {
    return [pscustomobject]@{
      attempted = $true
      owner = "temporary_process"
      ok = $false
      error = "$_"
    }
  } finally {
    if ($null -eq $previousPassword) {
      Remove-Item Env:OWMCGP_REMOTE_SSH_PASSWORD -ErrorAction SilentlyContinue
    } else {
      $env:OWMCGP_REMOTE_SSH_PASSWORD = $previousPassword
    }
  }
}

function Invoke-PublicHealthz {
  $uri = "$($PublicBaseUrl.TrimEnd('/'))/healthz"

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $uri -TimeoutSec 20
    return [pscustomobject]@{
      success = $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
      statusCode = [int]$response.StatusCode
      error = $null
    }
  } catch {
    $statusCode = $null

    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    return [pscustomobject]@{
      success = $false
      statusCode = $statusCode
      error = "$($_.Exception.Message)"
    }
  }
}

function Convert-PublicProbeResult {
  param(
    [object]$ProbePayload,
    [string]$TokenSource
  )

  $healthz = Get-ObjectPropertyValue -InputObject $ProbePayload -PropertyName "healthz"
  $models = Get-ObjectPropertyValue -InputObject $ProbePayload -PropertyName "models"
  $chat = Get-ObjectPropertyValue -InputObject $ProbePayload -PropertyName "chatCompletions"

  if ($null -eq $chat) {
    $chat = Get-ObjectPropertyValue -InputObject $ProbePayload -PropertyName "chat"
  }

  return [pscustomobject]@{
    tokenSource = $TokenSource
    healthz = $healthz
    models = $models
    chatCompletions = $chat
  }
}

function Invoke-ExternalSmoke {
  param(
    [string]$TokenValue,
    [string]$TokenSource
  )

  $probeScript = Join-Path (Resolve-RepoRoot) "infra\windows-block\probe-public-api.ps1"

  try {
    $raw = & $probeScript `
      -BaseUrl $PublicBaseUrl `
      -ApiToken $TokenValue `
      -WorkerId $WorkerId `
      -IncludeChatProbe
    $parsed = ConvertFrom-JsonSafe -Raw ($raw -join "`n")

    if ($null -eq $parsed) {
      return [pscustomobject]@{
        attempted = $true
        ok = $false
        error = "probe_output_unparseable"
        tokenSource = $TokenSource
      }
    }

    $converted = Convert-PublicProbeResult -ProbePayload $parsed -TokenSource $TokenSource
    $chatOk = [bool](Get-ObjectPropertyValue -InputObject $converted.chatCompletions -PropertyName "success" -DefaultValue $false)
    $modelsOk = [bool](Get-ObjectPropertyValue -InputObject $converted.models -PropertyName "success" -DefaultValue $false)
    $healthzOk = [bool](Get-ObjectPropertyValue -InputObject $converted.healthz -PropertyName "success" -DefaultValue $false)

    $converted | Add-Member -NotePropertyName "attempted" -NotePropertyValue $true -Force
    $converted | Add-Member -NotePropertyName "ok" -NotePropertyValue ($healthzOk -and $modelsOk -and $chatOk) -Force
    return $converted
  } catch {
    return [pscustomobject]@{
      attempted = $true
      ok = $false
      error = "$_"
      tokenSource = $TokenSource
    }
  }
}

function Get-ExternalChatFailure {
  param([object]$ExternalSmoke)

  $chat = Get-ObjectPropertyValue -InputObject $ExternalSmoke -PropertyName "chatCompletions"

  if ($null -eq $chat) {
    $chat = Get-ObjectPropertyValue -InputObject $ExternalSmoke -PropertyName "chat"
  }

  if ($null -eq $chat) {
    return [pscustomobject]@{
      statusCode = $null
      code = $null
      message = $null
      innerReason = $null
      blocker = "external_chat_result_missing"
    }
  }

  $statusCode = Get-ObjectPropertyValue -InputObject $chat -PropertyName "statusCode"
  $body = [string](Get-ObjectPropertyValue -InputObject $chat -PropertyName "body" -DefaultValue "")
  $errorText = [string](Get-ObjectPropertyValue -InputObject $chat -PropertyName "error" -DefaultValue "")
  $code = $null
  $message = $null
  $innerReason = $null

  $bodyPayload = ConvertFrom-JsonSafe -Raw $body

  if ($null -ne $bodyPayload) {
    $errorPayload = Get-ObjectPropertyValue -InputObject $bodyPayload -PropertyName "error"
    $code = Get-ObjectPropertyValue -InputObject $errorPayload -PropertyName "code"
    $message = Get-ObjectPropertyValue -InputObject $errorPayload -PropertyName "message"
  }

  if ([string]::IsNullOrWhiteSpace($message)) {
    $message = $errorText
  }

  if (-not [string]::IsNullOrWhiteSpace($message) -and $message -match "(worker_[A-Za-z0-9_]+|bootstrap_[A-Za-z0-9_]+)") {
    $innerReason = $Matches[1]
  }

  $blocker =
    if (-not [string]::IsNullOrWhiteSpace($innerReason)) {
      $innerReason
    } elseif (-not [string]::IsNullOrWhiteSpace($code)) {
      $code
    } elseif ($null -ne $statusCode) {
      "external_chat_http_$statusCode"
    } else {
      "external_chat_failed"
    }

  return [pscustomobject]@{
    statusCode = $statusCode
    code = $code
    message = $message
    innerReason = $innerReason
    blocker = $blocker
  }
}

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\phases\37-restore-ubuntu-reverse-ssh-tunnel-listeners-and-complete-external-authenticated-chat-smoke-after-token-models-proof"

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\data\post-phase36-reverse-tunnel-chat-smoke\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "37-REVERSE-TUNNEL-CHAT-SMOKE-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "37-REVERSE-TUNNEL-CHAT-SMOKE-SUMMARY.md"
}

Ensure-ParentDirectory -Path $LatestJsonPath
Ensure-ParentDirectory -Path $OutputJsonPath
Ensure-ParentDirectory -Path $OutputMarkdownPath

$normalizedRemoteHosts = @(
  foreach ($remoteHostValue in @($RemoteHosts)) {
    foreach ($part in ([string]$remoteHostValue -split ",")) {
      $trimmed = $part.Trim()

      if (-not [string]::IsNullOrWhiteSpace($trimmed)) {
        $trimmed
      }
    }
  }
) | Select-Object -Unique

$taskBefore = Get-ReverseTunnelTaskSnapshot
$processBefore = Get-ReverseTunnelProcessSnapshot
$localListenerTruthBefore = Get-LocalListenerTruth
$publicHealthz = Invoke-PublicHealthz
$sshAttempts = New-Object System.Collections.Generic.List[object]
$selectedHost = ""
$serverTruth = $null

foreach ($hostCandidate in $normalizedRemoteHosts) {
  $candidateTruth = Get-UbuntuServerTruth -RemoteHostName $hostCandidate
  $sshError = if ([string]::IsNullOrWhiteSpace($candidateTruth.sshError)) { "ssh_empty_response" } else { $candidateTruth.sshError }
  $failureKind = Get-SshFailureKind -ErrorText $sshError
  $sshAttempts.Add([pscustomobject]@{
    host = $hostCandidate
    port = $RemotePort
    user = $RemoteUser
    reachable = $candidateTruth.sshOk
    failureKind = $failureKind
    error = if ($candidateTruth.sshOk) { $null } else { $sshError }
  })

  if ($candidateTruth.sshOk -and [string]::IsNullOrWhiteSpace($selectedHost)) {
    $selectedHost = $hostCandidate
    $serverTruth = $candidateTruth
  }
}

if ($null -eq $serverTruth) {
  $serverTruth = [pscustomobject]@{
    sshOk = $false
    sshError = "ssh_unreachable"
    repo = [pscustomobject]@{ reachable = $false; path = ""; commit = ""; branch = ""; error = "ssh_unreachable" }
    nginx = [pscustomobject]@{ configOk = $false; canonicalPublicUpstreamPresent = $false; canonicalPublicUpstream = "unconfirmed" }
    listenerTruth = [pscustomobject]@{
      reachable = $false
      requiredPorts = $requiredListenerPorts
      presentPorts = @()
      missingPorts = $requiredListenerPorts
      allRequiredPresent = $false
      error = "ssh_unreachable"
    }
    token = [pscustomobject]@{ value = ""; source = "missing"; secretValueRecorded = $false }
  }
}

$tunnelStart = [pscustomobject]@{
  taskStartAttempted = $false
  taskStartOk = $false
  directStartAttempted = $false
  directStartOk = $false
  owner = "none"
  errors = @()
}

if (-not [string]::IsNullOrWhiteSpace($selectedHost) -and -not [bool]$serverTruth.listenerTruth.allRequiredPresent) {
  if ([bool]$taskBefore.exists) {
    $tunnelStart.taskStartAttempted = $true
    try {
      Start-ScheduledTask -TaskName $ReverseTunnelTaskName -ErrorAction Stop
      $tunnelStart.taskStartOk = $true
      $tunnelStart.owner = "scheduled_task"
      Start-Sleep -Seconds $TunnelRecoveryWaitSeconds
      $serverTruth = Get-UbuntuServerTruth -RemoteHostName $selectedHost
    } catch {
      $tunnelStart.errors += "scheduled_task_start_failed: $_"
    }
  }

  if (-not [bool]$serverTruth.listenerTruth.allRequiredPresent) {
    $directStart = Start-DirectReverseTunnel -RemoteHostName $selectedHost
    $tunnelStart.directStartAttempted = $directStart.attempted
    $tunnelStart.directStartOk = $directStart.ok
    if ($directStart.ok) {
      $tunnelStart.owner = $directStart.owner
    }
    if (-not [string]::IsNullOrWhiteSpace($directStart.error)) {
      $tunnelStart.errors += "direct_start_failed: $($directStart.error)"
    }
    Start-Sleep -Seconds $TunnelRecoveryWaitSeconds
    $serverTruth = Get-UbuntuServerTruth -RemoteHostName $selectedHost
  }
}

$taskAfter = Get-ReverseTunnelTaskSnapshot
$processAfter = Get-ReverseTunnelProcessSnapshot
$localListenerTruthAfter = Get-LocalListenerTruth
$workerAgentPort = Get-WorkerAgentPort -CurrentWorkerId $WorkerId
$requiredLocalPortsForSmoke = @(4040)

if ($null -ne $workerAgentPort) {
  $requiredLocalPortsForSmoke += $workerAgentPort
}

$localSmokePortsMissing = @(
  foreach ($port in $requiredLocalPortsForSmoke) {
    if (@($localListenerTruthAfter.presentPorts | Where-Object { $_ -eq $port }).Count -eq 0) {
      $port
    }
  }
)
$tokenValue = ""
$tokenSource = "missing"

if (-not [string]::IsNullOrWhiteSpace($ApiToken)) {
  $tokenValue = $ApiToken.Trim()
  $tokenSource = "argument:ApiToken"
} elseif (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($ApiTokenEnvVar))) {
  $tokenValue = [Environment]::GetEnvironmentVariable($ApiTokenEnvVar).Trim()
  $tokenSource = "local_env:$ApiTokenEnvVar"
} elseif (-not [string]::IsNullOrWhiteSpace($serverTruth.token.value)) {
  $tokenValue = $serverTruth.token.value
  $tokenSource = $serverTruth.token.source
}

$tokenResolution = [pscustomobject]@{
  status = if ([string]::IsNullOrWhiteSpace($tokenValue)) { "missing" } else { "resolved" }
  source = if ([string]::IsNullOrWhiteSpace($tokenValue)) { "missing" } else { $tokenSource }
  secretValueRecorded = $false
}

$externalSmoke = [pscustomobject]@{
  attempted = $false
  skippedReason = "preconditions_not_met"
  healthz = $publicHealthz
  models = $null
  chatCompletions = $null
  ok = $false
}
$revalidationAttempted = $false

if (
  $tokenResolution.status -eq "resolved" -and
  -not [string]::IsNullOrWhiteSpace($selectedHost) -and
  [bool]$serverTruth.listenerTruth.allRequiredPresent -and
  $localSmokePortsMissing.Count -eq 0
) {
  $revalidationAttempted = $true
  $externalSmoke = Invoke-ExternalSmoke -TokenValue $tokenValue -TokenSource $tokenSource
} elseif (
  $tokenResolution.status -eq "resolved" -and
  -not [string]::IsNullOrWhiteSpace($selectedHost) -and
  [bool]$serverTruth.listenerTruth.allRequiredPresent -and
  $localSmokePortsMissing.Count -gt 0
) {
  $externalSmoke = [pscustomobject]@{
    attempted = $false
    skippedReason = "local_worker_ports_missing"
    healthz = $publicHealthz
    models = $null
    chatCompletions = $null
    ok = $false
  }
}

$externalChatFailure = Get-ExternalChatFailure -ExternalSmoke $externalSmoke

$nextBlocker =
  if ([string]::IsNullOrWhiteSpace($selectedHost)) {
    "ubuntu_ssh_unreachable"
  } elseif ($tokenResolution.status -ne "resolved") {
    "token_missing"
  } elseif (-not [bool]$serverTruth.nginx.canonicalPublicUpstreamPresent) {
    "ubuntu_canonical_upstream_unconfirmed"
  } elseif (-not [bool]$serverTruth.listenerTruth.allRequiredPresent) {
    "ubuntu_listeners_missing"
  } elseif ($localSmokePortsMissing.Count -gt 0) {
    "local_worker_ports_missing"
  } elseif (-not [bool](Get-ObjectPropertyValue -InputObject $externalSmoke -PropertyName "ok" -DefaultValue $false)) {
    $externalChatFailure.blocker
  } else {
    "none"
  }

$verdict =
  if ($nextBlocker -eq "none") {
    "externally_ready"
  } else {
    "hold_rollout"
  }

$summary =
  if ($verdict -eq "externally_ready") {
    "Reverse tunnels, Ubuntu listeners, token/models, and authenticated external chat are green."
  } else {
    "Hold rollout: nextBlocker=$nextBlocker; selectedHost=$(if ($selectedHost) { $selectedHost } else { 'none' }); listenersReady=$($serverTruth.listenerTruth.allRequiredPresent)."
  }

$result = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  windowsRepoPath = $repoRoot
  windowsCommit = (& git -C $repoRoot rev-parse --short HEAD 2>$null)
  publicBaseUrl = $PublicBaseUrl
  workerId = $WorkerId
  selectedUbuntuHost = $selectedHost
  ubuntuSshReachability = $sshAttempts.ToArray()
  ubuntuSsh = [pscustomobject]@{
    selectedHost = $selectedHost
    ok = -not [string]::IsNullOrWhiteSpace($selectedHost)
  }
  ubuntuRepoPath = $serverTruth.repo.path
  ubuntuCommit = $serverTruth.repo.commit
  ubuntuBranch = $serverTruth.repo.branch
  ubuntuRepoReachable = $serverTruth.repo.reachable
  ubuntuNginx = $serverTruth.nginx
  ubuntuNginxConfigOk = $serverTruth.nginx.configOk
  canonicalPublicUpstream = $serverTruth.nginx.canonicalPublicUpstream
  canonicalPublicUpstreamPresent = $serverTruth.nginx.canonicalPublicUpstreamPresent
  tokenResolution = $tokenResolution
  localListenerTruth = [pscustomobject]@{
    before = $localListenerTruthBefore
    after = $localListenerTruthAfter
    requiredForSmoke = $requiredLocalPortsForSmoke
    missingForSmoke = $localSmokePortsMissing
    allRequiredForSmokePresent = $localSmokePortsMissing.Count -eq 0
  }
  reverseTunnelTask = [pscustomobject]@{
    name = $ReverseTunnelTaskName
    before = $taskBefore
    after = $taskAfter
  }
  reverseTunnelProcess = [pscustomobject]@{
    before = $processBefore
    after = $processAfter
  }
  tunnelStart = $tunnelStart
  ubuntuListenerTruth = $serverTruth.listenerTruth
  externalHealthz = $publicHealthz
  externalSmoke = $externalSmoke
  externalChatFailure = $externalChatFailure
  revalidationAttempted = $revalidationAttempted
  nextBlocker = $nextBlocker
  preserveFirst = [pscustomobject]@{
    profilesDeleted = $false
    cookiesCleared = $false
    localStorageCleared = $false
    blindFullPoolRestartPerformed = $false
    massReloginPerformed = $false
  }
  verdict = $verdict
  summary = $summary
}

$jsonOutput = $result | ConvertTo-Json -Depth 12
$jsonOutput | Set-Content -LiteralPath $LatestJsonPath -Encoding UTF8
$jsonOutput | Set-Content -LiteralPath $OutputJsonPath -Encoding UTF8

$markdown = @(
  "# Phase 37 Reverse Tunnel Chat Smoke Summary",
  "",
  "- Generated: $($result.generatedAt)",
  "- Script compatibility version: $($result.scriptCompatibilityVersion)",
  "- Verdict: $($result.verdict)",
  "- Summary: $($result.summary)",
  "- Public base URL: $($result.publicBaseUrl)",
  "- WorkerId: $($result.workerId)",
  "",
  "## Token",
  "",
  "- status: $($result.tokenResolution.status)",
  "- source: $($result.tokenResolution.source)",
  "- secretValueRecorded: $($result.tokenResolution.secretValueRecorded)",
  "",
  "## Ubuntu",
  "",
  "- selectedUbuntuHost: $(if ($result.selectedUbuntuHost) { $result.selectedUbuntuHost } else { 'none' })",
  "- ubuntuRepoPath: $(if ($result.ubuntuRepoPath) { $result.ubuntuRepoPath } else { 'unknown' })",
  "- ubuntuCommit: $(if ($result.ubuntuCommit) { $result.ubuntuCommit } else { 'unknown' })",
  "- nginxConfigOk: $($result.ubuntuNginxConfigOk)",
  "- canonicalPublicUpstreamPresent: $($result.canonicalPublicUpstreamPresent)",
  "",
  "## Reverse Tunnels",
  "",
  "- owner: $($result.tunnelStart.owner)",
  "- taskStartAttempted: $($result.tunnelStart.taskStartAttempted)",
  "- directStartAttempted: $($result.tunnelStart.directStartAttempted)",
  "- allRequiredPresent: $($result.ubuntuListenerTruth.allRequiredPresent)",
  "- presentPorts: $(@($result.ubuntuListenerTruth.presentPorts) -join ', ')",
  "- missingPorts: $(if (@($result.ubuntuListenerTruth.missingPorts).Count -gt 0) { @($result.ubuntuListenerTruth.missingPorts) -join ', ' } else { 'none' })",
  "",
  "## External Smoke",
  "",
  "- healthz: status=$($result.externalHealthz.statusCode) ok=$($result.externalHealthz.success)",
  "- revalidationAttempted: $($result.revalidationAttempted)",
  "- smokeOk: $(Get-ObjectPropertyValue -InputObject $result.externalSmoke -PropertyName 'ok' -DefaultValue $false)",
  "- chatFailureStatusCode: $(if ($result.externalChatFailure.statusCode) { $result.externalChatFailure.statusCode } else { 'none' })",
  "- chatFailureCode: $(if ($result.externalChatFailure.code) { $result.externalChatFailure.code } else { 'none' })",
  "- chatFailureInnerReason: $(if ($result.externalChatFailure.innerReason) { $result.externalChatFailure.innerReason } else { 'none' })",
  "- nextBlocker: $($result.nextBlocker)",
  "",
  "## Preserve-First",
  "",
  "- profilesDeleted: $($result.preserveFirst.profilesDeleted)",
  "- cookiesCleared: $($result.preserveFirst.cookiesCleared)",
  "- localStorageCleared: $($result.preserveFirst.localStorageCleared)",
  "- blindFullPoolRestartPerformed: $($result.preserveFirst.blindFullPoolRestartPerformed)",
  "- massReloginPerformed: $($result.preserveFirst.massReloginPerformed)"
)

$markdown | Set-Content -LiteralPath $OutputMarkdownPath -Encoding UTF8
$jsonOutput
