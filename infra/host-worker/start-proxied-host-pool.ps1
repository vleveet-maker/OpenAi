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
$proxyServer = "http://127.0.0.1:7897"

& (Join-Path $resolvedRepoRoot "infra\\proxy\\start-sing-box.ps1") -RepoRoot $resolvedRepoRoot

$scripts = @(
  "start-dad-host-worker.ps1",
  "start-wife-host-worker.ps1",
  "start-shared-1-host-worker.ps1"
)

foreach ($scriptName in $scripts) {
  $scriptPath = Join-Path $PSScriptRoot $scriptName
  $args = @(
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $scriptPath,
    "-DetachAgent",
    "-ProxyServer",
    $proxyServer,
    "-BrowserWindowMode",
    "Minimized"
  )

  if ($SkipInstall) {
    $args += "-SkipInstall"
  }

  Start-Process -FilePath "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -ArgumentList $args -WindowStyle Hidden | Out-Null
  Start-Sleep -Seconds 2
}
