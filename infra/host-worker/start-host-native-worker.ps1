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
  [string]$RuntimeMode = "VisibleAuth",
  [ValidateSet("Durable", "DiagnosticFresh")]
  [string]$ProfileStrategy = "Durable",
  [ValidateSet("CurrentExecutable", "ChannelMsedge")]
  [string]$HiddenLaunchVariant = "CurrentExecutable",
  [ValidateSet("Normal", "Minimized", "CompactCorner")]
  [string]$BrowserWindowMode = "CompactCorner",
  [string]$RepoRoot = "",
  [switch]$LaunchBrowserOnly,
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

function Update-JsonTextSetting {
  param(
    [string]$FilePath
  )

  if (-not (Test-Path -LiteralPath $FilePath)) {
    return
  }

  $content = Get-Content -LiteralPath $FilePath -Raw -ErrorAction SilentlyContinue

  if (-not $content) {
    return
  }

  $updated = $content `
    -replace '"exit_type"\s*:\s*"Crashed"', '"exit_type":"Normal"' `
    -replace '"exited_cleanly"\s*:\s*false', '"exited_cleanly":true' `
    -replace '"session_restore_prompt"\s*:\s*\{\s*"ignored"\s*:\s*false\s*\}', '"session_restore_prompt":{"ignored":true}'

  if ($updated -ne $content) {
    Set-Content -LiteralPath $FilePath -Value $updated -Encoding utf8
  }
}

function Clear-SessionRestoreArtifacts {
  param(
    [string]$CurrentProfilePath
  )

  $defaultProfilePath = Join-Path $CurrentProfilePath "Default"

  foreach ($path in @(
    (Join-Path $CurrentProfilePath "Local State"),
    (Join-Path $defaultProfilePath "Preferences")
  )) {
    Update-JsonTextSetting -FilePath $path
  }

  foreach ($filePath in @(
    (Join-Path $defaultProfilePath "Last Session"),
    (Join-Path $defaultProfilePath "Last Tabs"),
    (Join-Path $defaultProfilePath "Current Session"),
    (Join-Path $defaultProfilePath "Current Tabs")
  )) {
    if (Test-Path -LiteralPath $filePath) {
      Remove-Item -LiteralPath $filePath -Force -ErrorAction SilentlyContinue
    }
  }

  $sessionsDirectory = Join-Path $defaultProfilePath "Sessions"

  if (Test-Path -LiteralPath $sessionsDirectory) {
    Get-ChildItem -Force -LiteralPath $sessionsDirectory -ErrorAction SilentlyContinue |
      Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Get-CompactWindowSlotIndex {
  param([string]$CurrentWorkerId)

  switch ($CurrentWorkerId) {
    "dad" { return 0 }
    "wife" { return 1 }
    "shared-1" { return 2 }
    "shared-2" { return 3 }
    "shared-3" { return 4 }
    "shared-4" { return 5 }
    "shared-5" { return 6 }
    "shared-6" { return 7 }
    "shared-7" { return 8 }
    default { return 0 }
  }
}

function Get-CompactWindowPlacement {
  param([string]$CurrentWorkerId)

  $defaultWidth = 430
  $defaultHeight = 320
  $defaultMargin = 16
  $slotIndex = Get-CompactWindowSlotIndex -CurrentWorkerId $CurrentWorkerId

  try {
    Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
    $workArea = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
    $width = [Math]::Min($defaultWidth, [Math]::Max(320, $workArea.Width - ($defaultMargin * 2)))
    $rows = 3
    $columnIndex = [Math]::Floor($slotIndex / $rows)
    $rowIndex = $slotIndex % $rows
    $availableHeight = $workArea.Height - ($defaultMargin * ($rows + 1))
    $height = [Math]::Min($defaultHeight, [Math]::Max(220, [Math]::Floor($availableHeight / $rows)))
    $x = $workArea.Right - $width - $defaultMargin - ($columnIndex * ($width + $defaultMargin))
    $y = $workArea.Top + $defaultMargin + ($rowIndex * ($height + $defaultMargin))

    if (($y + $height) -gt ($workArea.Bottom - $defaultMargin)) {
      $y = [Math]::Max($workArea.Top + $defaultMargin, $workArea.Bottom - $height - $defaultMargin)
    }

    if ($x -lt ($workArea.Left + $defaultMargin)) {
      $x = $workArea.Left + $defaultMargin
    }

    return @{
      Width = $width
      Height = $height
      X = $x
      Y = $y
    }
  } catch {
    return @{
      Width = $defaultWidth
      Height = $defaultHeight
      X = 1440
      Y = 16 + ($slotIndex * ($defaultHeight + $defaultMargin))
    }
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
  } elseif ($ProfileStrategy -eq "DiagnosticFresh") {
    Join-Path $resolvedRepoRoot "infra\\data\\host-profile-diagnostics\\$WorkerId"
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
  Clear-SessionRestoreArtifacts -CurrentProfilePath $resolvedProfilePath

  $browserArgs = @(
    "--hide-crash-restore-bubble",
    "--disable-session-crashed-bubble",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=$CdpPort",
    "--user-data-dir=$resolvedProfilePath",
    "--new-window",
    $StartUrl
  )

  if ($BrowserWindowMode -eq "CompactCorner") {
    $placement = Get-CompactWindowPlacement -CurrentWorkerId $WorkerId
    $browserArgs = @(
      "--window-size=$($placement.Width),$($placement.Height)",
      "--window-position=$($placement.X),$($placement.Y)"
    ) + $browserArgs
  }

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

if ($LaunchBrowserOnly) {
  return [pscustomobject]@{
    workerId = $WorkerId
    runtimeMode = $RuntimeMode
    cdpEndpointUrl = $cdpEndpointUrl
    profilePath = $resolvedProfilePath
    browserWindowMode = $BrowserWindowMode
  }
}

$env:WORKER_ID = $WorkerId
$env:WORKER_DISPLAY_NAME = $DisplayName
$env:WORKER_CONTAINER_NAME = "host-$WorkerId"
$env:WORKER_AGENT_HOST = "127.0.0.1"
$env:WORKER_AGENT_PORT = "$AgentPort"
$env:WORKER_PROFILE_PATH = $resolvedProfilePath
$env:WORKER_PROFILE_STRATEGY =
  if ($ProfileStrategy -eq "DiagnosticFresh") {
    "diagnostic_fresh"
  } else {
    "durable"
  }
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
    if ($BrowserWindowMode -eq "CompactCorner") {
      "host_visible_compact"
    } else {
      "host_visible_auth"
    }
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
$env:WORKER_BROWSER_WINDOW_MODE = $BrowserWindowMode
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
    "-ProfileStrategy",
    $ProfileStrategy,
    "-StartUrl",
    $StartUrl,
    "-RuntimeMode",
    $RuntimeMode,
    "-BrowserWindowMode",
    $BrowserWindowMode,
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
  -BrowserWindowMode $BrowserWindowMode `
  -ProxyServer $ProxyServer `
  -CdpEndpointUrl $env:WORKER_CDP_ENDPOINT_URL `
  -RuntimeDesktopName $runtimeDesktopName `
  -RepoRoot $resolvedRepoRoot `
  -SkipInstall:$SkipInstall
