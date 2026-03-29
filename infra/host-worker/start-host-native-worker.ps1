param(
  [string]$WorkerId = "dad",
  [string]$DisplayName = "Dad",
  [int]$AgentPort = 4021,
  [int]$CdpPort = 9222,
  [string]$BrowserExecutablePath = "",
  [string]$ProfilePath = "",
  [string]$StartUrl = "https://chatgpt.com/",
  [string]$ProxyServer = "",
  [ValidateSet("VisibleAuth", "HiddenRuntime", "AlternateDesktop")]
  [string]$RuntimeMode = "AlternateDesktop",
  [ValidateSet("CurrentExecutable", "ChannelMsedge")]
  [string]$HiddenLaunchVariant = "CurrentExecutable",
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

function Get-WorkerStateDirectory {
  param([string]$RepoRootPath)

  return Join-Path $RepoRootPath "infra\\data\\host-worker-state"
}

function Get-WorkerStatePath {
  param(
    [string]$RepoRootPath,
    [string]$CurrentWorkerId
  )

  return Join-Path (Get-WorkerStateDirectory -RepoRootPath $RepoRootPath) "$CurrentWorkerId.json"
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
$alternateDesktopLauncherPath = Join-Path $PSScriptRoot "start-alternate-desktop-browser.ps1"
$workerStateDirectory = Get-WorkerStateDirectory -RepoRootPath $resolvedRepoRoot
$workerStatePath = Get-WorkerStatePath -RepoRootPath $resolvedRepoRoot -CurrentWorkerId $WorkerId
$null = New-Item -ItemType Directory -Force -Path $resolvedProfilePath
$null = New-Item -ItemType Directory -Force -Path $logsDirectory
$null = New-Item -ItemType Directory -Force -Path $workerStateDirectory

if ($RuntimeMode -eq "VisibleAuth" -and -not (Test-CdpEndpoint -Port $CdpPort)) {
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

$runtimeDesktopName = ""
$cdpEndpointUrl = ""

if ($RuntimeMode -eq "AlternateDesktop") {
  $launchResult = & $alternateDesktopLauncherPath `
    -WorkerId $WorkerId `
    -CdpPort $CdpPort `
    -BrowserExecutablePath $resolvedBrowserExecutable `
    -ProfilePath $resolvedProfilePath `
    -StartUrl $StartUrl `
    -ProxyServer $ProxyServer `
    -RepoRoot $resolvedRepoRoot

  if ($launchResult -is [System.Array]) {
    $launchResult = $launchResult[-1]
  }

  if ($launchResult) {
    $runtimeDesktopName = $launchResult.desktopName
  }

  $cdpEndpointUrl = "http://127.0.0.1:$CdpPort"
} elseif ($RuntimeMode -eq "VisibleAuth") {
  $cdpEndpointUrl = "http://127.0.0.1:$CdpPort"
} else {
  if (Test-Path $workerStatePath) {
    Remove-Item -LiteralPath $workerStatePath -Force -ErrorAction SilentlyContinue
  }
}

$env:WORKER_ID = $WorkerId
$env:WORKER_DISPLAY_NAME = $DisplayName
$env:WORKER_CONTAINER_NAME = "host-$WorkerId"
$env:WORKER_AGENT_HOST = "127.0.0.1"
$env:WORKER_AGENT_PORT = "$AgentPort"
$env:WORKER_PROFILE_PATH = $resolvedProfilePath
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
$env:WORKER_RUNTIME_DESKTOP_NAME = $runtimeDesktopName
$env:WORKER_PROXY_SERVER = $ProxyServer
$env:WORKER_CDP_ENDPOINT_URL = $cdpEndpointUrl
$env:WORKER_START_URL = $StartUrl
$env:BROWSER_ACCESS_HTTP_PORT = "0"

if ($RuntimeMode -eq "HiddenRuntime" -and $HiddenLaunchVariant -eq "ChannelMsedge") {
  Remove-Item Env:WORKER_BROWSER_EXECUTABLE_PATH -ErrorAction SilentlyContinue
  $env:WORKER_BROWSER_CHANNEL = "msedge"
} else {
  $env:WORKER_BROWSER_EXECUTABLE_PATH = $resolvedBrowserExecutable
  Remove-Item Env:WORKER_BROWSER_CHANNEL -ErrorAction SilentlyContinue
}

if ($DetachAgent) {
  $agentArguments = New-Object System.Collections.Generic.List[string]
  foreach ($item in @(
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
    "-RuntimeMode",
    $RuntimeMode,
    "-RepoRoot",
    $resolvedRepoRoot
  )) {
    $agentArguments.Add($item)
  }

  if ($ProxyServer -and $ProxyServer.Trim().Length -gt 0) {
    $agentArguments.Add("-ProxyServer")
    $agentArguments.Add($ProxyServer)
  }

  if ($env:WORKER_CDP_ENDPOINT_URL -and $env:WORKER_CDP_ENDPOINT_URL.Trim().Length -gt 0) {
    $agentArguments.Add("-CdpEndpointUrl")
    $agentArguments.Add($env:WORKER_CDP_ENDPOINT_URL)
  }

  if ($runtimeDesktopName -and $runtimeDesktopName.Trim().Length -gt 0) {
    $agentArguments.Add("-RuntimeDesktopName")
    $agentArguments.Add($runtimeDesktopName)
  }

  if ($SkipInstall) {
    $agentArguments.Add("-SkipInstall")
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
  -RuntimeMode $RuntimeMode `
  -ProxyServer $ProxyServer `
  -CdpEndpointUrl $env:WORKER_CDP_ENDPOINT_URL `
  -RuntimeDesktopName $runtimeDesktopName `
  -RepoRoot $resolvedRepoRoot `
  -SkipInstall:$SkipInstall
