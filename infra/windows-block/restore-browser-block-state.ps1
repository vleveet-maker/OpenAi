param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [string]$RepoRoot = "",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$HostControllerToken = "local-host-controller-token",
  [string[]]$WorkerIds = @(),
  [switch]$ConfirmRestore,
  [switch]$Force
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

function Invoke-JsonRequest {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers = @{}
  )

  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -TimeoutSec 20
}

function Invoke-RobocopyMirror {
  param(
    [string]$SourcePath,
    [string]$DestinationPath
  )

  New-Item -ItemType Directory -Force -Path $DestinationPath | Out-Null
  $null = & robocopy $SourcePath $DestinationPath /MIR /COPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS /NP
  $exitCode = $LASTEXITCODE

  if ($exitCode -gt 7) {
    throw "robocopy restore failed for $SourcePath -> $DestinationPath with exit code $exitCode"
  }
}

if (-not $ConfirmRestore) {
  throw "Restore is destructive. Re-run with -ConfirmRestore after workers are stopped."
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot
$resolvedBackupPath = (Resolve-Path $BackupPath).Path
$freezePointPath = Join-Path $resolvedBackupPath "freeze-point.json"

if (-not (Test-Path $freezePointPath)) {
  throw "Missing freeze-point.json in $resolvedBackupPath"
}

$freezePoint = Get-Content -LiteralPath $freezePointPath -Raw | ConvertFrom-Json
$selectedWorkerIds =
  if ($WorkerIds -and $WorkerIds.Count -gt 0) { @($WorkerIds) } else { @($freezePoint.workerIds) }

if (-not $Force) {
  try {
    $health = Invoke-JsonRequest -Method "GET" -Url "$HostControllerBaseUrl/health" -Headers @{ "x-host-controller-token" = $HostControllerToken }
    $runningWorkers = @(
      $health.workers |
        Where-Object { $_.workerId -in $selectedWorkerIds -and ($_.agentListening -or $_.browserListening) }
    )

    if ($runningWorkers.Count -gt 0) {
      throw "Refusing restore while workers are still running: $($runningWorkers.workerId -join ', ')"
    }
  } catch {
    throw "Pre-restore safety check failed: $_"
  }
}

foreach ($workerId in $selectedWorkerIds) {
  $sourceProfilePath = Join-Path $resolvedBackupPath "profiles\\$workerId"
  $destinationProfilePath = Join-Path $resolvedRepoRoot "infra\\data\\host-profiles\\$workerId"

  if (-not (Test-Path $sourceProfilePath)) {
    Write-Warning "Skipping missing backup profile path: $sourceProfilePath"
    continue
  }

  Invoke-RobocopyMirror -SourcePath $sourceProfilePath -DestinationPath $destinationProfilePath
}

Write-Host "[windows-block] restore completed from $resolvedBackupPath"
