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

$scriptCompatibilityVersion = "phase22-post-phase21-followup-v1"

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

function Get-HopStatusFromRemediationChain {
  param(
    [Parameter(Mandatory = $true)]
    [object]$RemediationResult,
    [Parameter(Mandatory = $true)]
    [string]$HopName,
    [string]$DirectPropertyName = ""
  )

  $current = $RemediationResult

  while ($null -ne $current) {
    if (
      -not [string]::IsNullOrWhiteSpace($DirectPropertyName) -and
      $current.PSObject.Properties.Match($DirectPropertyName).Count -gt 0 -and
      $null -ne $current.$DirectPropertyName
    ) {
      return $current.$DirectPropertyName
    }

    if (
      $current.PSObject.Properties.Match("hopResults").Count -gt 0 -and
      $null -ne $current.hopResults -and
      $current.hopResults.PSObject.Properties.Match($HopName).Count -gt 0
    ) {
      return $current.hopResults.$HopName
    }

    if (
      $current.PSObject.Properties.Match("remediation").Count -eq 0 -or
      $null -eq $current.remediation
    ) {
      break
    }

    $current = $current.remediation
  }

  return $null
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

function Format-HopStatusMarkdown {
  param([object]$HopStatus)

  if ($null -eq $HopStatus) {
    return "unknown"
  }

  return "passed=$($HopStatus.passed) healthz=$($HopStatus.healthzStatusCode) models=$($HopStatus.modelsStatusCode) chat=$($HopStatus.chatStatusCode)"
}

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\phases\22-deployed-windows-post-phase21-disconnected-runtime-and-windows-edge-forced-host-public-owner-502-remediation-follow-up"
$upstreamRemediationScriptPath = Join-Path $PSScriptRoot "remediate-disconnected-runtime-and-forced-host-public-502-post-parity.ps1"
$temporaryRemediationJsonPath = Join-Path $phaseDir "22-TEMP-UPSTREAM-REMEDIATION.json"
$temporaryRemediationMarkdownPath = Join-Path $phaseDir "22-TEMP-UPSTREAM-REMEDIATION.md"

if (-not (Test-Path $upstreamRemediationScriptPath)) {
  throw "Missing Phase 22 remediation dependency: $upstreamRemediationScriptPath"
}

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\data\post-phase21-disconnected-runtime-followup\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "22-FOLLOWUP-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "22-FOLLOWUP-SUMMARY.md"
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
  throw "Phase 22 follow-up could not find upstream remediation output at $temporaryRemediationJsonPath"
}

$remediationResult = ConvertFrom-JsonSafe -Raw (Get-Content -Path $temporaryRemediationJsonPath -Raw)

if ($null -eq $remediationResult) {
  throw "Phase 22 follow-up could not parse upstream remediation output."
}

$stageOrder = @(
  "before_post_phase21_followup",
  "after_targeted_runtime_revive",
  "after_loopback_recheck",
  "after_forced_host_recheck",
  "after_public_owner_recheck",
  "after_canary_stop"
)
$beforeStageSnapshot = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "before_post_parity_remediation"
$stageSnapshots = [ordered]@{
  before_post_phase21_followup = $beforeStageSnapshot
  after_targeted_runtime_revive = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "after_targeted_runtime_revive"
  after_loopback_recheck = Get-UpstreamStageSnapshot -RemediationResult $remediationResult -StageName "after_loopback_confirmation"
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
$loopbackStatus = Get-HopStatusFromRemediationChain `
  -RemediationResult $remediationResult `
  -HopName "loopback_api" `
  -DirectPropertyName "loopbackStatus"
$forcedHostStatus = Get-HopStatusFromRemediationChain `
  -RemediationResult $remediationResult `
  -HopName "windows_edge_forced_host" `
  -DirectPropertyName "forcedHostStatus"
$publicOwnerStatus = Get-HopStatusFromRemediationChain `
  -RemediationResult $remediationResult `
  -HopName "ubuntu_public_owner" `
  -DirectPropertyName "publicOwnerStatus"
$requestedWorkerIds =
  if ($null -ne $remediationResult.requestedWorkerIds) {
    @($remediationResult.requestedWorkerIds)
  } else {
    @($WorkerIds)
  }
$verdict =
  if ([string]$remediationResult.verdict -eq "post_parity_ready_for_smoke") {
    "post_phase21_ready_for_smoke"
  } else {
    "hold_rollout"
  }
$summary =
  if ($verdict -eq "post_phase21_ready_for_smoke") {
    "Post-Phase-21 follow-up stayed green end-to-end, so the host is ready for the mandatory smoke rerun."
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
$lines += "# Post-Phase-21 Disconnected Runtime Follow-Up Summary"
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
$lines += "## Post-Phase-21 Follow-Up"
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
$lines += "| Worker | Before | After | Recovered | Note |"
$lines += "|--------|--------|-------|-----------|------|"

foreach ($workerResult in @($result.workerResults)) {
  $lines += "| $($workerResult.workerId) | $($workerResult.beforeClassification) | $($workerResult.afterClassification) | $($workerResult.recovered) | $(Get-MarkdownWorkerNote -WorkerResult $workerResult) |"
}

$lines | Set-Content -Path $OutputMarkdownPath -Encoding UTF8

$jsonOutput
