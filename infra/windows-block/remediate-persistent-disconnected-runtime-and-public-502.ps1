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

$scriptCompatibilityVersion = "phase20-runtime-parity-backport-v1"

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

  if ($WorkerResult.afterClassification -eq "ready" -and $WorkerResult.remediated) {
    return "remediated"
  }

  if ($WorkerResult.afterClassification -eq "ready") {
    return "ready"
  }

  if (-not [string]::IsNullOrWhiteSpace([string]$WorkerResult.afterBlockerCode)) {
    return [string]$WorkerResult.afterBlockerCode
  }

  return [string]$WorkerResult.afterClassification
}

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\phases\19-deployed-windows-persistent-disconnected-runtime-and-forced-host-public-502-remediation-follow-up"
$upstreamRemediationScriptPath = Join-Path $PSScriptRoot "remediate-disconnected-runtime-and-forced-host-edge.ps1"
$temporaryRemediationJsonPath = Join-Path $phaseDir "19-TEMP-UPSTREAM-REMEDIATION.json"
$temporaryRemediationMarkdownPath = Join-Path $phaseDir "19-TEMP-UPSTREAM-REMEDIATION.md"

if (-not (Test-Path $upstreamRemediationScriptPath)) {
  throw "Missing Phase 19 upstream remediation dependency: $upstreamRemediationScriptPath"
}

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\data\persistent-disconnected-runtime-followup\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "19-FOLLOWUP-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "19-FOLLOWUP-SUMMARY.md"
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
  "-RecoveryWaitSeconds", $RuntimeReviveWaitSeconds,
  "-EdgeSettleSeconds", $ForcedHostSettleSeconds,
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

if ($PublicOwnerSettleSeconds -gt 0) {
  Start-Sleep -Seconds $PublicOwnerSettleSeconds
}

if (-not (Test-Path $temporaryRemediationJsonPath)) {
  throw "Phase 19 follow-up could not find upstream remediation output at $temporaryRemediationJsonPath"
}

$remediationResult = ConvertFrom-JsonSafe -Raw (Get-Content -Path $temporaryRemediationJsonPath -Raw)

if ($null -eq $remediationResult) {
  throw "Phase 19 follow-up could not parse upstream remediation output."
}

$stageOrder = @(
  "before_followup",
  "after_targeted_runtime_revive",
  "after_loopback_confirmation",
  "after_forced_host_recheck",
  "after_public_owner_recheck",
  "after_canary_stop"
)
$stageSnapshots = [ordered]@{
  before_followup = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "before_runtime_remediation"
  after_targeted_runtime_revive = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "after_targeted_reconnect"
  after_loopback_confirmation = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "after_loopback_probe"
  after_forced_host_recheck = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "after_forced_host_probe"
  after_public_owner_recheck = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "after_public_owner_probe"
  after_canary_stop = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "after_canary_stop"
}

$preFollowupReadyCount =
  if ($null -ne $remediationResult.preRemediationReadyCount) {
    [int]$remediationResult.preRemediationReadyCount
  } else {
    0
  }
$preFollowupTotalWorkers =
  if ($null -ne $remediationResult.preRemediationTotalWorkers) {
    [int]$remediationResult.preRemediationTotalWorkers
  } else {
    0
  }
$postFollowupReadyCount =
  if ($null -ne $remediationResult.postRemediationReadyCount) {
    [int]$remediationResult.postRemediationReadyCount
  } else {
    0
  }
$postFollowupTotalWorkers =
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
  if ([string]$remediationResult.verdict -eq "remediated_ready_for_smoke") {
    "followup_ready_for_smoke"
  } else {
    "hold_rollout"
  }
$summary =
  if ($verdict -eq "followup_ready_for_smoke") {
    "Persistent follow-up kept the Phase 18 remediation chain green, so the host is ready for the mandatory smoke rerun."
  } else {
    "Hold rollout: preFollowupReadyCount=$preFollowupReadyCount/$preFollowupTotalWorkers, postFollowupReadyCount=$postFollowupReadyCount/$postFollowupTotalWorkers, dominantRuntimeBlocker=$dominantRuntimeBlocker, firstFailingHop=$firstFailingHop."
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
  preFollowupReadyCount = $preFollowupReadyCount
  preFollowupTotalWorkers = $preFollowupTotalWorkers
  postFollowupReadyCount = $postFollowupReadyCount
  postFollowupTotalWorkers = $postFollowupTotalWorkers
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
$lines += "# Persistent Disconnected Runtime Follow-Up Summary"
$lines += ""
$lines += "- Generated: $($result.generatedAt)"
$lines += "- Script compatibility version: $($result.scriptCompatibilityVersion)"
$lines += "- Upstream compatibility version: $($result.upstreamScriptCompatibilityVersion)"
$lines += "- Verdict: $($result.verdict)"
$lines += "- Summary: $($result.summary)"
$lines += "- Canary worker: $($result.canaryWorkerId)"
$lines += "- Requested workers: $(@($result.requestedWorkerIds) -join ', ')"
$lines += "- Runtime revive wait seconds: $RuntimeReviveWaitSeconds"
$lines += "- ForcedHostSettleSeconds: $ForcedHostSettleSeconds"
$lines += "- PublicOwnerSettleSeconds: $PublicOwnerSettleSeconds"
$lines += ""
$lines += "## Follow-Up Result"
$lines += ""
$lines += "- preFollowupReadyCount: $($result.preFollowupReadyCount)/$($result.preFollowupTotalWorkers)"
$lines += "- postFollowupReadyCount: $($result.postFollowupReadyCount)/$($result.postFollowupTotalWorkers)"
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
  $lines += "| $($workerResult.workerId) | $($workerResult.beforeClassification) | $($workerResult.afterClassification) | $($workerResult.remediated) | $(Get-MarkdownWorkerNote -WorkerResult $workerResult) |"
}

$lines | Set-Content -Path $OutputMarkdownPath -Encoding UTF8

$jsonOutput
