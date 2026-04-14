param(
  [string[]]$WorkerIds = @("wife", "dad", "shared-1", "shared-2", "shared-3", "shared-4", "shared-5"),
  [string]$WindowsRepoPath = "",
  [string]$UbuntuRepoPath = "",
  [string]$GitHubBranch = "windows-browser-block-api-20260331",
  [string]$SourceBrowserExecutablePath = "",
  [string]$SourceBrowserDataBasePath = "",
  [string]$SourceBrowserDataManifestPath = "",
  [switch]$CopySourceBrowserData,
  [string]$BrowserRootBasePath = "",
  [string]$PublicBaseUrl = "http://77.66.186.75",
  [string]$ApiToken = "",
  [string]$ApiTokenEnvVar = "OWMCGP_REMOTE_RELAY_API_TOKEN",
  [string]$RemoteHost = "77.66.186.75",
  [int]$RemotePort = 2222,
  [string]$RemoteUser = "mi50",
  [string]$SshKeyPath = "",
  [string]$SshPassword = "",
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

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

  if ($null -eq $InputObject) {
    return $DefaultValue
  }

  $property = $InputObject.PSObject.Properties[$PropertyName]

  if ($null -eq $property) {
    return $DefaultValue
  }

  return $property.Value
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

function Resolve-PythonExecutable {
  foreach ($commandName in @("python.exe", "python", "py.exe", "py")) {
    $candidate = Get-Command $commandName -ErrorAction SilentlyContinue

    if ($candidate) {
      return $candidate.Source
    }
  }

  throw "python was not found on this host."
}

function Invoke-SshCommandSafe {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command
  )

  $resolvedPassword = Resolve-SshPassword

  if (
    -not [string]::IsNullOrWhiteSpace($resolvedPassword) -and
    [string]::IsNullOrWhiteSpace($SshKeyPath)
  ) {
    try {
      $pythonExecutable = Resolve-PythonExecutable
      $env:OWMCGP_INLINE_SSH_HOST = $RemoteHost
      $env:OWMCGP_INLINE_SSH_PORT = "$RemotePort"
      $env:OWMCGP_INLINE_SSH_USER = $RemoteUser
      $env:OWMCGP_INLINE_SSH_PASSWORD = $resolvedPassword
      $env:OWMCGP_INLINE_SSH_COMMAND = $Command

      $pythonOutput = @'
import json
import os
import paramiko

host = os.environ["OWMCGP_INLINE_SSH_HOST"]
port = int(os.environ["OWMCGP_INLINE_SSH_PORT"])
user = os.environ["OWMCGP_INLINE_SSH_USER"]
password = os.environ["OWMCGP_INLINE_SSH_PASSWORD"]
command = os.environ["OWMCGP_INLINE_SSH_COMMAND"]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, port=port, username=user, password=password, timeout=20, banner_timeout=20, auth_timeout=20)
    stdin, stdout, stderr = client.exec_command(command, timeout=120)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    print(json.dumps({
        "ok": code == 0,
        "exitCode": code,
        "lines": out.splitlines() + err.splitlines(),
        "error": None if code == 0 else (err or out or f"ssh exit {code}")
    }))
finally:
    client.close()
'@ | & $pythonExecutable -

      $parsed = ConvertFrom-JsonSafe -Raw ($pythonOutput -join "`n")

      if ($null -ne $parsed) {
        return [pscustomobject]@{
          ok = [bool]$parsed.ok
          exitCode = [int]$parsed.exitCode
          lines = @($parsed.lines | ForEach-Object { "$_" })
          error = $parsed.error
        }
      }
    } catch {
      return [pscustomobject]@{
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
      Remove-Item Env:OWMCGP_INLINE_SSH_COMMAND -ErrorAction SilentlyContinue
    }
  }

  $sshExecutable = Resolve-SshExecutable
  $arguments = New-Object System.Collections.Generic.List[string]
  $arguments.Add("-p")
  $arguments.Add("$RemotePort")
  $arguments.Add("-o")
  $arguments.Add("BatchMode=yes")
  $arguments.Add("-o")
  $arguments.Add("ConnectTimeout=10")

  if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) {
    $arguments.Add("-i")
    $arguments.Add($SshKeyPath)
  }

  $arguments.Add("$RemoteUser@$RemoteHost")
  $arguments.Add($Command)

  try {
    $output = & $sshExecutable @arguments 2>&1
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
    error = if ($exitCode -eq 0) { $null } else { (@($output) -join "`n") }
  }
}

function Invoke-GitCommandSafe {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory
  )

  try {
    $output = & git -C $WorkingDirectory @Arguments 2>&1
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
    error = if ($exitCode -eq 0) { $null } else { (@($output) -join "`n") }
  }
}

function Resolve-UbuntuRepoPath {
  if (-not [string]::IsNullOrWhiteSpace($UbuntuRepoPath)) {
    return $UbuntuRepoPath
  }

  $candidates = @(
    "/opt/owmcgp-remote-relay",
    "/opt/owmcgp-remote-relay/services/control-api",
    "/home/$RemoteUser/OpenAi",
    "/home/$RemoteUser/owmcgp-remote-relay"
  )

  foreach ($candidate in $candidates) {
    $result = Invoke-SshCommandSafe -Command "bash -lc 'cd ""$candidate"" 2>/dev/null && pwd && git rev-parse --short HEAD'"

    if ($result.ok -and @($result.lines).Count -ge 2) {
      return [string]$result.lines[0]
    }
  }

  return ""
}

function Get-UbuntuRepoSnapshot {
  param([string]$RepoPath)

  if ([string]::IsNullOrWhiteSpace($RepoPath)) {
    return [pscustomobject]@{
      reachable = $false
      repoPath = ""
      commit = ""
      branch = ""
      nginxConfigOk = $false
      canonicalPublicUpstream = ""
      error = "repo_path_missing"
    }
  }

  $repoResult = Invoke-SshCommandSafe -Command "bash -lc 'cd ""$RepoPath"" && printf \"%s\n\" \"$(pwd)\" \"$(git rev-parse --short HEAD)\" \"$(git branch --show-current)\"'"
  $nginxTest = Invoke-SshCommandSafe -Command "bash -lc 'sudo -n nginx -t 2>&1 || nginx -t 2>&1'"
  $nginxDump = Invoke-SshCommandSafe -Command "bash -lc 'sudo -n nginx -T 2>/dev/null || nginx -T 2>/dev/null'"

  $canonicalPublicUpstream =
    if ($nginxDump.ok) {
      @($nginxDump.lines | Where-Object { $_ -match 'proxy_pass\s+http://127\.0\.0\.1:4010' }) -join "; "
    } else {
      ""
    }

  return [pscustomobject]@{
    reachable = $repoResult.ok
    repoPath = if ($repoResult.ok -and @($repoResult.lines).Count -ge 1) { [string]$repoResult.lines[0] } else { $RepoPath }
    commit = if ($repoResult.ok -and @($repoResult.lines).Count -ge 2) { [string]$repoResult.lines[1] } else { "" }
    branch = if ($repoResult.ok -and @($repoResult.lines).Count -ge 3) { [string]$repoResult.lines[2] } else { "" }
    nginxConfigOk = $nginxTest.ok
    canonicalPublicUpstream = $canonicalPublicUpstream
    nginxTestLines = @($nginxTest.lines)
    nginxDumpLines = @($nginxDump.lines)
    error = if ($repoResult.ok) { $null } else { $repoResult.error }
  }
}

$repoRoot = Resolve-RepoRoot
$scriptCompatibilityVersion = "phase35-server-isolated-chat-transfer-v1"
$prepareScriptPath = Join-Path $repoRoot "infra\windows-block\prepare-isolated-account-browser-roots.ps1"
$proofScriptPath = Join-Path $repoRoot "infra\windows-block\prove-external-chat-on-isolated-account-browser-roots.ps1"
$phaseDir = Join-Path $repoRoot ".planning\phases\35-server-transfer-and-revalidation-of-isolated-per-account-external-chat-proof"

if ([string]::IsNullOrWhiteSpace($WindowsRepoPath)) {
  $WindowsRepoPath = $repoRoot
}

if ([string]::IsNullOrWhiteSpace($BrowserRootBasePath)) {
  $BrowserRootBasePath = Join-Path $WindowsRepoPath "infra\data\account-browsers"
}

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\data\post-phase34-server-isolated-chat-transfer\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "35-SERVER-ISOLATED-CHAT-TRANSFER-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "35-SERVER-ISOLATED-CHAT-TRANSFER-SUMMARY.md"
}

Ensure-ParentDirectory -Path $LatestJsonPath
Ensure-ParentDirectory -Path $OutputJsonPath
Ensure-ParentDirectory -Path $OutputMarkdownPath

$windowsCommitResult = Invoke-GitCommandSafe -Arguments @("rev-parse", "--short", "HEAD") -WorkingDirectory $WindowsRepoPath
$windowsBranchResult = Invoke-GitCommandSafe -Arguments @("branch", "--show-current") -WorkingDirectory $WindowsRepoPath
$resolvedUbuntuRepoPath = Resolve-UbuntuRepoPath
$ubuntuSnapshot = Get-UbuntuRepoSnapshot -RepoPath $resolvedUbuntuRepoPath

$transferTempJsonPath = Join-Path $phaseDir "35-transfer-helper.tmp.json"
$transferTempMdPath = Join-Path $phaseDir "35-transfer-helper.tmp.md"
$proofTempJsonPath = Join-Path $phaseDir "35-proof-helper.tmp.json"
$proofTempMdPath = Join-Path $phaseDir "35-proof-helper.tmp.md"

$prepareArguments = @(
  "-WorkerIds"
) + @($WorkerIds) + @(
  "-BrowserRootBasePath", $BrowserRootBasePath,
  "-LatestJsonPath", $transferTempJsonPath,
  "-OutputJsonPath", $transferTempJsonPath,
  "-OutputMarkdownPath", $transferTempMdPath,
  "-SourceBrowserExecutablePath", $SourceBrowserExecutablePath,
  "-SourceBrowserDataBasePath", $SourceBrowserDataBasePath,
  "-SourceBrowserDataManifestPath", $SourceBrowserDataManifestPath
)

if ($CopySourceBrowserData) {
  $prepareArguments += "-CopySourceBrowserData"
}

$transferHelperRaw = & $prepareScriptPath @prepareArguments
$transferHelper = ConvertFrom-JsonSafe -Raw ($transferHelperRaw -join "`n")

$proofArguments = @(
  "-CandidateWorkerIds"
) + @($WorkerIds) + @(
  "-IsolationArtifactPath", $transferTempJsonPath,
  "-PublicBaseUrl", $PublicBaseUrl,
  "-ApiToken", $ApiToken,
  "-ApiTokenEnvVar", $ApiTokenEnvVar,
  "-RemoteHost", $RemoteHost,
  "-RemotePort", "$RemotePort",
  "-RemoteUser", $RemoteUser,
  "-LatestJsonPath", $proofTempJsonPath,
  "-OutputJsonPath", $proofTempJsonPath,
  "-OutputMarkdownPath", $proofTempMdPath
)

if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) {
  $proofArguments += @("-SshKeyPath", $SshKeyPath)
}

if (-not [string]::IsNullOrWhiteSpace($SshPassword)) {
  $proofArguments += @("-SshPassword", $SshPassword)
}

$proofRaw = & $proofScriptPath @proofArguments
$proofResult = ConvertFrom-JsonSafe -Raw ($proofRaw -join "`n")

$result = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  githubBranch = $GitHubBranch
  windowsRepoPath = $WindowsRepoPath
  windowsCommit = if ($windowsCommitResult.ok) { (@($windowsCommitResult.lines)[0]).Trim() } else { "" }
  windowsBranch = if ($windowsBranchResult.ok) { (@($windowsBranchResult.lines)[0]).Trim() } else { "" }
  ubuntuSshReachable = [bool]$ubuntuSnapshot.reachable
  ubuntuRepoPath = $ubuntuSnapshot.repoPath
  ubuntuCommit = $ubuntuSnapshot.commit
  ubuntuBranch = $ubuntuSnapshot.branch
  ubuntuNginxConfigOk = [bool]$ubuntuSnapshot.nginxConfigOk
  canonicalPublicUpstream = if ($ubuntuSnapshot.canonicalPublicUpstream) { "Ubuntu nginx -> 127.0.0.1:4010" } else { "" }
  sourceBrowserDataBasePath = $SourceBrowserDataBasePath
  sourceBrowserDataManifestPath = $SourceBrowserDataManifestPath
  copySourceBrowserData = $CopySourceBrowserData.IsPresent
  serverAccountInventory = Get-ObjectPropertyValue -InputObject $transferHelper -PropertyName "serverAccountInventory" -DefaultValue @()
  transferResults = Get-ObjectPropertyValue -InputObject $transferHelper -PropertyName "workers" -DefaultValue @()
  accountOrder = Get-ObjectPropertyValue -InputObject $proofResult -PropertyName "accountOrder" -DefaultValue @($WorkerIds)
  preflightAccounts = Get-ObjectPropertyValue -InputObject $proofResult -PropertyName "preflightAccounts" -DefaultValue @()
  attempts = Get-ObjectPropertyValue -InputObject $proofResult -PropertyName "attempts" -DefaultValue @()
  successfulWorkerId = Get-ObjectPropertyValue -InputObject $proofResult -PropertyName "successfulWorkerId"
  tokenSource = Get-ObjectPropertyValue -InputObject $proofResult -PropertyName "tokenSource"
  commonBlocker = Get-ObjectPropertyValue -InputObject $proofResult -PropertyName "commonBlocker"
  exhaustionReason = Get-ObjectPropertyValue -InputObject $proofResult -PropertyName "exhaustionReason"
  transferHelperVerdict = Get-ObjectPropertyValue -InputObject $transferHelper -PropertyName "verdict"
  proofVerdict = Get-ObjectPropertyValue -InputObject $proofResult -PropertyName "verdict"
  reverseTunnelLifecycle = Get-ObjectPropertyValue -InputObject $proofResult -PropertyName "reverseTunnelLifecycle"
  verdict =
    if ((Get-ObjectPropertyValue -InputObject $proofResult -PropertyName "verdict" -DefaultValue "") -eq "externally_ready") {
      "externally_ready"
    } else {
      "hold_rollout"
    }
  summary =
    if ((Get-ObjectPropertyValue -InputObject $proofResult -PropertyName "verdict" -DefaultValue "") -eq "externally_ready") {
      "Server isolated external chat proof passed."
    } else {
      "Hold rollout: server transfer or outside-chat revalidation still has a blocker."
    }
}

$jsonOutput = $result | ConvertTo-Json -Depth 12
$jsonOutput | Set-Content -LiteralPath $LatestJsonPath -Encoding UTF8
$jsonOutput | Set-Content -LiteralPath $OutputJsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Phase 35 Server Isolated Chat Transfer Summary")
$markdown.Add("")
$markdown.Add("- Generated: $($result.generatedAt)")
$markdown.Add("- Script compatibility version: $($result.scriptCompatibilityVersion)")
$markdown.Add("- Verdict: $($result.verdict)")
$markdown.Add("- Summary: $($result.summary)")
$markdown.Add("- GitHub branch: $($result.githubBranch)")
$markdown.Add("- Windows repo path: $($result.windowsRepoPath)")
$markdown.Add("- Windows commit: $(if ($result.windowsCommit) { $result.windowsCommit } else { 'unknown' })")
$markdown.Add("- Ubuntu SSH reachable: $($result.ubuntuSshReachable)")
$markdown.Add("- Ubuntu repo path: $(if ($result.ubuntuRepoPath) { $result.ubuntuRepoPath } else { 'unknown' })")
$markdown.Add("- Ubuntu commit: $(if ($result.ubuntuCommit) { $result.ubuntuCommit } else { 'unknown' })")
$markdown.Add("- canonicalPublicUpstream: $(if ($result.canonicalPublicUpstream) { $result.canonicalPublicUpstream } else { 'unconfirmed' })")
$markdown.Add("- successfulWorkerId: $(if ($result.successfulWorkerId) { $result.successfulWorkerId } else { 'none' })")
$markdown.Add("- tokenSource: $(if ($result.tokenSource) { $result.tokenSource } else { 'none' })")
$markdown.Add("- commonBlocker: $(if ($result.commonBlocker) { $result.commonBlocker } else { 'none' })")
$markdown.Add("- exhaustionReason: $(if ($result.exhaustionReason) { $result.exhaustionReason } else { 'none' })")
$markdown.Add("")
$markdown.Add("## Server Account Inventory")
$markdown.Add("")

foreach ($account in @($result.serverAccountInventory)) {
  $markdown.Add("- $($account.workerId): sourceBrowserDataPath=$(if ($account.sourceBrowserDataPath) { $account.sourceBrowserDataPath } else { 'none' }), sourceBrowserDataExists=$($account.sourceBrowserDataExists), copyResult=$($account.copyResult), crossAccountReuseDetected=$($account.crossAccountReuseDetected)")
}

$markdown.Add("")
$markdown.Add("## Attempts")
$markdown.Add("")

foreach ($attempt in @($result.attempts)) {
  $chat = Get-ObjectPropertyValue -InputObject $attempt.externalSmoke -PropertyName "chat"
  $markdown.Add("- $($attempt.workerId): verdict=$($attempt.attemptVerdict), chatStatus=$(Get-ObjectPropertyValue -InputObject $chat -PropertyName 'statusCode' -DefaultValue 'none'), chatErrorCode=$(Get-ObjectPropertyValue -InputObject $chat -PropertyName 'errorCode' -DefaultValue 'none'), assistantReply=$(if ((Get-ObjectPropertyValue -InputObject $chat -PropertyName 'assistantReplyText' -DefaultValue '')) { Get-ObjectPropertyValue -InputObject $chat -PropertyName 'assistantReplyText' } else { 'none' })")
}

$markdown.Add("")
$markdown | Set-Content -LiteralPath $OutputMarkdownPath -Encoding UTF8

$jsonOutput
