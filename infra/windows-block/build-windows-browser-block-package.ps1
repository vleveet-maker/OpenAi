param(
  [string]$RepoRoot = "",
  [string]$OutputRoot = "",
  [string]$VersionLabel = "",
  [switch]$IncludeLocalProxyShareLinks,
  [switch]$SkipSingBoxBinary
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  param([string]$Candidate)

  if ($Candidate -and (Test-Path $Candidate)) {
    return (Resolve-Path $Candidate).Path
  }

  return (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
}

function Resolve-OutputRoot {
  param(
    [string]$Candidate,
    [string]$ResolvedRepoRoot
  )

  if ($Candidate -and $Candidate.Trim().Length -gt 0) {
    return $Candidate
  }

  return (Join-Path $ResolvedRepoRoot "dist\\windows-browser-block")
}

function Ensure-ParentDirectory {
  param([string]$Path)
  $parent = Split-Path -Parent $Path

  if ($parent) {
    $null = New-Item -ItemType Directory -Force -Path $parent
  }
}

function Copy-RelativeFile {
  param(
    [string]$RepoRootPath,
    [string]$StageRootPath,
    [string]$RelativePath
  )

  $sourcePath = Join-Path $RepoRootPath $RelativePath

  if (-not (Test-Path $sourcePath)) {
    throw "Missing required file: $sourcePath"
  }

  $destinationPath = Join-Path $StageRootPath $RelativePath
  Ensure-ParentDirectory -Path $destinationPath
  Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
}

function Copy-RelativeDirectory {
  param(
    [string]$RepoRootPath,
    [string]$StageRootPath,
    [string]$RelativePath
  )

  $sourcePath = Join-Path $RepoRootPath $RelativePath

  if (-not (Test-Path $sourcePath)) {
    throw "Missing required directory: $sourcePath"
  }

  $destinationPath = Join-Path $StageRootPath $RelativePath
  Ensure-ParentDirectory -Path $destinationPath
  Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Recurse -Force
}

function Write-Utf8File {
  param(
    [string]$Path,
    [string[]]$Lines
  )

  Ensure-ParentDirectory -Path $Path
  $Lines | Set-Content -LiteralPath $Path -Encoding utf8
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot
$resolvedOutputRoot = Resolve-OutputRoot -Candidate $OutputRoot -ResolvedRepoRoot $resolvedRepoRoot

if (-not $VersionLabel -or $VersionLabel.Trim().Length -eq 0) {
  $VersionLabel = Get-Date -Format "yyyyMMdd-HHmmss"
}

$packageName = "owmcgp-windows-browser-block-$VersionLabel"
$stageRoot = Join-Path $resolvedOutputRoot $packageName
$zipPath = Join-Path $resolvedOutputRoot "$packageName.zip"

if (Test-Path $stageRoot) {
  Remove-Item -LiteralPath $stageRoot -Recurse -Force
}

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

$null = New-Item -ItemType Directory -Force -Path $stageRoot

$filesToCopy = @(
  "docs\\windows-browser-block.md",
  "docs\\windows-public-api-block.md",
  "docs\\windows-server-agent-task.md",
  "docs\\remote-relay-server.md",
  "infra\\windows-block\\start-browser-block.ps1",
  "infra\\windows-block\\bootstrap-browser-block.ps1",
  "infra\\windows-block\\run-public-api.ps1",
  "infra\\windows-block\\start-public-api.ps1",
  "infra\\windows-block\\stop-public-api.ps1",
  "infra\\windows-block\\probe-public-api.ps1",
  "infra\\windows-block\\backup-public-edge-state.ps1",
  "infra\\windows-block\\collect-public-edge-audit.ps1",
  "infra\\windows-block\\activate-public-edge.ps1",
  "infra\\windows-block\\rollback-public-edge.ps1",
  "infra\\windows-block\\register-public-api-task.ps1",
  "infra\\windows-block\\public-api.settings.example.json",
  "infra\\windows-block\\start-reverse-tunnels.ps1",
  "infra\\windows-block\\stop-reverse-tunnels.ps1",
  "infra\\windows-block\\register-browser-block-tasks.ps1",
  "infra\\windows-block\\build-windows-browser-block-package.ps1",
  "infra\\host-worker\\start-host-controller.ps1",
  "infra\\host-worker\\start-host-worker-agent.ps1",
  "infra\\host-worker\\start-host-native-worker.ps1",
  "infra\\host-worker\\start-alternate-desktop-browser.ps1",
  "infra\\host-worker\\stop-host-native-worker.ps1",
  "infra\\host-worker\\start-all-host-workers.ps1",
  "infra\\host-worker\\start-dad-host-worker.ps1",
  "infra\\host-worker\\start-wife-host-worker.ps1",
  "infra\\host-worker\\start-shared-1-host-worker.ps1",
  "infra\\host-worker\\start-shared-2-host-worker.ps1",
  "infra\\host-worker\\start-shared-3-host-worker.ps1",
  "infra\\host-worker\\start-shared-4-host-worker.ps1",
  "infra\\host-worker\\start-shared-5-host-worker.ps1",
  "infra\\host-worker\\test-windows-browser-block-matrix.ps1",
  "infra\\proxy\\install-sing-box.ps1",
  ".planning\\phases\\10.6.1.2-full-server-hosted-browser-runtime-migration\\10.6.1.2-CURRENT-WINDOWS-BLOCK-MATRIX.md",
  ".planning\\phases\\10.6.1.2-full-server-hosted-browser-runtime-migration\\10.6.1.2-READINESS-VERDICT.md",
  ".planning\\phases\\10.6.1.2-full-server-hosted-browser-runtime-migration\\10.6.1.2-VERIFICATION.md",
  "services\\control-api\\package.json",
  "services\\control-api\\package-lock.json",
  "services\\control-api\\tsconfig.json",
  "services\\host-controller\\package.json",
  "services\\host-controller\\package-lock.json",
  "workers\\agent\\package.json",
  "workers\\agent\\package-lock.json",
  "workers\\agent\\tsconfig.json"
)

foreach ($relativePath in $filesToCopy) {
  Copy-RelativeFile -RepoRootPath $resolvedRepoRoot -StageRootPath $stageRoot -RelativePath $relativePath
}

$directoriesToCopy = @(
  "services\\control-api\\src",
  "services\\host-controller\\src",
  "workers\\agent\\src"
)

foreach ($relativePath in $directoriesToCopy) {
  Copy-RelativeDirectory -RepoRootPath $resolvedRepoRoot -StageRootPath $stageRoot -RelativePath $relativePath
}

$workerIds = @("dad", "wife", "shared-1", "shared-2", "shared-3", "shared-4", "shared-5")

$placeholderDirectories = @(
  "infra\\data\\control-api",
  "infra\\data\\host-worker-logs",
  "infra\\data\\host-worker-state",
  "infra\\data\\proxy\\sing-box",
  "infra\\data\\proxy"
)

foreach ($workerId in $workerIds) {
  $placeholderDirectories += "infra\\data\\host-profiles\\$workerId"
}

foreach ($relativePath in $placeholderDirectories) {
  $null = New-Item -ItemType Directory -Force -Path (Join-Path $stageRoot $relativePath)
}

$shareLinksSourcePath = Join-Path $resolvedRepoRoot "infra\\data\\proxy\\share-links.local.json"
$shareLinksDestinationPath = Join-Path $stageRoot "infra\\data\\proxy\\share-links.local.json"
$shareLinksExamplePath = Join-Path $stageRoot "infra\\data\\proxy\\share-links.local.json.example"

if ($IncludeLocalProxyShareLinks -and (Test-Path $shareLinksSourcePath)) {
  Copy-Item -LiteralPath $shareLinksSourcePath -Destination $shareLinksDestinationPath -Force
}

Write-Utf8File -Path $shareLinksExamplePath -Lines @(
  "[",
  '  "vless://...",',
  '  "ss://...",',
  '  "trojan://..."',
  "]"
)

if (-not $SkipSingBoxBinary) {
  $singBoxBinarySourcePath = Join-Path $resolvedRepoRoot "infra\\tools\\sing-box\\current\\sing-box.exe"

  if (Test-Path $singBoxBinarySourcePath) {
    $singBoxBinaryDestinationPath = Join-Path $stageRoot "infra\\tools\\sing-box\\current\\sing-box.exe"
    Ensure-ParentDirectory -Path $singBoxBinaryDestinationPath
    Copy-Item -LiteralPath $singBoxBinarySourcePath -Destination $singBoxBinaryDestinationPath -Force
  }
}

$profilesNotePath = Join-Path $stageRoot "infra\\data\\host-profiles\\README-FIRST.txt"
Write-Utf8File -Path $profilesNotePath -Lines @(
  "These seven profile folders are placeholders only.",
  "",
  "Logged-in ChatGPT browser sessions are not bundled from the source machine.",
  "Reason: Windows browser profile encryption (DPAPI) is machine/user bound,",
  "so copying logged-in profiles to another Windows Server is not treated as reliable.",
  "",
  "On the target Windows Server:",
  "1. Use the same worker IDs: dad, wife, shared-1, shared-2, shared-3, shared-4, shared-5",
  "2. Start each worker on demand",
  "3. Log in manually once in that server session"
)

$startHerePath = Join-Path $stageRoot "START-HERE.txt"
$proxyLine =
  if ($IncludeLocalProxyShareLinks -and (Test-Path $shareLinksSourcePath)) {
    "Proxy share links are INCLUDED in infra\\data\\proxy\\share-links.local.json. Treat this archive as sensitive."
  } else {
    "Proxy share links are NOT bundled. Put them into infra\\data\\proxy\\share-links.local.json before starting tunnels."
  }

Write-Utf8File -Path $startHerePath -Lines @(
  "OWMCGP Windows Browser Block",
  "",
  "1. Unpack this archive on the target Windows Server.",
  "2. Install prerequisites: Node.js LTS, Chrome or Edge, OpenSSH client.",
  "3. Run:",
  "   powershell -ExecutionPolicy Bypass -File .\\infra\\windows-block\\bootstrap-browser-block.ps1",
  "4. Create the public API settings file:",
  "   Copy .\\infra\\windows-block\\public-api.settings.example.json to",
  "   .\\infra\\data\\control-api\\remote-relay.local.json and set a strong apiToken.",
  "5. Before public cutover on a live server, capture preserve-first edge backup and audit:",
  "   powershell -ExecutionPolicy Bypass -File .\\infra\\windows-block\\backup-public-edge-state.ps1",
  "   powershell -ExecutionPolicy Bypass -File .\\infra\\windows-block\\collect-public-edge-audit.ps1",
  "6. Start host-controller:",
  "   powershell -ExecutionPolicy Bypass -File .\\infra\\windows-block\\start-browser-block.ps1",
  "7. Start the shadow local public API on loopback:",
  "   powershell -ExecutionPolicy Bypass -File .\\infra\\windows-block\\start-public-api.ps1 -ListenHost 127.0.0.1 -ListenPort 4011 -AllowedWorkerIds shared-6",
  "8. Reconcile the Windows edge to the shadow path:",
  "   powershell -ExecutionPolicy Bypass -File .\\infra\\windows-block\\activate-public-edge.ps1 -Mode shadow -Apply",
  "9. Start reverse tunnels only if you still use the Linux relay path:",
  "   powershell -ExecutionPolicy Bypass -File .\\infra\\windows-block\\start-reverse-tunnels.ps1 -RemoteHost 77.66.186.75 -RemotePort 2222 -RemoteUser mi50 -IncludeHostController",
  "10. Optional autostart on interactive logon:",
  "   powershell -ExecutionPolicy Bypass -File .\\infra\\windows-block\\register-browser-block-tasks.ps1 -RemoteHost 77.66.186.75 -RemotePort 2222 -RemoteUser mi50",
  "   powershell -ExecutionPolicy Bypass -File .\\infra\\windows-block\\register-public-api-task.ps1",
  "11. Verify the seven-worker block:",
  "   powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\test-windows-browser-block-matrix.ps1",
  "12. Verify the shadow public API:",
  "   powershell -ExecutionPolicy Bypass -File .\\infra\\windows-block\\probe-public-api.ps1 -BaseUrl http://127.0.0.1:4011 -IncludeChatProbe -WorkerId shared-6 -EnsureWorkerStarted -StopWorkerWhenDone",
  "13. Only after that promote to loopback 4010 and switch the edge:",
  "   powershell -ExecutionPolicy Bypass -File .\\infra\\windows-block\\start-public-api.ps1 -ListenHost 127.0.0.1 -ListenPort 4010",
  "   powershell -ExecutionPolicy Bypass -File .\\infra\\windows-block\\activate-public-edge.ps1 -Mode promoted -Apply",
  "",
  $proxyLine,
  "",
  "Important: this package prepares the Windows block and its seven worker slots.",
  "Manual login for the seven ChatGPT accounts still happens on the target Windows Server.",
  "This package also contains the Windows-side public API mode and preserve-first edge scripts."
)

$manifestPath = Join-Path $stageRoot "PACKAGE-MANIFEST.json"
$manifest = [pscustomobject][ordered]@{
  packageName = $packageName
  builtAt = (Get-Date).ToString("o")
  packageType = "windows_browser_block"
  includesLocalProxyShareLinks = [bool]($IncludeLocalProxyShareLinks -and (Test-Path $shareLinksSourcePath))
  includesSingBoxBinary = [bool]((Test-Path (Join-Path $stageRoot "infra\\tools\\sing-box\\current\\sing-box.exe")))
  workerIds = $workerIds
  relayHost = "77.66.186.75"
  relaySshPort = 2222
  relayUser = "mi50"
  notes = @(
    "The package supports both Linux-edge relay mode and Windows-side public API mode.",
    "This package does not claim that logged-in browser sessions transfer between Windows machines.",
    "Use interactive logon on the target Windows Server for browser workers.",
    "The package also includes a Windows-side public API mode."
  )
}

$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding utf8

Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $zipPath -Force

Write-Output $zipPath
