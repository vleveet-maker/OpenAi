param(
  [string]$RepoRoot = "",
  [string]$BackupRoot = "",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$HostControllerToken = "local-host-controller-token",
  [string[]]$WorkerIds = @(),
  [switch]$CopyProfiles,
  [switch]$AllowRunningWorkers
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-RepoRoot {
  param([string]$Candidate)

  if ($Candidate -and (Test-Path $Candidate)) {
    return (Resolve-Path $Candidate).Path
  }

  return (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
}

function Get-DiscoveredWorkerIds {
  param([string]$ResolvedRepoRoot)

  $hostWorkerDir = Join-Path $ResolvedRepoRoot "infra\\host-worker"
  $launchers = Get-ChildItem -LiteralPath $hostWorkerDir -Filter "start-*-host-worker.ps1" -ErrorAction Stop

  return @(
    $launchers |
      ForEach-Object {
        if ($_.BaseName -match "^start-(.+)-host-worker$") {
          $Matches[1]
        }
      } |
      Where-Object { $_ } |
      Sort-Object
  )
}

function Invoke-JsonRequest {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  $params = @{
    Method = $Method
    Uri = $Url
    Headers = $Headers
    ContentType = "application/json"
    TimeoutSec = 20
  }

  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 8 -Compress)
  }

  return Invoke-RestMethod @params
}

function Invoke-Robocopy {
  param(
    [string]$SourcePath,
    [string]$DestinationPath
  )

  New-Item -ItemType Directory -Force -Path $DestinationPath | Out-Null
  $null = & robocopy $SourcePath $DestinationPath /E /COPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS /NP
  $exitCode = $LASTEXITCODE

  if ($exitCode -gt 7) {
    throw "robocopy failed for $SourcePath -> $DestinationPath with exit code $exitCode"
  }
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot

if (-not $BackupRoot -or $BackupRoot.Trim().Length -eq 0) {
  $BackupRoot = Join-Path $resolvedRepoRoot "infra\\data\\backups\\browser-block"
}

$selectedWorkerIds =
  if ($WorkerIds -and $WorkerIds.Count -gt 0) { @($WorkerIds) } else { Get-DiscoveredWorkerIds -ResolvedRepoRoot $resolvedRepoRoot }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $BackupRoot $timestamp
$profilesBackupPath = Join-Path $backupPath "profiles"
New-Item -ItemType Directory -Force -Path $backupPath | Out-Null

$controllerHeaders = @{ "x-host-controller-token" = $HostControllerToken }
$healthSnapshot = $null

try {
  $healthSnapshot = Invoke-JsonRequest -Method "GET" -Url "$HostControllerBaseUrl/health" -Headers $controllerHeaders
} catch {
  Write-Warning "Could not query host-controller health: $_"
}

if ($CopyProfiles -and $healthSnapshot -and -not $AllowRunningWorkers) {
  $runningWorkers = @(
    $healthSnapshot.workers |
      Where-Object {
        $_.workerId -in $selectedWorkerIds -and ($_.agentListening -or $_.browserListening)
      }
  )

  if ($runningWorkers.Count -gt 0) {
    throw "Refusing profile copy while workers are still running: $($runningWorkers.workerId -join ', ')"
  }
}

$manifest = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  repoRoot = $resolvedRepoRoot
  backupPath = $backupPath
  workerIds = @($selectedWorkerIds)
  copyProfiles = [bool]$CopyProfiles
  allowRunningWorkers = [bool]$AllowRunningWorkers
  hostControllerBaseUrl = $HostControllerBaseUrl
  packageManifestPath = Join-Path $resolvedRepoRoot "PACKAGE-MANIFEST.json"
  startHerePath = Join-Path $resolvedRepoRoot "START-HERE.txt"
  hostControllerHealth = $healthSnapshot
}

$manifest | ConvertTo-Json -Depth 8 | Set-Content -Path (Join-Path $backupPath "freeze-point.json") -Encoding UTF8

if (Test-Path $manifest.packageManifestPath) {
  Copy-Item -LiteralPath $manifest.packageManifestPath -Destination (Join-Path $backupPath "PACKAGE-MANIFEST.json") -Force
}

if (Test-Path $manifest.startHerePath) {
  Copy-Item -LiteralPath $manifest.startHerePath -Destination (Join-Path $backupPath "START-HERE.txt") -Force
}

if ($CopyProfiles) {
  foreach ($workerId in $selectedWorkerIds) {
    $sourceProfilePath = Join-Path $resolvedRepoRoot "infra\\data\\host-profiles\\$workerId"
    if (-not (Test-Path $sourceProfilePath)) {
      Write-Warning "Skipping missing profile path: $sourceProfilePath"
      continue
    }

    Invoke-Robocopy -SourcePath $sourceProfilePath -DestinationPath (Join-Path $profilesBackupPath $workerId)
  }
}

Write-Host "[windows-block] freeze backup written to $backupPath"
