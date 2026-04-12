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

$scriptCompatibilityVersion = "phase21-post-parity-remediation-v1"

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

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\phases\21-deployed-windows-disconnected-runtime-and-windows-edge-forced-host-public-owner-502-remediation-after-parity-clean-proof"
$upstreamRemediationScriptPath = Join-Path $PSScriptRoot "remediate-persistent-disconnected-runtime-and-public-502-parity.ps1"
$temporaryRemediationJsonPath = Join-Path $phaseDir "21-TEMP-UPSTREAM-REMEDIATION.json"
$temporaryRemediationMarkdownPath = Join-Path $phaseDir "21-TEMP-UPSTREAM-REMEDIATION.md"

if (-not (Test-Path $upstreamRemediationScriptPath)) {
  throw "Missing Phase 21 remediation dependency: $upstreamRemediationScriptPath"
}

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\data\post-parity-disconnected-runtime-remediation\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "21-REMEDIATION-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "21-REMEDIATION-SUMMARY.md"
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
  throw "Phase 21 remediation could not find upstream remediation output at $temporaryRemediationJsonPath"
}

$remediationResult = ConvertFrom-JsonSafe -Raw (Get-Content -Path $temporaryRemediationJsonPath -Raw)

if ($null -eq $remediationResult) {
  throw "Phase 21 remediation could not parse upstream remediation output."
}

$stageOrder = @(
  "before_post_parity_remediation",
  "after_targeted_runtime_revive",
  "after_loopback_confirmation",
  "after_forced_host_recheck",
  "after_public_owner_recheck",
  "after_canary_stop"
)
$beforeStageSnapshot = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "before_parity_remediation"
$stageSnapshots = [ordered]@{
  before_post_parity_remediation = $beforeStageSnapshot
  after_targeted_runtime_revive = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "after_targeted_runtime_revive"
  after_loopback_confirmation = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "after_loopback_confirmation"
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
$forcedHostStatus = $remediationResult.forcedHostStatus
$publicOwnerStatus = $remediationResult.publicOwnerStatus
$requestedWorkerIds =
  if ($null -ne $remediationResult.requestedWorkerIds) {
    @($remediationResult.requestedWorkerIds)
  } else {
    @($WorkerIds)
  }
$verdict =
  if ([string]$remediationResult.verdict -eq "parity_backport_ready_for_smoke") {
    "post_parity_ready_for_smoke"
  } else {
    "hold_rollout"
  }
$summary =
  if ($verdict -eq "post_parity_ready_for_smoke") {
    "Post-parity remediation stayed green end-to-end, so the host is ready for the mandatory smoke rerun."
  } else {
    "Hold rollout: preRemediationReadyCount=$preRemediationReadyCount/$preRemediationTotalWorkers, postRemediationReadyCount=$postRemediationReadyCount/$postRemediationTotalWorkers, dominantRuntimeBlocker=$dominantRuntimeBlocker, firstFailingHop=$firstFailingHop."
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
  preRemediationReadyCount = $preRemediationReadyCount
  preRemediationTotalWorkers = $preRemediationTotalWorkers
  postRemediationReadyCount = $postRemediationReadyCount
  postRemediationTotalWorkers = $postRemediationTotalWorkers
  dominantRuntimeBlocker = $dominantRuntimeBlocker
  firstFailingHop = $firstFailingHop
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

$jsonOutput = $result | ConvertTo-Json -Depth 16

Ensure-ParentDirectory -Path $LatestJsonPath
$jsonOutput | Set-Content -Path $LatestJsonPath -Encoding UTF8

Ensure-ParentDirectory -Path $OutputJsonPath
$jsonOutput | Set-Content -Path $OutputJsonPath -Encoding UTF8

Ensure-ParentDirectory -Path $OutputMarkdownPath
$lines = @()
$lines += "# Post-Parity Disconnected Runtime Remediation Summary"
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
$lines += "## Post-Parity Remediation"
$lines += ""
$lines += "- preRemediationReadyCount: $($result.preRemediationReadyCount)/$($result.preRemediationTotalWorkers)"
$lines += "- postRemediationReadyCount: $($result.postRemediationReadyCount)/$($result.postRemediationTotalWorkers)"
$lines += "- dominantRuntimeBlocker: $($result.dominantRuntimeBlocker)"
$lines += "- firstFailingHop: $($result.firstFailingHop)"
$lines += "- forcedHostStatus: passed=$($result.forcedHostStatus.passed) healthz=$($result.forcedHostStatus.healthzStatusCode) models=$($result.forcedHostStatus.modelsStatusCode) chat=$($result.forcedHostStatus.chatStatusCode)"
$lines += "- publicOwnerStatus: passed=$($result.publicOwnerStatus.passed) healthz=$($result.publicOwnerStatus.healthzStatusCode) models=$($result.publicOwnerStatus.modelsStatusCode) chat=$($result.publicOwnerStatus.chatStatusCode)"
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
