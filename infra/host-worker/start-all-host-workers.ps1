param(
  [switch]$SkipInstall,
  [string]$ProxyServer = "http://127.0.0.1:7897",
  [ValidateSet("VisibleAuth", "HiddenRuntime", "AlternateDesktop")]
  [string]$RuntimeMode = "VisibleAuth",
  [ValidateSet("CurrentExecutable", "ChannelMsedge")]
  [string]$HiddenLaunchVariant = "CurrentExecutable",
  [ValidateSet("Normal", "Minimized", "CompactCorner")]
  [string]$BrowserWindowMode = "CompactCorner",
  [ValidateSet("Durable", "DiagnosticFresh")]
  [string]$ProfileStrategy = "Durable",
  [switch]$LaunchBrowserOnly
)

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
  "start-shared-1-host-worker.ps1",
  "start-shared-2-host-worker.ps1",
  "start-shared-3-host-worker.ps1",
  "start-shared-4-host-worker.ps1",
  "start-shared-5-host-worker.ps1",
  "start-shared-6-host-worker.ps1",
  "start-shared-7-host-worker.ps1"
)

foreach ($scriptName in $scripts) {
  $argumentList = @(
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    (Join-Path $PSScriptRoot $scriptName),
    "-ProxyServer",
    $ProxyServer,
    "-RuntimeMode",
    $RuntimeMode,
    "-HiddenLaunchVariant",
    $HiddenLaunchVariant,
    "-ProfileStrategy",
    $ProfileStrategy,
    "-BrowserWindowMode",
    $BrowserWindowMode
  )

  if ($SkipInstall) {
    $argumentList += "-SkipInstall"
  }

  if ($LaunchBrowserOnly) {
    $argumentList += "-LaunchBrowserOnly"
  }

  Start-Process powershell -ArgumentList $argumentList | Out-Null

  Start-Sleep -Seconds 2
}
