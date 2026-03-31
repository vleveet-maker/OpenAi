param(
  [string]$RepoRoot = "",
  [string]$ListenHost = "127.0.0.1",
  [int]$ListenPort = 4010,
  [string]$ApiToken = "",
  [string]$SettingsPath = "",
  [string]$DefaultWorkerId = "",
  [string[]]$AllowedWorkerIds = @(),
  [int]$RequestTimeoutMs = 180000,
  [switch]$SkipInstall,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-RepoRoot {
  param([string]$Candidate)

  if ($Candidate -and (Test-Path $Candidate)) {
    return (Resolve-Path $Candidate).Path
  }

  return (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot
$logsDirectory = Join-Path $resolvedRepoRoot "infra\\data\\host-worker-logs"
$null = New-Item -ItemType Directory -Force -Path $logsDirectory

$existing = Get-NetTCPConnection -LocalPort $ListenPort -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($existing) {
  Write-Host "[windows-block] public API already listening on $ListenPort"
  return
}

$runScriptPath = Join-Path $PSScriptRoot "run-public-api.ps1"
$stdoutPath = Join-Path $logsDirectory "public-api.out.log"
$stderrPath = Join-Path $logsDirectory "public-api.err.log"

$arguments = @(
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $runScriptPath,
  "-RepoRoot",
  $resolvedRepoRoot,
  "-ListenHost",
  $ListenHost,
  "-ListenPort",
  "$ListenPort",
  "-RequestTimeoutMs",
  "$RequestTimeoutMs"
)

if ($ApiToken -and $ApiToken.Trim().Length -gt 0) {
  $arguments += @("-ApiToken", $ApiToken)
}

if ($SettingsPath -and $SettingsPath.Trim().Length -gt 0) {
  $arguments += @("-SettingsPath", $SettingsPath)
}

if ($DefaultWorkerId -and $DefaultWorkerId.Trim().Length -gt 0) {
  $arguments += @("-DefaultWorkerId", $DefaultWorkerId)
}

if ($AllowedWorkerIds -and $AllowedWorkerIds.Count -gt 0) {
  $arguments += @("-AllowedWorkerIds", ($AllowedWorkerIds -join ","))
}

if ($SkipInstall) {
  $arguments += "-SkipInstall"
}

if ($SkipBuild) {
  $arguments += "-SkipBuild"
}

Start-Process `
  -FilePath "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" `
  -ArgumentList $arguments `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutPath `
  -RedirectStandardError $stderrPath | Out-Null

Write-Host "[windows-block] public API start requested on $ListenHost`:$ListenPort"
