$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path

Push-Location $repoRoot
try {
  if (-not (Test-Path (Join-Path $repoRoot "workers\\agent\\node_modules"))) {
    cmd /c npm.cmd ci --prefix workers/agent --no-audit --no-fund
  }
} finally {
  Pop-Location
}

$scripts = @(
  "start-dad-host-worker.ps1",
  "start-wife-host-worker.ps1",
  "start-shared-1-host-worker.ps1"
)

$ProxyServer = "http://127.0.0.1:7897"
$BrowserWindowMode = "Minimized"

foreach ($scriptName in $scripts) {
  Start-Process powershell -ArgumentList @(
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    (Join-Path $PSScriptRoot $scriptName),
    "-SkipInstall",
    "-ProxyServer",
    $ProxyServer,
    "-BrowserWindowMode",
    $BrowserWindowMode
  ) | Out-Null

  Start-Sleep -Seconds 2
}
