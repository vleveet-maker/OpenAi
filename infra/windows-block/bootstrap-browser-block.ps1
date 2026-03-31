param(
  [string]$RepoRoot = "",
  [switch]$SkipNpmInstall,
  [switch]$SkipSingBoxInstall
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  param([string]$Candidate)

  if ($Candidate -and (Test-Path $Candidate)) {
    return (Resolve-Path $Candidate).Path
  }

  return (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
}

function Resolve-NpmExecutable {
  $command = Get-Command "npm.cmd" -ErrorAction SilentlyContinue

  if ($command) {
    return $command.Source
  }

  $knownPaths = @(
    "C:\\Program Files\\nodejs\\npm.cmd",
    "C:\\Program Files (x86)\\nodejs\\npm.cmd",
    (Join-Path $env:LOCALAPPDATA "Microsoft\\WinGet\\Links\\npm.cmd")
  ) | Where-Object { $_ -and $_.Trim().Length -gt 0 }

  foreach ($path in $knownPaths) {
    if (Test-Path $path) {
      return (Resolve-Path $path).Path
    }
  }

  throw "npm.cmd was not found on this host."
}

function Ensure-Directory {
  param([string]$Path)
  $null = New-Item -ItemType Directory -Force -Path $Path
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot
$npmExe = Resolve-NpmExecutable

$workerIds = @("dad", "wife", "shared-1", "shared-2", "shared-3", "shared-4", "shared-5")

Ensure-Directory (Join-Path $resolvedRepoRoot "infra\\data\\control-api")
Ensure-Directory (Join-Path $resolvedRepoRoot "infra\\data\\host-worker-logs")
Ensure-Directory (Join-Path $resolvedRepoRoot "infra\\data\\host-worker-state")
Ensure-Directory (Join-Path $resolvedRepoRoot "infra\\data\\proxy\\sing-box")

foreach ($workerId in $workerIds) {
  Ensure-Directory (Join-Path $resolvedRepoRoot "infra\\data\\host-profiles\\$workerId")
}

if (-not $SkipNpmInstall) {
  Push-Location $resolvedRepoRoot
  try {
    & $npmExe "ci" "--prefix" "services/control-api" "--no-audit" "--no-fund"
    & $npmExe "ci" "--prefix" "services/host-controller" "--no-audit" "--no-fund"
    & $npmExe "ci" "--prefix" "workers/agent" "--no-audit" "--no-fund"
  } finally {
    Pop-Location
  }
}

$singBoxBinaryPath = Join-Path $resolvedRepoRoot "infra\\tools\\sing-box\\current\\sing-box.exe"
$installSingBoxScriptPath = Join-Path $resolvedRepoRoot "infra\\proxy\\install-sing-box.ps1"

if (-not $SkipSingBoxInstall -and -not (Test-Path $singBoxBinaryPath)) {
  if (-not (Test-Path $installSingBoxScriptPath)) {
    throw "Missing sing-box installer: $installSingBoxScriptPath"
  }

  & "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" `
    -ExecutionPolicy Bypass `
    -File $installSingBoxScriptPath `
    -RepoRoot $resolvedRepoRoot | Out-Null
}

Write-Host "[windows-block] bootstrap complete"
Write-Host "[windows-block] next: start-browser-block.ps1, then start-public-api.ps1"
