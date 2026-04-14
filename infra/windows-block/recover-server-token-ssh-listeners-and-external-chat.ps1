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
  [string]$SettingsPath = "",
  [string]$WorkerId = "wife",
  [string]$ReverseTunnelTaskName = "OWMCGP Browser Block - Reverse Tunnels",
  [switch]$AttemptTunnelRecovery,
  [int]$TunnelRecoveryWaitSeconds = 20,
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptCompatibilityVersion = "phase36-server-token-ssh-listener-recovery-v1"
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
    [string]$Command
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

  $maxAttempts = 6
  $lastResult = $null

  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
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
        "timeout": 20,
        "banner_timeout": 20,
        "auth_timeout": 20,
        "look_for_keys": False,
        "allow_agent": False,
    }
    if key_path:
        kwargs["key_filename"] = key_path
    else:
        kwargs["password"] = password

    client.connect(**kwargs)
    stdin, stdout, stderr = client.exec_command(command, timeout=120)

    if "sudo -S -p ''" in command and password:
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
        $isRetryable = [string]::IsNullOrWhiteSpace($errorText) -or $errorText -match "Error reading SSH protocol banner|No existing session|timed out|EOF|WinError 10038"

        if ($lastResult.ok -or -not $isRetryable -or $attempt -eq $maxAttempts) {
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

    if ($attempt -lt $maxAttempts) {
      Start-Sleep -Seconds ([Math]::Min(20, 4 * $attempt))
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

  if ($normalized -match "permission denied" -or $normalized -match "authentication failed") {
    return "auth_failed"
  }

  if ($normalized -match "connection refused") {
    return "connection_refused"
  }

  if ($normalized -match "timed out" -or $normalized -match "banner exchange") {
    return "ssh_timeout_or_banner_failed"
  }

  if ($normalized -match "no route to host" -or $normalized -match "network is unreachable") {
    return "network_unreachable"
  }

  return "ssh_failed_unknown"
}

function Get-UbuntuSnapshot {
  param([string]$RemoteHostName)

  $repoLiteral = ConvertTo-ShellLiteral -Value $RemoteRepoPath
  $repoCommand = "bash -lc " + (ConvertTo-ShellLiteral -Value "cd $repoLiteral 2>/dev/null && printf 'repo_path=%s\nrepo_commit=%s\nrepo_branch=%s\n' `"`$PWD`" `"`$(git rev-parse --short HEAD 2>/dev/null)`" `"`$(git branch --show-current 2>/dev/null)`"")
  $repoResult = Invoke-SshCommandSafe -RemoteHostName $RemoteHostName -Command $repoCommand
  $nginxCommand =
    if (-not [string]::IsNullOrWhiteSpace((Resolve-SshPassword))) {
      "bash -lc " + (ConvertTo-ShellLiteral -Value "sudo -S -p '' nginx -t 2>&1 && (sudo -S -p '' nginx -T 2>/dev/null || true) | grep -E 'proxy_pass[[:space:]]+http://127\.0\.0\.1:4010' | head -n 20")
    } else {
      "bash -lc " + (ConvertTo-ShellLiteral -Value "sudo nginx -t 2>&1 && (sudo nginx -T 2>/dev/null || true) | grep -E 'proxy_pass[[:space:]]+http://127\.0\.0\.1:4010' | head -n 20")
    }
  $nginxResult = Invoke-SshCommandSafe -RemoteHostName $RemoteHostName -Command $nginxCommand

  $repoPath = ""
  $repoCommit = ""
  $repoBranch = ""

  foreach ($line in @($repoResult.lines)) {
    if ($line -match "^repo_path=(.+)$") {
      $repoPath = $Matches[1].Trim()
    } elseif ($line -match "^repo_commit=(.*)$") {
      $repoCommit = $Matches[1].Trim()
    } elseif ($line -match "^repo_branch=(.*)$") {
      $repoBranch = $Matches[1].Trim()
    }
  }

  return [pscustomobject]@{
    repoReachable = $repoResult.ok
    repoPath = $repoPath
    repoCommit = $repoCommit
    repoBranch = $repoBranch
    repoError = $repoResult.error
    nginxConfigOk = $nginxResult.ok
    canonicalPublicUpstreamPresent = @($nginxResult.lines | Where-Object { $_ -match "127\.0\.0\.1:4010" }).Count -gt 0
    nginxLines = @($nginxResult.lines)
    nginxError = $nginxResult.error
  }
}

function Get-UbuntuListenerTruth {
  param([string]$RemoteHostName)

  $portsList = $requiredListenerPorts -join " "
  $script = @"
for p in $portsList; do
  if ss -ltnH "sport = :`$p" 2>/dev/null | grep -q LISTEN; then
    printf '%s=present\n' "`$p"
  else
    printf '%s=missing\n' "`$p"
  fi
done
"@
  $result = Invoke-SshCommandSafe -RemoteHostName $RemoteHostName -Command ("bash -lc " + (ConvertTo-ShellLiteral -Value $script))
  $present = New-Object System.Collections.Generic.List[int]
  $missing = New-Object System.Collections.Generic.List[int]

  foreach ($line in @($result.lines)) {
    if ($line -match "^(\d+)=(present|missing)$") {
      if ($Matches[2] -eq "present") {
        $present.Add([int]$Matches[1])
      } else {
        $missing.Add([int]$Matches[1])
      }
    }
  }

  return [pscustomobject]@{
    reachable = $result.ok
    requiredPorts = $requiredListenerPorts
    presentPorts = $present.ToArray()
    missingPorts = $missing.ToArray()
    allRequiredPresent = $result.ok -and $missing.Count -eq 0 -and $present.Count -eq $requiredListenerPorts.Count
    error = $result.error
  }
}

function Get-UbuntuServerTruth {
  param([string]$RemoteHostName)

  $repoLiteral = ConvertTo-ShellLiteral -Value $RemoteRepoPath
  $settingsLiteral = ConvertTo-ShellLiteral -Value "$RemoteRepoPath/infra/data/control-api/remote-relay.local.json"
  $portsList = $requiredListenerPorts -join " "
  $names = @($ApiTokenEnvVar, "OWMCGP_REMOTE_RELAY_API_TOKEN", "REMOTE_RELAY_API_TOKEN") |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Select-Object -Unique
  $nameList = $names -join " "
  $script = @"
read -r PHASE36_SUDO_PASSWORD || PHASE36_SUDO_PASSWORD=""
printf 'phase36_ssh_ok=1\n'

if cd $repoLiteral 2>/dev/null; then
  printf 'repo_path=%s\n' "`$PWD"
  printf 'repo_commit=%s\n' "`$(git rev-parse --short HEAD 2>/dev/null)"
  printf 'repo_branch=%s\n' "`$(git branch --show-current 2>/dev/null)"
else
  printf 'repo_error=repo_path_unreachable\n'
fi

if printf '%s\n' "`$PHASE36_SUDO_PASSWORD" | sudo -S -p '' nginx -t >/tmp/phase36-nginx-test.out 2>&1; then
  printf 'nginx_config_ok=true\n'
else
  printf 'nginx_config_ok=false\n'
fi

if (printf '%s\n' "`$PHASE36_SUDO_PASSWORD" | sudo -S -p '' nginx -T 2>/dev/null || true) | grep -E 'proxy_pass[[:space:]]+http://127\.0\.0\.1:4010' >/dev/null 2>&1; then
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
  env_file_content=`$((printf '%s\n' "`$PHASE36_SUDO_PASSWORD" | sudo -S -p '' cat /etc/owmcgp/remote-relay.env 2>/dev/null || cat /etc/owmcgp/remote-relay.env 2>/dev/null) || true)
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

settings_path=$settingsLiteral
if [ "`$token_found" != "true" ] && [ -f "`$settings_path" ]; then
  value=`$(node -e 'const fs=require("fs"); const p=process.argv[1]; const j=JSON.parse(fs.readFileSync(p,"utf8").replace(/^\uFEFF/,"")); process.stdout.write((j.apiToken||"").trim());' "`$settings_path" 2>/dev/null)
  if [ -n "`$value" ]; then
    printf 'token_source=remote_settings\n'
    printf 'token=%s\n' "`$value"
    token_found=true
  fi
fi

if [ "`$token_found" != "true" ]; then
  printf 'token_source=missing\n'
fi
"@
  $result = Invoke-SshCommandSafe -RemoteHostName $RemoteHostName -Command ("bash -lc " + (ConvertTo-ShellLiteral -Value $script))
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
    sshOk = $result.ok -and (@($result.lines | Where-Object { $_ -eq "phase36_ssh_ok=1" }).Count -gt 0)
    sshError = $result.error
    ubuntuSnapshot = [pscustomobject]@{
      repoReachable = $result.ok -and -not [string]::IsNullOrWhiteSpace($repoPath)
      repoPath = $repoPath
      repoCommit = $repoCommit
      repoBranch = $repoBranch
      repoError = if ([string]::IsNullOrWhiteSpace($repoPath)) { if ($repoError) { $repoError } else { $result.error } } else { $null }
      nginxConfigOk = $nginxConfigOk
      canonicalPublicUpstreamPresent = $canonicalPublicUpstreamPresent
      nginxLines = @()
      nginxError = if ($nginxConfigOk) { $null } else { "nginx_config_unconfirmed" }
    }
    listenerTruth = [pscustomobject]@{
      reachable = $result.ok
      requiredPorts = $requiredListenerPorts
      presentPorts = $present.ToArray()
      missingPorts = $missing.ToArray()
      allRequiredPresent = $result.ok -and $missing.Count -eq 0 -and $present.Count -eq $requiredListenerPorts.Count
      error = if ($result.ok) { $null } else { $result.error }
    }
    remoteToken = [pscustomobject]@{
      value = $token
      source = if ([string]::IsNullOrWhiteSpace($token)) { "missing" } else { "ssh:${RemoteHostName}:$tokenSource" }
      error = if ($result.ok) { $null } else { $result.error }
    }
  }
}

function Resolve-LocalToken {
  $settingsToken = ""

  if ([string]::IsNullOrWhiteSpace($SettingsPath)) {
    $SettingsPath = Join-Path (Resolve-RepoRoot) "infra\data\control-api\remote-relay.local.json"
  }

  if (Test-Path $SettingsPath) {
    try {
      $settings = Get-Content -LiteralPath $SettingsPath -Raw | ConvertFrom-Json
      $settingsToken = [string](Get-ObjectPropertyValue -InputObject $settings -PropertyName "apiToken" -DefaultValue "")
    } catch {
      $settingsToken = ""
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($ApiToken)) {
    return [pscustomobject]@{
      value = $ApiToken.Trim()
      source = "argument:ApiToken"
    }
  }

  foreach ($name in @($ApiTokenEnvVar, "OWMCGP_REMOTE_RELAY_API_TOKEN", "REMOTE_RELAY_API_TOKEN")) {
    if ([string]::IsNullOrWhiteSpace($name)) {
      continue
    }

    $value = [Environment]::GetEnvironmentVariable($name)

    if (-not [string]::IsNullOrWhiteSpace($value)) {
      return [pscustomobject]@{
        value = $value.Trim()
        source = "local_env:$name"
      }
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($settingsToken)) {
    return [pscustomobject]@{
      value = $settingsToken.Trim()
      source = "local_settings"
    }
  }

  return [pscustomobject]@{
    value = ""
    source = "missing"
  }
}

function Resolve-RemoteToken {
  param(
    [string]$RemoteHostName,
    [string]$RepoPath
  )

  $names = @($ApiTokenEnvVar, "OWMCGP_REMOTE_RELAY_API_TOKEN", "REMOTE_RELAY_API_TOKEN") |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Select-Object -Unique
  $nameList = $names -join " "
  $script = @"
for name in $nameList; do
  value=`$(printenv "`$name")
  if [ -n "`$value" ]; then
    printf 'source=remote_env:%s\n' "`$name"
    printf 'token=%s\n' "`$value"
    exit 0
  fi
done
env_file_content=`$((sudo -S -p '' cat /etc/owmcgp/remote-relay.env 2>/dev/null || cat /etc/owmcgp/remote-relay.env 2>/dev/null) || true)
if [ -n "`$env_file_content" ]; then
  for name in $nameList; do
    value=`$(printf '%s\n' "`$env_file_content" | sed -n "s/^`$name=//p" | tail -n 1)
    if [ -n "`$value" ]; then
      printf 'source=remote_env_file:%s\n' "`$name"
      printf 'token=%s\n' "`$value"
      exit 0
    fi
  done
fi
settings_path="$RepoPath/infra/data/control-api/remote-relay.local.json"
if [ -f "`$settings_path" ]; then
  value=`$(node -e 'const fs=require("fs"); const p=process.argv[1]; const j=JSON.parse(fs.readFileSync(p,"utf8").replace(/^\uFEFF/,"")); process.stdout.write((j.apiToken||"").trim());' "`$settings_path" 2>/dev/null)
  if [ -n "`$value" ]; then
    printf 'source=remote_settings\n'
    printf 'token=%s\n' "`$value"
    exit 0
  fi
fi
exit 3
"@
  $command =
    if (-not [string]::IsNullOrWhiteSpace((Resolve-SshPassword))) {
      "bash -lc " + (ConvertTo-ShellLiteral -Value $script)
    } else {
      "bash -lc " + (ConvertTo-ShellLiteral -Value $script)
    }
  $result = Invoke-SshCommandSafe -RemoteHostName $RemoteHostName -Command $command
  $source = "missing"
  $token = ""

  foreach ($line in @($result.lines)) {
    if ($line -match "^source=(.+)$") {
      $source = $Matches[1].Trim()
    } elseif ($line -match "^token=(.+)$") {
      $token = $Matches[1].Trim()
    }
  }

  return [pscustomobject]@{
    value = $token
    source = if ([string]::IsNullOrWhiteSpace($token)) { "missing" } else { "ssh:${RemoteHostName}:$source" }
    error = if ($result.ok -or $result.exitCode -eq 3) { $null } else { $result.error }
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

function Invoke-PublicHealthz {
  $uri = "$($PublicBaseUrl.TrimEnd('/'))/healthz"

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $uri -TimeoutSec 20
    return [pscustomobject]@{
      ok = $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
      statusCode = [int]$response.StatusCode
      error = $null
    }
  } catch {
    $statusCode = $null

    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    return [pscustomobject]@{
      ok = $false
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

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\phases\36-server-bearer-token-and-ubuntu-ssh-listener-recovery-before-isolated-external-chat-revalidation"

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\data\post-phase35-server-token-ssh-listener-recovery\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "36-TOKEN-SSH-LISTENER-RECOVERY-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "36-TOKEN-SSH-LISTENER-RECOVERY-SUMMARY.md"
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

$publicHealthz = Invoke-PublicHealthz
$sshAttempts = New-Object System.Collections.Generic.List[object]
$selectedHost = ""
$ubuntuSnapshot = $null
$listenerTruth = $null
$remoteTokenFromServerTruth = $null

foreach ($hostCandidate in $normalizedRemoteHosts) {
  $serverTruth = Get-UbuntuServerTruth -RemoteHostName $hostCandidate
  $sshError = if ([string]::IsNullOrWhiteSpace($serverTruth.sshError)) { "ssh_empty_response" } else { $serverTruth.sshError }
  $failureKind = Get-SshFailureKind -ErrorText $sshError
  $sshAttempts.Add([pscustomobject]@{
    host = $hostCandidate
    port = $RemotePort
    user = $RemoteUser
    reachable = $serverTruth.sshOk
    failureKind = $failureKind
    error = if ($serverTruth.sshOk) { $null } else { $sshError }
  })

  if ($serverTruth.sshOk -and [string]::IsNullOrWhiteSpace($selectedHost)) {
    $selectedHost = $hostCandidate
    $ubuntuSnapshot = $serverTruth.ubuntuSnapshot
    $listenerTruth = $serverTruth.listenerTruth
    $remoteTokenFromServerTruth = $serverTruth.remoteToken
  }
}

if ($null -eq $listenerTruth) {
  $listenerTruth = [pscustomobject]@{
    reachable = $false
    requiredPorts = $requiredListenerPorts
    presentPorts = @()
    missingPorts = $requiredListenerPorts
    allRequiredPresent = $false
    error = "ssh_unreachable"
  }
}

if ($null -eq $ubuntuSnapshot) {
  $ubuntuSnapshot = [pscustomobject]@{
    repoReachable = $false
    repoPath = ""
    repoCommit = ""
    repoBranch = ""
    repoError = "ssh_unreachable"
    nginxConfigOk = $false
    canonicalPublicUpstreamPresent = $false
    nginxLines = @()
    nginxError = "ssh_unreachable"
  }
}

$taskBefore = Get-ReverseTunnelTaskSnapshot
$tunnelRecoveryAttempt = [pscustomobject]@{
  attempted = $false
  reason = "not_needed_or_preconditions_missing"
  taskStarted = $false
}

if (
  $AttemptTunnelRecovery.IsPresent -and
  -not [string]::IsNullOrWhiteSpace($selectedHost) -and
  -not [bool]$listenerTruth.allRequiredPresent
) {
  $tunnelRecoveryAttempt = [pscustomobject]@{
    attempted = $true
    reason = "listeners_missing"
    taskStarted = $false
  }

  try {
    Start-ScheduledTask -TaskName $ReverseTunnelTaskName -ErrorAction Stop
    $tunnelRecoveryAttempt.taskStarted = $true
    Start-Sleep -Seconds $TunnelRecoveryWaitSeconds
    $listenerTruth = Get-UbuntuListenerTruth -RemoteHostName $selectedHost
  } catch {
    $tunnelRecoveryAttempt | Add-Member -NotePropertyName "error" -NotePropertyValue "$_" -Force
  }
}

$taskAfter = Get-ReverseTunnelTaskSnapshot
$localToken = Resolve-LocalToken
$tokenValue = $localToken.value
$tokenSource = $localToken.source
$remoteTokenError = $null

if ($null -ne $remoteTokenFromServerTruth) {
  $remoteTokenError = $remoteTokenFromServerTruth.error
}

if (
  [string]::IsNullOrWhiteSpace($tokenValue) -and
  $null -ne $remoteTokenFromServerTruth -and
  -not [string]::IsNullOrWhiteSpace($remoteTokenFromServerTruth.value)
) {
  $tokenValue = $remoteTokenFromServerTruth.value
  $tokenSource = $remoteTokenFromServerTruth.source
} elseif ([string]::IsNullOrWhiteSpace($tokenValue) -and -not [string]::IsNullOrWhiteSpace($selectedHost)) {
  $remoteToken = Resolve-RemoteToken -RemoteHostName $selectedHost -RepoPath $RemoteRepoPath
  $remoteTokenError = $remoteToken.error

  if (-not [string]::IsNullOrWhiteSpace($remoteToken.value)) {
    $tokenValue = $remoteToken.value
    $tokenSource = $remoteToken.source
  }
}

$tokenResolution = [pscustomobject]@{
  status = if ([string]::IsNullOrWhiteSpace($tokenValue)) { "missing" } else { "resolved" }
  source = if ([string]::IsNullOrWhiteSpace($tokenValue)) { "missing" } else { $tokenSource }
  secretValueRecorded = $false
  remoteLookupError = $remoteTokenError
}

$revalidationAttempted = $false
$externalSmoke = [pscustomobject]@{
  attempted = $false
  skippedReason = "preconditions_not_met"
  healthz = $publicHealthz
  models = $null
  chatCompletions = $null
}

if (
  $tokenResolution.status -eq "resolved" -and
  -not [string]::IsNullOrWhiteSpace($selectedHost) -and
  [bool]$listenerTruth.allRequiredPresent
) {
  $revalidationAttempted = $true
  $externalSmoke = Invoke-ExternalSmoke -TokenValue $tokenValue -TokenSource $tokenSource
}

$nextBlocker =
  if ([string]::IsNullOrWhiteSpace($selectedHost)) {
    "ubuntu_ssh_unreachable"
  } elseif ($tokenResolution.status -ne "resolved") {
    "token_missing"
  } elseif (-not [bool]$ubuntuSnapshot.canonicalPublicUpstreamPresent) {
    "ubuntu_canonical_upstream_unconfirmed"
  } elseif (-not [bool]$listenerTruth.allRequiredPresent) {
    "ubuntu_listeners_missing"
  } elseif (-not [bool](Get-ObjectPropertyValue -InputObject $externalSmoke -PropertyName "ok" -DefaultValue $false)) {
    "external_authenticated_smoke_failed"
  } else {
    "none"
  }

$verdict =
  if ($nextBlocker -eq "none") {
    "externally_ready"
  } else {
    "hold_rollout"
  }

$recoveryStageVerdict =
  if (
    $tokenResolution.status -eq "resolved" -and
    -not [string]::IsNullOrWhiteSpace($selectedHost) -and
    [bool]$listenerTruth.allRequiredPresent
  ) {
    "ready_for_revalidation"
  } else {
    "hold_rollout"
  }

$summary =
  if ($verdict -eq "externally_ready") {
    "Token source, Ubuntu SSH/listeners, and authenticated external chat are green."
  } else {
    "Hold rollout: nextBlocker=$nextBlocker; tokenStatus=$($tokenResolution.status); selectedHost=$(if ($selectedHost) { $selectedHost } else { 'none' }); listenersReady=$($listenerTruth.allRequiredPresent)."
  }

$result = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  githubBranch = "windows-browser-block-api-20260331"
  windowsRepoPath = $repoRoot
  windowsCommit = (& git -C $repoRoot rev-parse --short HEAD 2>$null)
  publicBaseUrl = $PublicBaseUrl
  workerId = $WorkerId
  ubuntuSshReachability = $sshAttempts.ToArray()
  selectedUbuntuHost = $selectedHost
  ubuntuRepoPath = $ubuntuSnapshot.repoPath
  ubuntuCommit = $ubuntuSnapshot.repoCommit
  ubuntuBranch = $ubuntuSnapshot.repoBranch
  ubuntuRepoReachable = $ubuntuSnapshot.repoReachable
  ubuntuNginxConfigOk = $ubuntuSnapshot.nginxConfigOk
  canonicalPublicUpstream = if ($ubuntuSnapshot.canonicalPublicUpstreamPresent) { "Ubuntu nginx -> 127.0.0.1:4010" } else { "unconfirmed" }
  canonicalPublicUpstreamPresent = $ubuntuSnapshot.canonicalPublicUpstreamPresent
  tokenResolution = $tokenResolution
  reverseTunnelTask = [pscustomobject]@{
    name = $ReverseTunnelTaskName
    before = $taskBefore
    after = $taskAfter
    recoveryAttempt = $tunnelRecoveryAttempt
  }
  ubuntuListenerTruth = $listenerTruth
  externalHealthz = $publicHealthz
  externalSmoke = $externalSmoke
  phase35CarryForward = [pscustomobject]@{
    robocopyExitCode11 = $true
    note = "Phase 35 reported copy_failed with robocopy exit code 11 for all seven server browser-data copy attempts."
  }
  recoveryStageVerdict = $recoveryStageVerdict
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
  "# Phase 36 Token SSH Listener Recovery Summary",
  "",
  "- Generated: $($result.generatedAt)",
  "- Script compatibility version: $($result.scriptCompatibilityVersion)",
  "- Verdict: $($result.verdict)",
  "- Recovery stage verdict: $($result.recoveryStageVerdict)",
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
  "## Ubuntu SSH",
  "",
  "- selectedUbuntuHost: $(if ($result.selectedUbuntuHost) { $result.selectedUbuntuHost } else { 'none' })",
  "- ubuntuRepoPath: $(if ($result.ubuntuRepoPath) { $result.ubuntuRepoPath } else { 'unknown' })",
  "- ubuntuCommit: $(if ($result.ubuntuCommit) { $result.ubuntuCommit } else { 'unknown' })",
  "- nginxConfigOk: $($result.ubuntuNginxConfigOk)",
  "- canonicalPublicUpstreamPresent: $($result.canonicalPublicUpstreamPresent)",
  "",
  "## Listeners",
  "",
  "- allRequiredPresent: $($result.ubuntuListenerTruth.allRequiredPresent)",
  "- presentPorts: $(@($result.ubuntuListenerTruth.presentPorts) -join ', ')",
  "- missingPorts: $(if (@($result.ubuntuListenerTruth.missingPorts).Count -gt 0) { @($result.ubuntuListenerTruth.missingPorts) -join ', ' } else { 'none' })",
  "",
  "## External Smoke",
  "",
  "- healthz: status=$($result.externalHealthz.statusCode) ok=$($result.externalHealthz.ok)",
  "- revalidationAttempted: $($result.revalidationAttempted)",
  "- smokeOk: $(Get-ObjectPropertyValue -InputObject $result.externalSmoke -PropertyName 'ok' -DefaultValue $false)",
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
