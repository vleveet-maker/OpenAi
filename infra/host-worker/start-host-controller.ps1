param(
  [string]$RepoRoot = "",
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
$serviceDirectory = Join-Path $resolvedRepoRoot "services\\host-controller"
$logsDirectory = Join-Path $resolvedRepoRoot "infra\\data\\host-worker-logs"
$null = New-Item -ItemType Directory -Force -Path $logsDirectory

Push-Location $serviceDirectory
try {
  if (-not $SkipInstall -or -not (Test-Path (Join-Path $serviceDirectory "package-lock.json")) -or -not (Test-Path (Join-Path $serviceDirectory "node_modules"))) {
    cmd /c npm.cmd install --no-audit --no-fund
  }

  cmd /c npm.cmd run start
} finally {
  Pop-Location
}
