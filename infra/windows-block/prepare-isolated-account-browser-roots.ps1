param(
  [string[]]$WorkerIds = @("dad", "wife", "shared-1", "shared-2", "shared-3", "shared-4", "shared-5"),
  [Alias("BrowserExecutablePath")]
  [string]$SourceBrowserExecutablePath = "",
  [string]$SourceBrowserDataBasePath = "",
  [string]$SourceBrowserDataManifestPath = "",
  [string]$StartUrl = "https://chatgpt.com/",
  [string]$BrowserRootBasePath = "",
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = "",
  [int]$RemoteDebuggingPortBase = 9431,
  [int]$DelayBetweenLaunchesMilliseconds = 700,
  [int]$LaunchCheckSeconds = 5,
  [switch]$ReuseExistingWindows,
  [switch]$ForceRefreshBrowserRoots,
  [switch]$CopySourceBrowserData,
  [switch]$SkipLaunch
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function ConvertFrom-JsonSafe {
  param([string]$Raw)

  if ([string]::IsNullOrWhiteSpace($Raw)) {
    return $null
  }

  try {
    return $Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Ensure-Directory {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return
  }

  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Ensure-ParentDirectory {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return
  }

  $parent = Split-Path -Parent $Path

  if (-not [string]::IsNullOrWhiteSpace($parent)) {
    Ensure-Directory -Path $parent
  }
}

function Resolve-SourceBrowserExecutable {
  param([string]$Candidate)

  $knownPaths = @(
    $Candidate,
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

  foreach ($path in $knownPaths) {
    if (Test-Path -LiteralPath $path) {
      return (Resolve-Path -LiteralPath $path).Path
    }
  }

  throw "No supported Chrome or Edge executable was found on this host."
}

function Sync-BrowserRoot {
  param(
    [string]$SourceInstallPath,
    [string]$TargetBrowserRootPath
  )

  Ensure-Directory -Path $TargetBrowserRootPath

  & robocopy.exe $SourceInstallPath $TargetBrowserRootPath /E /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
  $exitCode = $LASTEXITCODE

  if ($exitCode -gt 7) {
    throw "robocopy failed with exit code $exitCode while syncing '$SourceInstallPath' to '$TargetBrowserRootPath'."
  }
}

function Test-IsolatedProcessExists {
  param(
    [string]$BrowserExecutablePath,
    [string]$BrowserDataPath
  )

  $escapedExecutable = [Regex]::Escape($BrowserExecutablePath)
  $escapedDataPath = [Regex]::Escape($BrowserDataPath)

  return @(
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object {
        ($_.Name -eq "chrome.exe" -or $_.Name -eq "msedge.exe") -and
        $_.CommandLine -match $escapedExecutable -and
        $_.CommandLine -match $escapedDataPath
      }
  ).Count -gt 0
}

function Wait-ForIsolatedProcess {
  param(
    [string]$BrowserExecutablePath,
    [string]$BrowserDataPath,
    [int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds([Math]::Max($TimeoutSeconds, 1))

  while ((Get-Date) -lt $deadline) {
    if (Test-IsolatedProcessExists -BrowserExecutablePath $BrowserExecutablePath -BrowserDataPath $BrowserDataPath) {
      return $true
    }

    Start-Sleep -Milliseconds 250
  }

  return $false
}

function Get-PropertyValue {
  param(
    [object]$InputObject,
    [string]$PropertyName,
    [object]$DefaultValue = $null
  )

  if ($null -eq $InputObject) {
    return $DefaultValue
  }

  $property = $InputObject.PSObject.Properties[$PropertyName]

  if ($null -eq $property) {
    return $DefaultValue
  }

  return $property.Value
}

function Resolve-SourceBrowserDataMap {
  param([string]$ManifestPath)

  $resolvedMap = @{}

  if ([string]::IsNullOrWhiteSpace($ManifestPath) -or -not (Test-Path -LiteralPath $ManifestPath)) {
    return $resolvedMap
  }

  $parsed = ConvertFrom-JsonSafe -Raw (Get-Content -LiteralPath $ManifestPath -Raw)

  if ($null -eq $parsed) {
    return $resolvedMap
  }

  if ($parsed -is [System.Collections.IDictionary]) {
    foreach ($key in $parsed.Keys) {
      $resolvedMap["$key"] = [string]$parsed[$key]
    }

    return $resolvedMap
  }

  foreach ($entry in @($parsed.workers, $parsed.accounts, $parsed.entries)) {
    foreach ($item in @($entry)) {
      $workerId = [string](Get-PropertyValue -InputObject $item -PropertyName "workerId" -DefaultValue "")

      if ([string]::IsNullOrWhiteSpace($workerId)) {
        $workerId = [string](Get-PropertyValue -InputObject $item -PropertyName "id" -DefaultValue "")
      }

      if ([string]::IsNullOrWhiteSpace($workerId)) {
        continue
      }

      $path =
        [string](Get-PropertyValue -InputObject $item -PropertyName "sourceBrowserDataPath" -DefaultValue "")

      if ([string]::IsNullOrWhiteSpace($path)) {
        $path = [string](Get-PropertyValue -InputObject $item -PropertyName "browserDataPath" -DefaultValue "")
      }

      if ([string]::IsNullOrWhiteSpace($path)) {
        $path = [string](Get-PropertyValue -InputObject $item -PropertyName "profilePath" -DefaultValue "")
      }

      if (-not [string]::IsNullOrWhiteSpace($path)) {
        $resolvedMap[$workerId] = $path
      }
    }
  }

  return $resolvedMap
}

function Resolve-SourceBrowserDataPath {
  param(
    [string]$WorkerId,
    [hashtable]$SourceBrowserDataMap,
    [string]$SourceBrowserDataBasePath
  )

  if ($SourceBrowserDataMap.ContainsKey($WorkerId)) {
    return [string]$SourceBrowserDataMap[$WorkerId]
  }

  if (-not [string]::IsNullOrWhiteSpace($SourceBrowserDataBasePath)) {
    return (Join-Path $SourceBrowserDataBasePath $WorkerId)
  }

  return ""
}

function Get-DuplicateValues {
  param([string[]]$Values)

  return @(
    $Values |
      Group-Object |
      Where-Object { $_.Count -gt 1 -and -not [string]::IsNullOrWhiteSpace($_.Name) } |
      Select-Object -ExpandProperty Name
  )
}

$repoRoot = Resolve-RepoRoot
$resolvedSourceBrowserExecutablePath = Resolve-SourceBrowserExecutable -Candidate $SourceBrowserExecutablePath
$sourceInstallPath = Split-Path -Parent $resolvedSourceBrowserExecutablePath
$browserExecutableName = Split-Path -Leaf $resolvedSourceBrowserExecutablePath
$sourceBrowserDataMap = Resolve-SourceBrowserDataMap -ManifestPath $SourceBrowserDataManifestPath
$serverTransferMode =
  -not [string]::IsNullOrWhiteSpace($SourceBrowserDataBasePath) -or
  -not [string]::IsNullOrWhiteSpace($SourceBrowserDataManifestPath) -or
  $CopySourceBrowserData.IsPresent
$scriptCompatibilityVersion =
  if ($serverTransferMode) {
    "phase35-server-isolated-chat-transfer-v1"
  } else {
    "phase33.1-account-browser-isolation-v1"
  }
$normalizedWorkerIds = @(
  $WorkerIds |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    ForEach-Object { $_.Trim() }
)

if ([string]::IsNullOrWhiteSpace($BrowserRootBasePath)) {
  $BrowserRootBasePath = Join-Path $repoRoot "infra\data\account-browsers"
}

$phaseDir = Join-Path $repoRoot ".planning\phases\33.1-dedicated-per-account-desktop-chrome-roots-and-isolated-account-browser-storage-before-external-chat-proof"

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\data\post-phase33-account-browser-isolation\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "33.1-ACCOUNT-BROWSER-ISOLATION-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "33.1-ACCOUNT-BROWSER-ISOLATION-SUMMARY.md"
}

Ensure-Directory -Path $BrowserRootBasePath
Ensure-ParentDirectory -Path $LatestJsonPath
Ensure-ParentDirectory -Path $OutputJsonPath
Ensure-ParentDirectory -Path $OutputMarkdownPath

$workerResults = New-Object System.Collections.Generic.List[object]

for ($index = 0; $index -lt $normalizedWorkerIds.Count; $index += 1) {
  $workerId = $normalizedWorkerIds[$index]
  $workerRootPath = Join-Path $BrowserRootBasePath $workerId
  $browserRootPath = Join-Path $workerRootPath "desktop-chrome"
  $browserDataPath = Join-Path $workerRootPath "browser-data"
  $isolatedBrowserExecutablePath = Join-Path $browserRootPath $browserExecutableName
  $remoteDebuggingPort = $RemoteDebuggingPortBase + $index
  $browserRootRefreshed = $false
  $launchResult = "skipped"
  $launchError = ""
  $windowKeptOpen = $false
  $sourceBrowserDataPath = Resolve-SourceBrowserDataPath -WorkerId $workerId -SourceBrowserDataMap $sourceBrowserDataMap -SourceBrowserDataBasePath $SourceBrowserDataBasePath
  $resolvedSourceBrowserDataPath =
    if (-not [string]::IsNullOrWhiteSpace($sourceBrowserDataPath) -and (Test-Path -LiteralPath $sourceBrowserDataPath)) {
      (Resolve-Path -LiteralPath $sourceBrowserDataPath).Path
    } else {
      $sourceBrowserDataPath
    }
  $sourceBrowserDataExists =
    -not [string]::IsNullOrWhiteSpace($resolvedSourceBrowserDataPath) -and
    (Test-Path -LiteralPath $resolvedSourceBrowserDataPath)
  $sourceBrowserDataCopied = $false
  $copyResult =
    if ($CopySourceBrowserData) {
      if ($sourceBrowserDataExists) { "pending" } else { "source_missing" }
    } else {
      "not_requested"
    }
  $copyError = ""

  Ensure-Directory -Path $workerRootPath
  Ensure-Directory -Path $browserDataPath

  $needsBrowserRefresh =
    $ForceRefreshBrowserRoots.IsPresent -or
    -not (Test-Path -LiteralPath $isolatedBrowserExecutablePath)

  if ($needsBrowserRefresh) {
    Sync-BrowserRoot -SourceInstallPath $sourceInstallPath -TargetBrowserRootPath $browserRootPath
    $browserRootRefreshed = $true
  }

  if (-not (Test-Path -LiteralPath $isolatedBrowserExecutablePath)) {
    throw "Isolated browser executable was not found after sync: $isolatedBrowserExecutablePath"
  }

  if ($CopySourceBrowserData -and $sourceBrowserDataExists) {
    try {
      & robocopy.exe $resolvedSourceBrowserDataPath $browserDataPath /E /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
      $copyExitCode = $LASTEXITCODE

      if ($copyExitCode -gt 7) {
        throw "robocopy failed with exit code $copyExitCode while copying '$resolvedSourceBrowserDataPath' to '$browserDataPath'."
      }

      $sourceBrowserDataCopied = $true
      $copyResult = "copied"
    } catch {
      $copyResult = "copy_failed"
      $copyError = $_.Exception.Message
    }
  }

  if (-not $SkipLaunch) {
    if ($ReuseExistingWindows -and (Test-IsolatedProcessExists -BrowserExecutablePath $isolatedBrowserExecutablePath -BrowserDataPath $browserDataPath)) {
      $launchResult = "existing_window_reused"
      $windowKeptOpen = $true
    } else {
      $browserArguments = @(
        "--hide-crash-restore-bubble",
        "--disable-session-crashed-bubble",
        "--no-first-run",
        "--no-default-browser-check",
        "--remote-debugging-port=$remoteDebuggingPort",
        "--user-data-dir=$browserDataPath",
        "--new-window",
        $StartUrl
      )

      try {
        Start-Process -FilePath $isolatedBrowserExecutablePath -ArgumentList $browserArguments | Out-Null
        $windowKeptOpen = Wait-ForIsolatedProcess -BrowserExecutablePath $isolatedBrowserExecutablePath -BrowserDataPath $browserDataPath -TimeoutSeconds $LaunchCheckSeconds
        $launchResult = if ($windowKeptOpen) { "started" } else { "launch_timeout" }
      } catch {
        $launchResult = "launch_failed"
        $launchError = $_.Exception.Message
        $windowKeptOpen = $false
      }
    }

    if ($DelayBetweenLaunchesMilliseconds -gt 0 -and $index -lt ($normalizedWorkerIds.Count - 1)) {
      Start-Sleep -Milliseconds $DelayBetweenLaunchesMilliseconds
    }
  }

  $workerResults.Add(
    [pscustomobject]@{
      workerId = $workerId
      browserRootPath = $browserRootPath
      browserExecutablePath = $isolatedBrowserExecutablePath
      browserDataPath = $browserDataPath
      sourceInstallPath = $sourceInstallPath
      sourceBrowserExecutablePath = $resolvedSourceBrowserExecutablePath
      sourceBrowserDataPath = $resolvedSourceBrowserDataPath
      sourceBrowserDataExists = $sourceBrowserDataExists
      sourceBrowserDataCopied = $sourceBrowserDataCopied
      copyResult = $copyResult
      copyError = $copyError
      browserExecutableName = $browserExecutableName
      browserRootPrepared = [bool](Test-Path -LiteralPath $browserRootPath)
      browserDataPrepared = [bool](Test-Path -LiteralPath $browserDataPath)
      browserRootRefreshed = $browserRootRefreshed
      launchResult = $launchResult
      launchError = $launchError
      windowKeptOpen = $windowKeptOpen
      remoteDebuggingPort = $remoteDebuggingPort
      startUrl = $StartUrl
      crossAccountReuseDetected = $false
      reusedExistingWindow = ($launchResult -eq "existing_window_reused")
    }
  )
}

$workerArray = [object[]]$workerResults.ToArray()
$duplicateBrowserRoots = @(
  Get-DuplicateValues -Values @($workerArray | ForEach-Object { $_.browserRootPath })
)
$duplicateBrowserDataPaths = @(
  Get-DuplicateValues -Values @($workerArray | ForEach-Object { $_.browserDataPath })
)

foreach ($worker in $workerArray) {
  $worker.crossAccountReuseDetected =
    $duplicateBrowserRoots -contains $worker.browserRootPath -or
    $duplicateBrowserDataPaths -contains $worker.browserDataPath
}

$successfulIsolationCount = @(
  $workerArray |
    Where-Object { $_.browserRootPrepared -and $_.browserDataPrepared -and -not $_.crossAccountReuseDetected }
).Count
$failedIsolationCount = $workerArray.Count - $successfulIsolationCount
$launchFailures = @(
  $workerArray |
    Where-Object {
      -not $SkipLaunch -and -not $_.windowKeptOpen
    }
)
$manualInspectionReady = $duplicateBrowserRoots.Count -eq 0 -and $duplicateBrowserDataPaths.Count -eq 0 -and (
  $SkipLaunch -or $launchFailures.Count -eq 0
)
$serverAccountInventory = @(
  $workerArray |
    ForEach-Object {
      [pscustomobject]@{
        workerId = $_.workerId
        sourceBrowserDataPath = $_.sourceBrowserDataPath
        sourceBrowserDataExists = $_.sourceBrowserDataExists
        copyResult = $_.copyResult
        browserRootPath = $_.browserRootPath
        browserDataPath = $_.browserDataPath
        crossAccountReuseDetected = $_.crossAccountReuseDetected
      }
    }
)
$verdict = if ($manualInspectionReady) { "isolated_browser_roots_ready" } else { "hold_rollout" }
$summary =
  if ($manualInspectionReady -and $serverTransferMode) {
    "Server transfer helper truth is ready: isolated browser roots are unique, and per-account source/target mapping is explicit."
  } elseif ($manualInspectionReady) {
    "Dedicated browser roots are isolated per account and the windows are ready for manual inspection."
  } else {
    "Hold rollout: at least one account still failed isolated browser preparation or did not keep its window open."
  }

$result = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  accountOrder = $normalizedWorkerIds
  browserRootBasePath = $BrowserRootBasePath
  sourceInstallPath = $sourceInstallPath
  sourceBrowserExecutablePath = $resolvedSourceBrowserExecutablePath
  duplicateBrowserRoots = $duplicateBrowserRoots
  duplicateBrowserDataPaths = $duplicateBrowserDataPaths
  successfulIsolationCount = $successfulIsolationCount
  failedIsolationCount = $failedIsolationCount
  manualInspectionReady = $manualInspectionReady
  launchRequested = -not $SkipLaunch.IsPresent
  serverTransferMode = $serverTransferMode
  copySourceBrowserData = $CopySourceBrowserData.IsPresent
  sourceBrowserDataBasePath = $SourceBrowserDataBasePath
  sourceBrowserDataManifestPath = $SourceBrowserDataManifestPath
  serverAccountInventory = $serverAccountInventory
  workers = $workerArray
  preserveFirst = @{
    profilesDeleted = $false
    cookiesCleared = $false
    localStorageCleared = $false
    massRuntimeStartPerformed = $false
    massReloginPerformed = $false
    notes = "Each account now resolves to its own desktop browser root plus browser-data root."
  }
  verdict = $verdict
  summary = $summary
}

$jsonOutput = $result | ConvertTo-Json -Depth 8
$jsonOutput | Set-Content -LiteralPath $LatestJsonPath -Encoding UTF8
$jsonOutput | Set-Content -LiteralPath $OutputJsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Phase 33.1 Account Browser Isolation Summary")
$markdown.Add("")
$markdown.Add("- Generated: $($result.generatedAt)")
$markdown.Add("- Script compatibility version: $($result.scriptCompatibilityVersion)")
$markdown.Add("- Verdict: $($result.verdict)")
$markdown.Add("- Summary: $($result.summary)")
$markdown.Add("- successfulIsolationCount: $($result.successfulIsolationCount)")
$markdown.Add("- failedIsolationCount: $($result.failedIsolationCount)")
$markdown.Add("- manualInspectionReady: $($result.manualInspectionReady)")
$markdown.Add("- browserRootBasePath: $($result.browserRootBasePath)")
$markdown.Add("- sourceInstallPath: $($result.sourceInstallPath)")
$markdown.Add("- serverTransferMode: $($result.serverTransferMode)")
$markdown.Add("- copySourceBrowserData: $($result.copySourceBrowserData)")
if (-not [string]::IsNullOrWhiteSpace([string]$result.sourceBrowserDataBasePath)) {
  $markdown.Add("- sourceBrowserDataBasePath: $($result.sourceBrowserDataBasePath)")
}
if (-not [string]::IsNullOrWhiteSpace([string]$result.sourceBrowserDataManifestPath)) {
  $markdown.Add("- sourceBrowserDataManifestPath: $($result.sourceBrowserDataManifestPath)")
}
$markdown.Add("")
$markdown.Add("## Workers")
$markdown.Add("")

foreach ($worker in $workerArray) {
  $markdown.Add("### $($worker.workerId)")
  $markdown.Add("")
  $markdown.Add("- browserRootPath: $($worker.browserRootPath)")
  $markdown.Add("- browserExecutablePath: $($worker.browserExecutablePath)")
  $markdown.Add("- browserDataPath: $($worker.browserDataPath)")
  $markdown.Add("- sourceBrowserDataPath: $(if ($worker.sourceBrowserDataPath) { $worker.sourceBrowserDataPath } else { 'none' })")
  $markdown.Add("- sourceBrowserDataExists: $($worker.sourceBrowserDataExists)")
  $markdown.Add("- sourceBrowserDataCopied: $($worker.sourceBrowserDataCopied)")
  $markdown.Add("- copyResult: $($worker.copyResult)")
  $markdown.Add("- browserRootPrepared: $($worker.browserRootPrepared)")
  $markdown.Add("- browserDataPrepared: $($worker.browserDataPrepared)")
  $markdown.Add("- browserRootRefreshed: $($worker.browserRootRefreshed)")
  $markdown.Add("- crossAccountReuseDetected: $($worker.crossAccountReuseDetected)")
  $markdown.Add("- launchResult: $($worker.launchResult)")
  $markdown.Add("- windowKeptOpen: $($worker.windowKeptOpen)")
  $markdown.Add("- reusedExistingWindow: $($worker.reusedExistingWindow)")
  $markdown.Add("- remoteDebuggingPort: $($worker.remoteDebuggingPort)")
  if (-not [string]::IsNullOrWhiteSpace($worker.launchError)) {
    $markdown.Add("- launchError: $($worker.launchError)")
  }
  if (-not [string]::IsNullOrWhiteSpace($worker.copyError)) {
    $markdown.Add("- copyError: $($worker.copyError)")
  }
  $markdown.Add("")
}

$markdown | Set-Content -LiteralPath $OutputMarkdownPath -Encoding UTF8

$jsonOutput
