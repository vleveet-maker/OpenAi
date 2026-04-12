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
  [int]$RuntimeReviveWaitSeconds = 15,
  [int]$ForcedHostSettleSeconds = 10,
  [int]$PublicOwnerSettleSeconds = 10,
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptCompatibilityVersion = "phase24-exact-smoke-wrapper-compat-backport-v1"
$smokeWrapperParityFiles = @(
  "infra/windows-block/remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1",
  "infra/windows-block/remediate-post-phase21-disconnected-runtime-and-forced-host-public-owner-502.ps1",
  "infra/windows-block/test-rollout-smoke.ps1",
  "infra/windows-block/probe-public-api.ps1",
  "infra/windows-block/recover-browser-block-readiness.ps1",
  "infra/host-worker/test-host-worker-relay.ps1"
)

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
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

function Get-UpstreamStageSnapshot {
  param(
    [Parameter(Mandatory = $true)]
    [object]$RemediationResult,
    [Parameter(Mandatory = $true)]
    [string]$StageName
  )

  if ($null -eq $RemediationResult -or $null -eq $RemediationResult.stageSnapshots) {
    return $null
  }

  if ($RemediationResult.stageSnapshots.PSObject.Properties.Match($StageName).Count -eq 0) {
    return $null
  }

  return $RemediationResult.stageSnapshots.$StageName
}

function Get-MarkdownWorkerNote {
  param([object]$WorkerResult)

  if ($null -eq $WorkerResult) {
    return "unknown"
  }

  if ($WorkerResult.afterClassification -eq "ready" -and $WorkerResult.recovered) {
    return "recovered"
  }

  if ($WorkerResult.afterClassification -eq "ready") {
    return "ready"
  }

  if (-not [string]::IsNullOrWhiteSpace([string]$WorkerResult.blockerCode)) {
    return [string]$WorkerResult.blockerCode
  }

  return [string]$WorkerResult.afterClassification
}

function Test-FileContainsLiteral {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Literal
  )

  if (-not (Test-Path $Path)) {
    return $false
  }

  $raw = Get-Content -LiteralPath $Path -Raw
  return $raw.Contains($Literal)
}

function Format-HopStatusMarkdown {
  param([object]$HopStatus)

  if ($null -eq $HopStatus) {
    return "unknown"
  }

  return "passed=$($HopStatus.passed) healthz=$($HopStatus.healthzStatusCode) models=$($HopStatus.modelsStatusCode) chat=$($HopStatus.chatStatusCode)"
}

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\phases\23-deployed-windows-post-phase22-smoke-wrapper-parity-recovery-and-persistent-disconnected-runtime-forced-host-public-owner-502-remediation"
$upstreamRemediationScriptPath = Join-Path $PSScriptRoot "remediate-post-phase21-disconnected-runtime-and-forced-host-public-owner-502.ps1"
$temporaryRemediationJsonPath = Join-Path $phaseDir "23-TEMP-UPSTREAM-REMEDIATION.json"
$temporaryRemediationMarkdownPath = Join-Path $phaseDir "23-TEMP-UPSTREAM-REMEDIATION.md"

if (-not (Test-Path $upstreamRemediationScriptPath)) {
  throw "Missing Phase 23 remediation dependency: $upstreamRemediationScriptPath"
}

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\data\post-phase22-smoke-wrapper-parity-remediation\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "23-PARITY-REMEDIATION-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "23-PARITY-REMEDIATION-SUMMARY.md"
}

$parityCheckFiles = @(
  $smokeWrapperParityFiles | ForEach-Object {
    Join-Path $repoRoot $_
  }
)
$missingParityFiles = @(
  $parityCheckFiles | Where-Object {
    -not (Test-FileContainsLiteral -Path $_ -Literal $scriptCompatibilityVersion)
  }
)
$smokeWrapperParityStatus =
  if ($missingParityFiles.Count -eq 0) {
    "archive_chain_ready"
  } else {
    "marker_missing"
  }

$upstreamArgs = @(
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
  "-RuntimeReviveWaitSeconds", $RuntimeReviveWaitSeconds,
  "-ForcedHostSettleSeconds", $ForcedHostSettleSeconds,
  "-PublicOwnerSettleSeconds", $PublicOwnerSettleSeconds,
  "-LatestJsonPath", $temporaryRemediationJsonPath,
  "-OutputJsonPath", $temporaryRemediationJsonPath,
  "-OutputMarkdownPath", $temporaryRemediationMarkdownPath
)

if (@($WorkerIds).Count -gt 0) {
  $upstreamArgs += "-WorkerIds"
  $upstreamArgs += $WorkerIds
}

if (-not [string]::IsNullOrWhiteSpace($ApiToken)) {
  $upstreamArgs += @("-ApiToken", $ApiToken)
}

if (-not [string]::IsNullOrWhiteSpace($SettingsPath)) {
  $upstreamArgs += @("-SettingsPath", $SettingsPath)
}

$null = & $upstreamRemediationScriptPath @upstreamArgs

if (-not (Test-Path $temporaryRemediationJsonPath)) {
  throw "Phase 23 remediation could not find upstream remediation output at $temporaryRemediationJsonPath"
}

$remediationResult = ConvertFrom-JsonSafe -Raw (Get-Content -Path $temporaryRemediationJsonPath -Raw)

if ($null -eq $remediationResult) {
  throw "Phase 23 remediation could not parse upstream remediation output."
}

$stageOrder = @(
  "before_phase23_parity_recovery",
  "after_smoke_wrapper_parity_check",
  "after_targeted_runtime_revive",
  "after_loopback_recheck",
  "after_forced_host_recheck",
  "after_public_owner_recheck",
  "after_canary_stop"
)
$beforeStageSnapshot = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "before_post_phase21_followup"
$parityCheckSnapshot = [pscustomobject][ordered]@{
  checkedAt = (Get-Date).ToString("o")
  smokeWrapperParityStatus = $smokeWrapperParityStatus
  compatibilityMarker = $scriptCompatibilityVersion
  checkedFiles = @($smokeWrapperParityFiles)
  missingParityFiles = @($missingParityFiles)
}
$stageSnapshots = [ordered]@{
  before_phase23_parity_recovery = $beforeStageSnapshot
  after_smoke_wrapper_parity_check = $parityCheckSnapshot
  after_targeted_runtime_revive = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "after_targeted_runtime_revive"
  after_loopback_recheck = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "after_loopback_recheck"
  after_forced_host_recheck = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "after_forced_host_recheck"
  after_public_owner_recheck = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "after_public_owner_recheck"
  after_canary_stop = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "after_canary_stop"
}

$preRemediationReadyCount =
  if ($null -ne $remediationResult.preRemediationReadyCount) {
    [int]$remediationResult.preRemediationReadyCount
  } else {
    0
  }
$preRemediationTotalWorkers =
  if ($null -ne $remediationResult.preRemediationTotalWorkers) {
    [int]$remediationResult.preRemediationTotalWorkers
  } else {
    0
  }
$postRemediationReadyCount =
  if ($null -ne $remediationResult.postRemediationReadyCount) {
    [int]$remediationResult.postRemediationReadyCount
  } else {
    0
  }
$postRemediationTotalWorkers =
  if ($null -ne $remediationResult.postRemediationTotalWorkers) {
    [int]$remediationResult.postRemediationTotalWorkers
  } else {
    0
  }
$dominantRuntimeBlocker =
  if (-not [string]::IsNullOrWhiteSpace([string]$remediationResult.dominantRuntimeBlocker)) {
    [string]$remediationResult.dominantRuntimeBlocker
  } else {
    "unknown"
  }
$firstFailingHop =
  if (-not [string]::IsNullOrWhiteSpace([string]$remediationResult.firstFailingHop)) {
    [string]$remediationResult.firstFailingHop
  } else {
    "not_proven"
  }
$loopbackStatus = $remediationResult.loopbackStatus
$forcedHostStatus = $remediationResult.forcedHostStatus
$publicOwnerStatus = $remediationResult.publicOwnerStatus
$requestedWorkerIds =
  if ($null -ne $remediationResult.requestedWorkerIds) {
    @($remediationResult.requestedWorkerIds)
  } else {
    @($WorkerIds)
  }
$verdict =
  if (
    [string]$remediationResult.verdict -eq "post_phase21_ready_for_smoke" -and
    $smokeWrapperParityStatus -eq "archive_chain_ready"
  ) {
    "parity_recovered_ready_for_smoke"
  } else {
    "hold_rollout"
  }
$summary =
  if ($verdict -eq "parity_recovered_ready_for_smoke") {
    "Smoke-wrapper parity stayed aligned and the post-Phase-22 remediation remained green enough for the mandatory smoke rerun."
  } else {
    "Hold rollout: smokeWrapperParityStatus=$smokeWrapperParityStatus, preRemediationReadyCount=$preRemediationReadyCount/$preRemediationTotalWorkers, postRemediationReadyCount=$postRemediationReadyCount/$postRemediationTotalWorkers, dominantRuntimeBlocker=$dominantRuntimeBlocker, firstFailingHop=$firstFailingHop."
  }

$result = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  upstreamScriptCompatibilityVersion = $remediationResult.scriptCompatibilityVersion
  sessionBaseUrl = $SessionBaseUrl.TrimEnd("/")
  publicApiBaseUrl = $PublicApiBaseUrl.TrimEnd("/")
  internalBaseUrl = $InternalBaseUrl.TrimEnd("/")
  hostControllerBaseUrl = $HostControllerBaseUrl.TrimEnd("/")
  windowsEdgeBaseUrl = $WindowsEdgeBaseUrl.TrimEnd("/")
  publicHostHeader = $PublicHostHeader
  canaryWorkerId = $CanaryWorkerId
  requestedWorkerIds = @($requestedWorkerIds)
  runtimeReviveWaitSeconds = $RuntimeReviveWaitSeconds
  forcedHostSettleSeconds = $ForcedHostSettleSeconds
  publicOwnerSettleSeconds = $PublicOwnerSettleSeconds
  stageOrder = @($stageOrder)
  stageSnapshots = [pscustomobject]$stageSnapshots
  smokeWrapperParityStatus = $smokeWrapperParityStatus
  smokeWrapperParityFiles = @($smokeWrapperParityFiles)
  missingParityFiles = @($missingParityFiles)
  preRemediationReadyCount = $preRemediationReadyCount
  preRemediationTotalWorkers = $preRemediationTotalWorkers
  postRemediationReadyCount = $postRemediationReadyCount
  postRemediationTotalWorkers = $postRemediationTotalWorkers
  dominantRuntimeBlocker = $dominantRuntimeBlocker
  firstFailingHop = $firstFailingHop
  loopbackStatus = $loopbackStatus
  forcedHostStatus = $forcedHostStatus
  publicOwnerStatus = $publicOwnerStatus
  verdict = $verdict
  summary = $summary
  upstreamVerdict = $remediationResult.verdict
  remediation = $remediationResult
  canaryStopResult = $remediationResult.canaryStopResult
  workerResults = $remediationResult.workerResults
  preserveFirst = [pscustomobject][ordered]@{
    profilesDeleted = $false
    cookiesCleared = $false
    localStorageCleared = $false
    blindFullPoolRestartPerformed = $false
    massReloginPerformed = $false
  }
}

$jsonOutput = $result | ConvertTo-Json -Depth 18

Ensure-ParentDirectory -Path $LatestJsonPath
$jsonOutput | Set-Content -Path $LatestJsonPath -Encoding UTF8

Ensure-ParentDirectory -Path $OutputJsonPath
$jsonOutput | Set-Content -Path $OutputJsonPath -Encoding UTF8

Ensure-ParentDirectory -Path $OutputMarkdownPath
$lines = @()
$lines += "# Post-Phase-22 Smoke-Wrapper Parity Remediation Summary"
$lines += ""
$lines += "- Generated: $($result.generatedAt)"
$lines += "- Script compatibility version: $($result.scriptCompatibilityVersion)"
$lines += "- Upstream compatibility version: $($result.upstreamScriptCompatibilityVersion)"
$lines += "- Verdict: $($result.verdict)"
$lines += "- Summary: $($result.summary)"
$lines += "- Canary worker: $($result.canaryWorkerId)"
$lines += "- Requested workers: $(@($result.requestedWorkerIds) -join ', ')"
$lines += "- RuntimeReviveWaitSeconds: $RuntimeReviveWaitSeconds"
$lines += "- ForcedHostSettleSeconds: $ForcedHostSettleSeconds"
$lines += "- PublicOwnerSettleSeconds: $PublicOwnerSettleSeconds"
$lines += ""
$lines += "## Smoke-Wrapper Parity"
$lines += ""
$lines += "- smokeWrapperParityStatus: $($result.smokeWrapperParityStatus)"
$lines += "- smokeWrapperParityFiles: $(@($result.smokeWrapperParityFiles) -join ', ')"
$lines += "- missingParityFiles: $(if (@($result.missingParityFiles).Count -gt 0) { @($result.missingParityFiles) -join ', ' } else { 'none' })"
$lines += ""
$lines += "## Post-Phase-22 Remediation"
$lines += ""
$lines += "- preRemediationReadyCount: $($result.preRemediationReadyCount)/$($result.preRemediationTotalWorkers)"
$lines += "- postRemediationReadyCount: $($result.postRemediationReadyCount)/$($result.postRemediationTotalWorkers)"
$lines += "- dominantRuntimeBlocker: $($result.dominantRuntimeBlocker)"
$lines += "- firstFailingHop: $($result.firstFailingHop)"
$lines += "- loopbackStatus: $(Format-HopStatusMarkdown -HopStatus $result.loopbackStatus)"
$lines += "- forcedHostStatus: $(Format-HopStatusMarkdown -HopStatus $result.forcedHostStatus)"
$lines += "- publicOwnerStatus: $(Format-HopStatusMarkdown -HopStatus $result.publicOwnerStatus)"
$lines += "- stageOrder: $(@($result.stageOrder) -join ', ')"
$lines += ""
$lines += "## Worker Results"
$lines += ""
$lines += "| Worker | Before | After | Remediated | Note |"
$lines += "|--------|--------|-------|------------|------|"

foreach ($workerResult in @($result.workerResults)) {
  $lines += "| $($workerResult.workerId) | $($workerResult.beforeClassification) | $($workerResult.afterClassification) | $($workerResult.recovered) | $(Get-MarkdownWorkerNote -WorkerResult $workerResult) |"
}

$lines | Set-Content -Path $OutputMarkdownPath -Encoding UTF8

$jsonOutput
