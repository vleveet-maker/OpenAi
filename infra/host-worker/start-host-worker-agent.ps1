param(
  [string]$WorkerId = "dad",
  [string]$DisplayName = "Dad",
  [int]$AgentPort = 4021,
  [string]$BrowserExecutablePath = "",
  [string]$ProfilePath = "",
  [string]$StartUrl = "https://chatgpt.com/",
  [string]$CdpEndpointUrl = "",
  [string]$RuntimeDesktopName = "",
  [ValidateSet("VisibleAuth", "HiddenRuntime", "AlternateDesktop")]
  [string]$RuntimeMode = "AlternateDesktop",
  [string]$ProxyServer = "",
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

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot
$resolvedNpmExecutable = Resolve-NpmExecutable
$workerAgentDirectory = Join-Path $resolvedRepoRoot "workers\\agent"
$workerAgentTsxPath = Join-Path $resolvedRepoRoot "workers\\agent\\node_modules\\tsx\\package.json"
$workerAgentExpressPath = Join-Path $resolvedRepoRoot "workers\\agent\\node_modules\\express\\package.json"

$env:WORKER_ID = $WorkerId
$env:WORKER_DISPLAY_NAME = $DisplayName
$env:WORKER_CONTAINER_NAME = "host-$WorkerId"
$env:WORKER_AGENT_HOST = "127.0.0.1"
$env:WORKER_AGENT_PORT = "$AgentPort"
$env:WORKER_PROFILE_PATH = $ProfilePath
$env:WORKER_BROWSER_EXECUTABLE_PATH = $BrowserExecutablePath
$env:WORKER_RUNTIME_MODE =
  if ($RuntimeMode -eq "VisibleAuth") {
    "visible_auth"
  } elseif ($RuntimeMode -eq "AlternateDesktop") {
    "alternate_desktop"
  } else {
    "hidden_runtime"
  }
$env:WORKER_RUNTIME_CLASS =
  if ($RuntimeMode -eq "VisibleAuth") {
    "host_visible_auth"
  } elseif ($RuntimeMode -eq "AlternateDesktop") {
    "host_alternate_desktop"
  } else {
    "host_hidden_runtime"
  }
$env:WORKER_HEADLESS =
  if ($RuntimeMode -eq "HiddenRuntime") {
    "true"
  } else {
    "false"
  }
$env:WORKER_PROXY_SERVER = $ProxyServer
$env:WORKER_CDP_ENDPOINT_URL = $CdpEndpointUrl
$env:WORKER_RUNTIME_DESKTOP_NAME = $RuntimeDesktopName
$env:WORKER_START_URL = $StartUrl
$env:BROWSER_ACCESS_HTTP_PORT = "0"

Push-Location $resolvedRepoRoot
try {
  if (-not $SkipInstall -or -not (Test-Path $workerAgentTsxPath) -or -not (Test-Path $workerAgentExpressPath)) {
    & $resolvedNpmExecutable "ci" "--prefix" "workers/agent" "--no-audit" "--no-fund"
  }

  Push-Location $workerAgentDirectory
  try {
    & $resolvedNpmExecutable "exec" "tsx" "src/server.ts"
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}
