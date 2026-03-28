param(
  [string]$WorkerId = "dad",
  [string]$DisplayName = "Dad",
  [int]$AgentPort = 4021,
  [int]$CdpPort = 9222,
  [string]$BrowserExecutablePath = "",
  [string]$ProfilePath = "",
  [string]$StartUrl = "https://chatgpt.com/",
  [string]$ProxyServer = "",
  [ValidateSet("Normal", "Minimized")]
  [string]$BrowserWindowMode = "Minimized",
  [string]$RepoRoot = "",
  [switch]$DetachAgent,
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

function Resolve-BrowserExecutable {
  param([string]$Candidate)

  $knownPaths = @(
    $Candidate,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ) | Where-Object { $_ -and $_.Trim().Length -gt 0 }

  foreach ($path in $knownPaths) {
    if (Test-Path $path) {
      return (Resolve-Path $path).Path
    }
  }

  throw "No supported Chrome or Edge executable was found on this host."
}

function Test-CdpEndpoint {
  param([int]$Port)

  try {
    Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/json/version" -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot
$resolvedBrowserExecutable = Resolve-BrowserExecutable -Candidate $BrowserExecutablePath
$resolvedProfilePath =
  if ($ProfilePath -and $ProfilePath.Trim().Length -gt 0) {
    $ProfilePath
  } else {
    Join-Path $resolvedRepoRoot "infra\\data\\host-profiles\\$WorkerId"
  }

$logsDirectory = Join-Path $resolvedRepoRoot "infra\\data\\host-worker-logs"
$agentScriptPath = Join-Path $PSScriptRoot "start-host-worker-agent.ps1"
$null = New-Item -ItemType Directory -Force -Path $resolvedProfilePath
$null = New-Item -ItemType Directory -Force -Path $logsDirectory

if (-not (Test-CdpEndpoint -Port $CdpPort)) {
  $browserArgs = @(
    "--remote-debugging-port=$CdpPort",
    "--user-data-dir=$resolvedProfilePath",
    "--new-window",
    $StartUrl
  )

  if ($ProxyServer -and $ProxyServer.Trim().Length -gt 0) {
    $browserArgs = @(
      "--proxy-server=$ProxyServer"
    ) + $browserArgs
  }

  $startProcessArguments = @{
    FilePath = $resolvedBrowserExecutable
    ArgumentList = $browserArgs
  }

  if ($BrowserWindowMode -eq "Minimized") {
    $startProcessArguments["WindowStyle"] = "Minimized"
  }

  Start-Process @startProcessArguments | Out-Null
  Start-Sleep -Seconds 3
}

$env:WORKER_ID = $WorkerId
$env:WORKER_DISPLAY_NAME = $DisplayName
$env:WORKER_CONTAINER_NAME = "host-$WorkerId"
$env:WORKER_AGENT_HOST = "127.0.0.1"
$env:WORKER_AGENT_PORT = "$AgentPort"
$env:WORKER_PROFILE_PATH = $resolvedProfilePath
$env:WORKER_BROWSER_EXECUTABLE_PATH = $resolvedBrowserExecutable
$env:WORKER_CDP_ENDPOINT_URL = "http://127.0.0.1:$CdpPort"
$env:WORKER_START_URL = $StartUrl
$env:BROWSER_ACCESS_HTTP_PORT = "0"

if ($DetachAgent) {
  $agentArguments = @(
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $agentScriptPath,
    "-WorkerId",
    $WorkerId,
    "-DisplayName",
    $DisplayName,
    "-AgentPort",
    "$AgentPort",
    "-BrowserExecutablePath",
    $resolvedBrowserExecutable,
    "-ProfilePath",
    $resolvedProfilePath,
    "-StartUrl",
    $StartUrl,
    "-CdpEndpointUrl",
    "http://127.0.0.1:$CdpPort",
    "-RepoRoot",
    $resolvedRepoRoot
  )

  if ($SkipInstall) {
    $agentArguments += "-SkipInstall"
  }

  Start-Process -FilePath "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -ArgumentList $agentArguments -WindowStyle Hidden | Out-Null
  return
}

& $agentScriptPath `
  -WorkerId $WorkerId `
  -DisplayName $DisplayName `
  -AgentPort $AgentPort `
  -BrowserExecutablePath $resolvedBrowserExecutable `
  -ProfilePath $resolvedProfilePath `
  -StartUrl $StartUrl `
  -CdpEndpointUrl "http://127.0.0.1:$CdpPort" `
  -RepoRoot $resolvedRepoRoot `
  -SkipInstall:$SkipInstall
