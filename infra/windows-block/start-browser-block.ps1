param(
  [string]$RepoRoot = "",
  [int]$HostControllerPort = 4040,
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  param([string]$Candidate)

  if ($Candidate -and (Test-Path $Candidate)) {
    return (Resolve-Path $Candidate).Path
  }

  return (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot
$hostWorkerRoot = Join-Path $resolvedRepoRoot "infra\\host-worker"
$startScriptPath = Join-Path $hostWorkerRoot "start-host-controller.ps1"

if (-not (Test-Path $startScriptPath)) {
  throw "Missing host-controller launcher: $startScriptPath"
}

$existing = Get-NetTCPConnection -LocalPort $HostControllerPort -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($existing) {
  Write-Host "[windows-block] host-controller already listening on $HostControllerPort"
  return
}

$arguments = @(
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $startScriptPath,
  "-RepoRoot",
  $resolvedRepoRoot
)

if ($SkipInstall) {
  $arguments += "-SkipInstall"
}

Start-Process `
  -FilePath "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" `
  -ArgumentList $arguments `
  -WindowStyle Hidden | Out-Null

Write-Host "[windows-block] host-controller start requested"
