param(
  [string]$SessionBaseUrl = "http://127.0.0.1:8080",
  [string]$PublicApiBaseUrl = "http://77.66.186.75",
  [string]$InternalBaseUrl = "http://127.0.0.1:8081",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$WindowsEdgeBaseUrl = "http://127.0.0.1",
  [string]$PublicHostHeader = "77.66.186.75",
  [string]$InternalAdminToken = "local-internal-admin-token",
  [string]$HostControllerToken = "local-host-controller-token",
  [string]$CanaryWorkerId = "shared-6",
  [string[]]$WorkerIds = @(),
  [string]$ApiToken = "",
  [string]$SettingsPath = "",
  [int]$TimeoutSeconds = 180,
  [int]$RecoveryWaitSeconds = 15,
  [int]$PostCanaryDelaySeconds = 10,
  [int]$PostSmokeDelaySeconds = 15,
  [switch]$KeepCanaryRunningUntilFinalSnapshot,
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptCompatibilityVersion = "phase18-runtime-remediation-v1"

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
}

function Ensure-ParentDirectory {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return
  }

  $parent = Split-Path -Parent $Path

  if (-not [string]::IsNullOrWhiteSpace($parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
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

function Get-SmokeStageSnapshot {
  param(
    [object]$SmokeResult,
    [string]$PreferredStage
  )

  if ($null -eq $SmokeResult -or $null -eq $SmokeResult.stageSnapshots) {
    return $null
  }

  $preferred = $SmokeResult.stageSnapshots.$PreferredStage

  if ($null -ne $preferred) {
    return $preferred
  }

  foreach ($fallbackStage in @("after_settle", "after_smoke", "after_canary_stop", "after_canary_start", "before_smoke")) {
    $candidate = $SmokeResult.stageSnapshots.$fallbackStage

    if ($null -ne $candidate) {
      return $candidate
    }
  }

  return $null
}

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\\phases\\16-deployed-windows-runtime-parity-sync-and-post-remediation-degraded-smoke-stabilization"
$remediationScriptPath = Join-Path $PSScriptRoot "remediate-disconnected-baseline-and-forced-host-edge.ps1"
$smokeScriptPath = Join-Path $PSScriptRoot "test-rollout-smoke.ps1"
$tempRemediationJsonPath = Join-Path $phaseDir "16-TEMP-REMEDIATION.json"
$tempRemediationMarkdownPath = Join-Path $phaseDir "16-TEMP-REMEDIATION.md"
$tempSmokeJsonPath = Join-Path $phaseDir "16-TEMP-SMOKE.json"
$tempSmokeMarkdownPath = Join-Path $phaseDir "16-TEMP-SMOKE.md"

if (-not (Test-Path $remediationScriptPath)) {
  throw "Missing stabilization dependency: $remediationScriptPath"
}

if (-not (Test-Path $smokeScriptPath)) {
  throw "Missing stabilization dependency: $smokeScriptPath"
}

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\\data\\post-remediation-degraded-smoke\\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "16-STABILIZATION-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "16-STABILIZATION-SUMMARY.md"
}

$remediationArgs = @(
  "-SessionBaseUrl", $SessionBaseUrl,
  "-PublicApiBaseUrl", $PublicApiBaseUrl,
  "-InternalBaseUrl", $InternalBaseUrl,
  "-HostControllerBaseUrl", $HostControllerBaseUrl,
  "-WindowsEdgeBaseUrl", $WindowsEdgeBaseUrl,
  "-PublicHostHeader", $PublicHostHeader,
  "-InternalAdminToken", $InternalAdminToken,
  "-HostControllerToken", $HostControllerToken,
  "-CanaryWorkerId", $CanaryWorkerId,
  "-TimeoutSeconds", $TimeoutSeconds,
  "-RecoveryWaitSeconds", $RecoveryWaitSeconds,
  "-EdgeSettleSeconds", $PostCanaryDelaySeconds,
  "-LatestJsonPath", $tempRemediationJsonPath,
  "-OutputJsonPath", $tempRemediationJsonPath,
  "-OutputMarkdownPath", $tempRemediationMarkdownPath
)

if (@($WorkerIds).Count -gt 0) {
  $remediationArgs += "-WorkerIds"
  $remediationArgs += $WorkerIds
}

if (-not [string]::IsNullOrWhiteSpace($ApiToken)) {
  $remediationArgs += @("-ApiToken", $ApiToken)
}

if (-not [string]::IsNullOrWhiteSpace($SettingsPath)) {
  $remediationArgs += @("-SettingsPath", $SettingsPath)
}

$null = & $remediationScriptPath @remediationArgs
$remediationResult = ConvertFrom-JsonSafe -Raw (Get-Content -Path $tempRemediationJsonPath -Raw)

$smokeArgs = @(
  "-PublicBaseUrl", $PublicApiBaseUrl,
  "-InternalBaseUrl", $InternalBaseUrl,
  "-HostControllerBaseUrl", $HostControllerBaseUrl,
  "-InternalAdminToken", $InternalAdminToken,
  "-HostControllerToken", $HostControllerToken,
  "-CanaryWorkerId", $CanaryWorkerId,
  "-TimeoutSeconds", $TimeoutSeconds,
  "-PostCanaryDelaySeconds", $PostCanaryDelaySeconds,
  "-PostSmokeDelaySeconds", $PostSmokeDelaySeconds,
  "-LatestJsonPath", $tempSmokeJsonPath,
  "-OutputJsonPath", $tempSmokeJsonPath,
  "-OutputMarkdownPath", $tempSmokeMarkdownPath
)

if ($KeepCanaryRunningUntilFinalSnapshot) {
  $smokeArgs += "-KeepCanaryRunningUntilFinalSnapshot"
}

if (-not [string]::IsNullOrWhiteSpace($ApiToken)) {
  $smokeArgs += @("-ApiToken", $ApiToken)
}

if (-not [string]::IsNullOrWhiteSpace($SettingsPath)) {
  $smokeArgs += @("-SettingsPath", $SettingsPath)
}

$null = & $smokeScriptPath @smokeArgs
$smokeResult = ConvertFrom-JsonSafe -Raw (Get-Content -Path $tempSmokeJsonPath -Raw)

$beforeSnapshot =
  if ($null -ne $remediationResult) {
    $remediationResult.stageSnapshots.before_remediation
  } else {
    $null
  }
$afterRemediationSnapshot =
  if ($null -ne $remediationResult) {
    if ($null -ne $remediationResult.stageSnapshots.after_canary_stop) {
      $remediationResult.stageSnapshots.after_canary_stop
    } else {
      $remediationResult.stageSnapshots.after_public_owner_probe
    }
  } else {
    $null
  }
$afterSmokeCanarySnapshot = Get-SmokeStageSnapshot -SmokeResult $smokeResult -PreferredStage "after_canary_start"
$afterSmokeSettleSnapshot = Get-SmokeStageSnapshot -SmokeResult $smokeResult -PreferredStage "after_settle"
$afterCleanupSnapshot = Get-SmokeStageSnapshot -SmokeResult $smokeResult -PreferredStage "after_canary_stop"

$preSmokeReadyCount =
  if ($null -ne $afterRemediationSnapshot) {
    $afterRemediationSnapshot.internal.workers.readyWorkers
  } else {
    0
  }
$preSmokeTotalWorkers =
  if ($null -ne $afterRemediationSnapshot) {
    $afterRemediationSnapshot.internal.workers.totalWorkers
  } else {
    0
  }
$finalSmokeReadyCount =
  if ($null -ne $afterSmokeSettleSnapshot) {
    $afterSmokeSettleSnapshot.internal.workers.readyWorkers
  } else {
    0
  }
$finalSmokeTotalWorkers =
  if ($null -ne $afterSmokeSettleSnapshot) {
    $afterSmokeSettleSnapshot.internal.workers.totalWorkers
  } else {
    0
  }
$finalPoolStatus =
  if ($null -ne $afterSmokeSettleSnapshot) {
    $afterSmokeSettleSnapshot.internal.pool.status
  } else {
    "unknown"
  }
$publicCanaryPassed =
  if ($null -ne $smokeResult -and $null -ne $smokeResult.publicCanary) {
    [bool]$smokeResult.publicCanary.healthz.ok -and
    [bool]$smokeResult.publicCanary.models.ok -and
    [bool]$smokeResult.publicCanary.chat.ok
  } else {
    $false
  }
$verdict =
  if (
    $null -ne $smokeResult -and
    $smokeResult.verdict -eq "ready_for_household_use"
  ) {
    "stabilized_through_smoke"
  } else {
    "hold_rollout"
  }
$summary =
  if ($verdict -eq "stabilized_through_smoke") {
    "Parity-synced stabilization survived smoke: pre-smoke ready $preSmokeReadyCount/$preSmokeTotalWorkers, final smoke ready $finalSmokeReadyCount/$finalSmokeTotalWorkers, pool status $finalPoolStatus, public canary passed=$publicCanaryPassed."
  } else {
    "Hold rollout: parity-synced stabilization ended with pre-smoke ready $preSmokeReadyCount/$preSmokeTotalWorkers, final smoke ready $finalSmokeReadyCount/$finalSmokeTotalWorkers, pool status $finalPoolStatus, public canary passed=$publicCanaryPassed."
  }

$result = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  sessionBaseUrl = $SessionBaseUrl.TrimEnd("/")
  publicApiBaseUrl = $PublicApiBaseUrl.TrimEnd("/")
  internalBaseUrl = $InternalBaseUrl.TrimEnd("/")
  hostControllerBaseUrl = $HostControllerBaseUrl.TrimEnd("/")
  windowsEdgeBaseUrl = $WindowsEdgeBaseUrl.TrimEnd("/")
  publicHostHeader = $PublicHostHeader
  canaryWorkerId = $CanaryWorkerId
  workerIds = @($WorkerIds)
  recoveryWaitSeconds = $RecoveryWaitSeconds
  postCanaryDelaySeconds = $PostCanaryDelaySeconds
  postSmokeDelaySeconds = $PostSmokeDelaySeconds
  keepCanaryRunningUntilFinalSnapshot = [bool]$KeepCanaryRunningUntilFinalSnapshot
  preSmokeReadyCount = $preSmokeReadyCount
  preSmokeTotalWorkers = $preSmokeTotalWorkers
  finalSmokeReadyCount = $finalSmokeReadyCount
  finalSmokeTotalWorkers = $finalSmokeTotalWorkers
  finalPoolStatus = $finalPoolStatus
  publicCanaryPassed = [bool]$publicCanaryPassed
  verdict = $verdict
  summary = $summary
  stageOrder = @(
    "before_stabilization",
    "after_remediation",
    "after_smoke_canary",
    "after_smoke_settle",
    "after_cleanup"
  )
  stageSnapshots = [pscustomobject][ordered]@{
    before_stabilization = $beforeSnapshot
    after_remediation = $afterRemediationSnapshot
    after_smoke_canary = $afterSmokeCanarySnapshot
    after_smoke_settle = $afterSmokeSettleSnapshot
    after_cleanup = $afterCleanupSnapshot
  }
  remediation = $remediationResult
  smoke = $smokeResult
}

$jsonOutput = $result | ConvertTo-Json -Depth 14

Ensure-ParentDirectory -Path $LatestJsonPath
$jsonOutput | Set-Content -Path $LatestJsonPath -Encoding UTF8

Ensure-ParentDirectory -Path $OutputJsonPath
$jsonOutput | Set-Content -Path $OutputJsonPath -Encoding UTF8

Ensure-ParentDirectory -Path $OutputMarkdownPath

$lines = @()
$lines += "# Post-Remediation Degraded Smoke Stabilization Summary"
$lines += ""
$lines += "- Generated: $($result.generatedAt)"
$lines += "- Script compatibility version: $($result.scriptCompatibilityVersion)"
$lines += "- Verdict: $($result.verdict)"
$lines += "- Summary: $($result.summary)"
$lines += "- Canary worker: $($result.canaryWorkerId)"
$lines += "- Pre-smoke ready count: $($result.preSmokeReadyCount)/$($result.preSmokeTotalWorkers)"
$lines += "- Final smoke ready count: $($result.finalSmokeReadyCount)/$($result.finalSmokeTotalWorkers)"
$lines += "- Final pool status: $($result.finalPoolStatus)"
$lines += "- Public canary passed: $($result.publicCanaryPassed)"
$lines += "- Keep canary running until final snapshot: $($result.keepCanaryRunningUntilFinalSnapshot)"
$lines += "- Stage order: $(@($result.stageOrder) -join ', ')"
$lines += ""
$lines += "## Parity-Synced Run"
$lines += ""
$lines += "- Remediation verdict: $(if ($null -ne $result.remediation) { $result.remediation.verdict } else { 'unknown' })"
$lines += "- Smoke verdict: $(if ($null -ne $result.smoke) { $result.smoke.verdict } else { 'unknown' })"
$lines += "- Public canary reply: $(if ($null -ne $result.smoke -and $null -ne $result.smoke.publicCanary) { $result.smoke.publicCanary.chat.assistantReplyText } else { 'n/a' })"
$lines += ""
$lines += "## Stage Counts"
$lines += ""
$lines += "| Stage | Ready | Pool status |"
$lines += "|-------|-------|-------------|"

foreach ($stageName in @("before_stabilization", "after_remediation", "after_smoke_canary", "after_smoke_settle", "after_cleanup")) {
  $snapshot = $result.stageSnapshots.$stageName

  if ($null -eq $snapshot) {
    $lines += "| $stageName | n/a | n/a |"
    continue
  }

  $lines += "| $stageName | $($snapshot.internal.workers.readyWorkers)/$($snapshot.internal.workers.totalWorkers) | $($snapshot.internal.pool.status) |"
}

$lines | Set-Content -Path $OutputMarkdownPath -Encoding UTF8

$jsonOutput
