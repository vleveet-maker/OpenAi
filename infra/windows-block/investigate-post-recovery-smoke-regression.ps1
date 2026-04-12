param(
  [string]$SessionBaseUrl = "http://127.0.0.1:8080",
  [string]$PublicApiBaseUrl = "http://77.66.186.75",
  [string]$InternalBaseUrl = "http://127.0.0.1:8081",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$InternalAdminToken = "local-internal-admin-token",
  [string]$HostControllerToken = "local-host-controller-token",
  [string]$CanaryWorkerId = "shared-6",
  [string[]]$WorkerIds = @(),
  [string]$ApiToken = "",
  [string]$SettingsPath = "",
  [int]$TimeoutSeconds = 180,
  [int]$PostRecoveryDelaySeconds = 15,
  [int]$PostCanaryDelaySeconds = 10,
  [int]$PostSmokeDelaySeconds = 15,
  [switch]$KeepCanaryRunningUntilFinalSnapshot,
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptCompatibilityVersion = "phase13-post-recovery-smoke-regression-v1"

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

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Method,
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [hashtable]$Headers = @{},
    [object]$Body = $null,
    [int]$RequestTimeoutSeconds = 30
  )

  $invokeParams = @{
    Method = $Method
    Uri = $Url
    Headers = $Headers
    ContentType = "application/json"
    TimeoutSec = $RequestTimeoutSeconds
  }

  if ($null -ne $Body) {
    $invokeParams.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
  }

  try {
    return Invoke-RestMethod @invokeParams
  } catch {
    $response = $_.Exception.Response

    if ($null -eq $response) {
      throw
    }

    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    $reader.Dispose()

    if ([string]::IsNullOrWhiteSpace($responseBody)) {
      throw
    }

    throw "HTTP request failed for ${Method} ${Url}: $responseBody"
  }
}

function Get-OrderedUniqueStrings {
  param([string[]]$Values)

  $seen = @{}
  $ordered = New-Object System.Collections.Generic.List[string]

  foreach ($value in @($Values)) {
    if ([string]::IsNullOrWhiteSpace($value)) {
      continue
    }

    $trimmed = $value.Trim()

    if (-not $seen.ContainsKey($trimmed)) {
      $seen[$trimmed] = $true
      $ordered.Add($trimmed)
    }
  }

  return $ordered.ToArray()
}

function Normalize-HostWorker {
  param([object]$Worker)

  return [pscustomobject][ordered]@{
    workerId = [string]$Worker.workerId
    displayName = [string]$Worker.displayName
    agentListening = [bool]$Worker.agentListening
    browserListening = [bool]$Worker.browserListening
    runtimeMode = $Worker.runtimeMode
    runtimeClass = $Worker.runtimeClass
    runtimeDesktopName = $Worker.runtimeDesktopName
    runtimeStatus = $Worker.runtimeStatus
    headless = $Worker.headless
    cdpAttached = $Worker.cdpAttached
    proxyServerConfigured = $Worker.proxyServerConfigured
  }
}

function Normalize-InternalWorker {
  param([object]$Worker)

  $statusValue = $null
  $statusDetail = $null
  $statusCheckedAt = $null
  $statusPayload = $Worker.status

  if ($null -ne $statusPayload) {
    if ($statusPayload -is [string]) {
      $statusValue = [string]$statusPayload
    } else {
      if ($statusPayload.PSObject.Properties.Match("status").Count -gt 0) {
        $statusValue = $statusPayload.status
      }

      if ($statusPayload.PSObject.Properties.Match("detail").Count -gt 0) {
        $statusDetail = $statusPayload.detail
      }

      if ($statusPayload.PSObject.Properties.Match("checkedAt").Count -gt 0) {
        $statusCheckedAt = $statusPayload.checkedAt
      }
    }
  }

  return [pscustomobject][ordered]@{
    workerId = [string]$Worker.workerId
    displayName = [string]$Worker.displayName
    status = [pscustomobject][ordered]@{
      status =
        if (-not [string]::IsNullOrWhiteSpace($statusValue)) {
          $statusValue
        } else {
          $Worker.runtimeStatus
        }
      detail = $statusDetail
      checkedAt = $statusCheckedAt
    }
    runtimeStatus = $Worker.runtimeStatus
    runtimeMode = $Worker.runtimeMode
    runtimeClass = $Worker.runtimeClass
    runtimeDesktopName = $Worker.runtimeDesktopName
    runtimeCapability = $Worker.runtimeCapability
    headless = $Worker.headless
    cdpAttached = $Worker.cdpAttached
    proxyServerConfigured = $Worker.proxyServerConfigured
    browserContextReady = $Worker.browserContextReady
    stabilityGateStatus = $Worker.stabilityGateStatus
    stabilityPassCount = $Worker.stabilityPassCount
    stabilityTargetPasses = $Worker.stabilityTargetPasses
    lastSeenAt = $Worker.lastSeenAt
    lastBootstrapAt = $Worker.lastBootstrapAt
    lastBootstrapFailureCode = $Worker.lastBootstrapFailureCode
    lastBootstrapStep = $Worker.lastBootstrapStep
    lastBootstrapUsability = $Worker.lastBootstrapUsability
    lastRelayAt = $Worker.lastRelayAt
    lastRelayFailureCode = $Worker.lastRelayFailureCode
    lastValidationAt = $Worker.lastValidationAt
    lastValidationResult = $Worker.lastValidationResult
  }
}

function New-InternalWorkersSummary {
  param([object[]]$Workers)

  $workerList = @($Workers)

  return [pscustomobject][ordered]@{
    totalWorkers = @($workerList).Count
    readyWorkers = @($workerList | Where-Object { $_.status.status -eq "ready" }).Count
    startingWorkers = @($workerList | Where-Object { $_.status.status -eq "starting" }).Count
    reauthRequiredWorkers = @($workerList | Where-Object { $_.status.status -eq "reauth_required" }).Count
    disconnectedWorkers = @($workerList | Where-Object { $_.status.status -eq "disconnected" }).Count
    readyWorkerIds = @($workerList | Where-Object { $_.status.status -eq "ready" } | ForEach-Object { $_.workerId })
    workers = $workerList
  }
}

function New-ObservabilitySummary {
  param([object]$Payload)

  return [pscustomobject][ordered]@{
    checkedAt = $Payload.checkedAt
    totalEvents = $Payload.totalEvents
    totalWorkers = $Payload.totalWorkers
    workerStatusCounts = $Payload.workerStatusCounts
    severityCounts = $Payload.severityCounts
    recentFailureCount = @($Payload.recentFailures).Count
    recentRestartCount = @($Payload.recentRestarts).Count
    lastEventAt = $Payload.lastEventAt
  }
}

function Get-RegressionSnapshot {
  $internalBase = $InternalBaseUrl.TrimEnd("/")
  $hostControllerBase = $HostControllerBaseUrl.TrimEnd("/")

  $hostHealth = Invoke-JsonRequest `
    -Method "GET" `
    -Url "$hostControllerBase/health" `
    -Headers $hostControllerHeaders `
    -RequestTimeoutSeconds $TimeoutSeconds
  $poolPayload = Invoke-JsonRequest `
    -Method "GET" `
    -Url "$internalBase/internal/host-pool" `
    -Headers $internalHeaders `
    -RequestTimeoutSeconds $TimeoutSeconds
  $workersPayload = Invoke-JsonRequest `
    -Method "GET" `
    -Url "$internalBase/internal/workers" `
    -Headers $internalHeaders `
    -RequestTimeoutSeconds $TimeoutSeconds
  $observabilityPayload = Invoke-JsonRequest `
    -Method "GET" `
    -Url "$internalBase/internal/observability/summary" `
    -Headers $internalHeaders `
    -RequestTimeoutSeconds $TimeoutSeconds

  $hostWorkers = @($hostHealth.workers | ForEach-Object { Normalize-HostWorker -Worker $_ })
  $internalWorkers = @($workersPayload.workers | ForEach-Object { Normalize-InternalWorker -Worker $_ })

  return [pscustomobject][ordered]@{
    capturedAt = (Get-Date).ToString("o")
    hostController = [pscustomobject][ordered]@{
      status = $hostHealth.status
      proxyListening = [bool]$hostHealth.proxyListening
      proxyServerUrl = $hostHealth.proxyServerUrl
      poolStatus = $hostHealth.poolStatus
      workers = $hostWorkers
    }
    internal = [pscustomobject][ordered]@{
      pool = [pscustomobject][ordered]@{
        status = $poolPayload.pool.status
        controllerReachable = [bool]$poolPayload.pool.controllerReachable
        proxyListening = [bool]$poolPayload.pool.proxyListening
        routineRuntimeMode = $poolPayload.pool.routineRuntimeMode
        routineRuntimeClass = $poolPayload.pool.routineRuntimeClass
        routineBrowserWindowMode = $poolPayload.pool.routineBrowserWindowMode
        lastAction = $poolPayload.pool.lastAction
        lastError = $poolPayload.pool.lastError
        updatedAt = $poolPayload.pool.updatedAt
      }
      workers = New-InternalWorkersSummary -Workers $internalWorkers
      observability = New-ObservabilitySummary -Payload $observabilityPayload
    }
  }
}

function Get-WorkerMap {
  param([object[]]$Workers)

  $map = @{}

  foreach ($worker in @($Workers)) {
    if ($null -eq $worker -or [string]::IsNullOrWhiteSpace($worker.workerId)) {
      continue
    }

    $map[$worker.workerId] = $worker
  }

  return $map
}

function Get-WorkerClassification {
  param(
    [object]$InternalWorker,
    [object]$HostWorker
  )

  $status = $null

  if ($null -ne $InternalWorker -and $null -ne $InternalWorker.status) {
    $status = $InternalWorker.status.status
  }

  if ($status -eq "ready") {
    return "ready"
  }

  if ($status -eq "reauth_required") {
    return "reauth_required"
  }

  if ($null -ne $InternalWorker) {
    if ($InternalWorker.lastBootstrapFailureCode -eq "bootstrap_auth_required") {
      return "reauth_required"
    }

    if (
      (($InternalWorker.runtimeCapability) -and $InternalWorker.runtimeCapability -ne "unreachable") -or
      (($InternalWorker.runtimeStatus) -and $InternalWorker.runtimeStatus -ne "disconnected") -or
      $InternalWorker.browserContextReady -eq $true
    ) {
      return "reachable_but_unusable"
    }
  }

  if ($null -ne $HostWorker -and ($HostWorker.agentListening -or $HostWorker.browserListening)) {
    return "reachable_but_unusable"
  }

  return "disconnected"
}

function Get-SnapshotWorkerClassification {
  param(
    [object]$Snapshot,
    [string]$WorkerId
  )

  if ($null -eq $Snapshot) {
    return "missing"
  }

  $hostMap = Get-WorkerMap -Workers $Snapshot.hostController.workers
  $internalMap = Get-WorkerMap -Workers $Snapshot.internal.workers.workers
  $hostWorker =
    if ($hostMap.ContainsKey($WorkerId)) {
      $hostMap[$WorkerId]
    } else {
      $null
    }
  $internalWorker =
    if ($internalMap.ContainsKey($WorkerId)) {
      $internalMap[$WorkerId]
    } else {
      $null
    }

  return Get-WorkerClassification -InternalWorker $internalWorker -HostWorker $hostWorker
}

function New-StageCounts {
  param([object]$Snapshot)

  if ($null -eq $Snapshot) {
    return [pscustomobject][ordered]@{
      readyWorkers = $null
      totalWorkers = $null
      reauthRequiredWorkers = $null
      disconnectedWorkers = $null
      poolStatus = $null
    }
  }

  return [pscustomobject][ordered]@{
    readyWorkers = $Snapshot.internal.workers.readyWorkers
    totalWorkers = $Snapshot.internal.workers.totalWorkers
    reauthRequiredWorkers = $Snapshot.internal.workers.reauthRequiredWorkers
    disconnectedWorkers = $Snapshot.internal.workers.disconnectedWorkers
    poolStatus = $Snapshot.internal.pool.status
  }
}

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\\phases\\13-deployed-windows-post-recovery-smoke-regression-investigation-and-stabilization"
$recoveryPhaseDir = Join-Path $repoRoot ".planning\\phases\\12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization"
$smokePhaseDir = Join-Path $repoRoot ".planning\\phases\\11-rollout-smoke-confidence"
$internalHeaders = @{
  "x-internal-admin-token" = $InternalAdminToken
}
$hostControllerHeaders = @{
  "x-host-controller-token" = $HostControllerToken
}
$recoveryScriptPath = Join-Path $PSScriptRoot "recover-browser-block-readiness.ps1"
$smokeScriptPath = Join-Path $PSScriptRoot "test-rollout-smoke.ps1"

if (-not (Test-Path $recoveryScriptPath)) {
  throw "Missing post-recovery regression dependency: $recoveryScriptPath"
}

if (-not (Test-Path $smokeScriptPath)) {
  throw "Missing post-recovery regression dependency: $smokeScriptPath"
}

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\\data\\post-recovery-regression\\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "13-REGRESSION-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "13-REGRESSION-SUMMARY.md"
}

$requestedWorkerIds =
  if (@($WorkerIds).Count -gt 0) {
    Get-OrderedUniqueStrings -Values $WorkerIds
  } else {
    @()
  }

$stageSnapshots = [ordered]@{
  before_recovery = Get-RegressionSnapshot
  after_recovery = $null
  before_smoke = $null
  after_canary_start = $null
  after_canary_stop = $null
  after_smoke = $null
  after_settle = $null
}

$recoveryArgs = @(
  "-SessionBaseUrl",
  $SessionBaseUrl,
  "-PublicApiBaseUrl",
  $PublicApiBaseUrl,
  "-InternalBaseUrl",
  $InternalBaseUrl,
  "-HostControllerBaseUrl",
  $HostControllerBaseUrl,
  "-InternalAdminToken",
  $InternalAdminToken,
  "-HostControllerToken",
  $HostControllerToken,
  "-CanaryWorkerId",
  $CanaryWorkerId,
  "-TimeoutSeconds",
  $TimeoutSeconds,
  "-LatestJsonPath",
  (Join-Path $repoRoot "infra\\data\\readiness-recovery\\latest.json"),
  "-OutputJsonPath",
  (Join-Path $recoveryPhaseDir "12-RECOVERY-SUMMARY.json"),
  "-OutputMarkdownPath",
  (Join-Path $recoveryPhaseDir "12-RECOVERY-SUMMARY.md")
)

if (@($requestedWorkerIds).Count -gt 0) {
  $recoveryArgs += "-WorkerIds"
  $recoveryArgs += @($requestedWorkerIds)
}

if (-not [string]::IsNullOrWhiteSpace($ApiToken)) {
  $recoveryArgs += @("-ApiToken", $ApiToken)
}

if (-not [string]::IsNullOrWhiteSpace($SettingsPath)) {
  $recoveryArgs += @("-SettingsPath", $SettingsPath)
}

$recoveryResult = (& $recoveryScriptPath @recoveryArgs) | ConvertFrom-Json

if ($PostRecoveryDelaySeconds -gt 0) {
  Start-Sleep -Seconds $PostRecoveryDelaySeconds
}

$stageSnapshots.after_recovery = Get-RegressionSnapshot

$smokeArgs = @(
  "-PublicBaseUrl",
  $PublicApiBaseUrl,
  "-InternalBaseUrl",
  $InternalBaseUrl,
  "-HostControllerBaseUrl",
  $HostControllerBaseUrl,
  "-InternalAdminToken",
  $InternalAdminToken,
  "-HostControllerToken",
  $HostControllerToken,
  "-CanaryWorkerId",
  $CanaryWorkerId,
  "-TimeoutSeconds",
  $TimeoutSeconds,
  "-PostCanaryDelaySeconds",
  $PostCanaryDelaySeconds,
  "-PostSmokeDelaySeconds",
  $PostSmokeDelaySeconds,
  "-LatestJsonPath",
  (Join-Path $repoRoot "infra\\data\\rollout-smoke\\latest.json"),
  "-OutputJsonPath",
  (Join-Path $smokePhaseDir "11-SMOKE-SUMMARY.json"),
  "-OutputMarkdownPath",
  (Join-Path $smokePhaseDir "11-SMOKE-SUMMARY.md")
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

$smokeResult = (& $smokeScriptPath @smokeArgs) | ConvertFrom-Json

$stageSnapshots.before_smoke = $smokeResult.stageSnapshots.before_smoke
$stageSnapshots.after_canary_start = $smokeResult.stageSnapshots.after_canary_start
$stageSnapshots.after_canary_stop = $smokeResult.stageSnapshots.after_canary_stop
$stageSnapshots.after_smoke = $smokeResult.stageSnapshots.after_smoke
$stageSnapshots.after_settle = $smokeResult.stageSnapshots.after_settle

$stageOrder = @("before_recovery", "after_recovery") + @($smokeResult.stageOrder)
$truthWorkerIds = Get-OrderedUniqueStrings -Values @(
  $requestedWorkerIds
  @($stageOrder | ForEach-Object {
    $stageName = $_
    $snapshot = $stageSnapshots[$stageName]

    if ($null -eq $snapshot) {
      @()
    } else {
      @($snapshot.internal.workers.workers | ForEach-Object { $_.workerId }) +
      @($snapshot.hostController.workers | ForEach-Object { $_.workerId })
    }
  })
)

$perWorkerDeltas = @()
$firstRegressionStage = $null
$afterRecoveryReadyWorkerIds = @($stageSnapshots.after_recovery.internal.workers.readyWorkerIds)

foreach ($workerId in $truthWorkerIds) {
  $classifications = [ordered]@{}
  $transitions = @()
  $workerFirstRegressionStage = $null

  foreach ($stageName in $stageOrder) {
    $classifications[$stageName] = Get-SnapshotWorkerClassification -Snapshot $stageSnapshots[$stageName] -WorkerId $workerId
  }

  for ($index = 1; $index -lt $stageOrder.Count; $index += 1) {
    $fromStage = $stageOrder[$index - 1]
    $toStage = $stageOrder[$index]
    $fromClassification = $classifications[$fromStage]
    $toClassification = $classifications[$toStage]

    $transitions += [pscustomobject][ordered]@{
      fromStage = $fromStage
      toStage = $toStage
      fromClassification = $fromClassification
      toClassification = $toClassification
      changed = $fromClassification -ne $toClassification
    }
  }

  foreach ($stageName in @($stageOrder | Select-Object -Skip 2)) {
    if (
      $workerId -in $afterRecoveryReadyWorkerIds -and
      $classifications[$stageName] -ne "ready"
    ) {
      $workerFirstRegressionStage = $stageName
      break
    }
  }

  if ($null -eq $firstRegressionStage -and $workerFirstRegressionStage) {
    $firstRegressionStage = $workerFirstRegressionStage
  }

  $perWorkerDeltas += [pscustomobject][ordered]@{
    workerId = $workerId
    afterRecoveryClassification = $classifications["after_recovery"]
    finalClassification = $classifications["after_settle"]
    firstRegressionStage = $workerFirstRegressionStage
    classifications = [pscustomobject]$classifications
    transitions = $transitions
  }
}

$stageCounts = [pscustomobject][ordered]@{
  before_recovery = New-StageCounts -Snapshot $stageSnapshots.before_recovery
  after_recovery = New-StageCounts -Snapshot $stageSnapshots.after_recovery
  before_smoke = New-StageCounts -Snapshot $stageSnapshots.before_smoke
  after_canary_start = New-StageCounts -Snapshot $stageSnapshots.after_canary_start
  after_canary_stop = New-StageCounts -Snapshot $stageSnapshots.after_canary_stop
  after_smoke = New-StageCounts -Snapshot $stageSnapshots.after_smoke
  after_settle = New-StageCounts -Snapshot $stageSnapshots.after_settle
}

$recoveredReadyCount = $stageCounts.after_recovery.readyWorkers
$finalSmokeReadyCount = $stageCounts.after_settle.readyWorkers
$finalSmokeTotalWorkers = $stageCounts.after_settle.totalWorkers
$stableThroughSmoke =
  $null -eq $firstRegressionStage -and
  $smokeResult.verdict -eq "ready_for_household_use"
$verdict =
  if ($stableThroughSmoke) {
    "stabilized_through_smoke"
  } else {
    "hold_rollout"
  }
$summary =
  if ($verdict -eq "stabilized_through_smoke") {
    "Recovered pool stayed healthy through smoke; no ready worker regressed after recovery and the public canary on $CanaryWorkerId remained green."
  } else {
    "Hold rollout: recovered ready count was $recoveredReadyCount, final smoke ready count was $finalSmokeReadyCount/$finalSmokeTotalWorkers, and first regression stage is $firstRegressionStage."
  }

$result = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  sessionBaseUrl = $SessionBaseUrl.TrimEnd("/")
  publicBaseUrl = $PublicApiBaseUrl.TrimEnd("/")
  internalBaseUrl = $InternalBaseUrl.TrimEnd("/")
  hostControllerBaseUrl = $HostControllerBaseUrl.TrimEnd("/")
  canaryWorkerId = $CanaryWorkerId
  requestedWorkerIds = @($requestedWorkerIds)
  keepCanaryRunningUntilFinalSnapshot = [bool]$KeepCanaryRunningUntilFinalSnapshot
  delays = [pscustomobject][ordered]@{
    postRecoveryDelaySeconds = $PostRecoveryDelaySeconds
    postCanaryDelaySeconds = $PostCanaryDelaySeconds
    postSmokeDelaySeconds = $PostSmokeDelaySeconds
  }
  verdict = $verdict
  summary = $summary
  recoveredReadyCount = $recoveredReadyCount
  finalSmokeReadyCount = $finalSmokeReadyCount
  firstRegressionStage = $firstRegressionStage
  stageOrder = @($stageOrder)
  stageCounts = $stageCounts
  stageSnapshots = [pscustomobject]$stageSnapshots
  recovery = $recoveryResult
  smoke = $smokeResult
  perWorkerDeltas = $perWorkerDeltas
}

$jsonOutput = $result | ConvertTo-Json -Depth 12

Ensure-ParentDirectory -Path $LatestJsonPath
$jsonOutput | Set-Content -Path $LatestJsonPath -Encoding UTF8

if (-not [string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  Ensure-ParentDirectory -Path $OutputJsonPath
  $jsonOutput | Set-Content -Path $OutputJsonPath -Encoding UTF8
}

if (-not [string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  Ensure-ParentDirectory -Path $OutputMarkdownPath

  $lines = @()
  $lines += "# Post-Recovery Smoke Regression Summary"
  $lines += ""
  $lines += "- Generated: $($result.generatedAt)"
  $lines += "- Script compatibility version: $($result.scriptCompatibilityVersion)"
  $lines += "- Verdict: $($result.verdict)"
  $lines += "- Summary: $($result.summary)"
  $lines += "- Canary worker: $($result.canaryWorkerId)"
  $lines += "- Requested workers: $(if (@($result.requestedWorkerIds).Count -gt 0) { @($result.requestedWorkerIds) -join ', ' } else { 'auto-detected from live host inventory' })"
  $lines += "- Keep canary running until final snapshot: $($result.keepCanaryRunningUntilFinalSnapshot)"
  $lines += "- Stage order: $(@($result.stageOrder) -join ', ')"
  $lines += "- First regression stage: $(if ($result.firstRegressionStage) { $result.firstRegressionStage } else { 'none' })"
  $lines += "- Recovered ready count: $($result.recoveredReadyCount)"
  $lines += "- Final smoke ready count: $($result.finalSmokeReadyCount)"
  $lines += ""
  $lines += "## Stage Counts"
  $lines += ""
  $lines += "| Stage | Ready | Reauth | Disconnected | Pool |"
  $lines += "|-------|-------|--------|--------------|------|"

  foreach ($stageName in @("before_recovery", "after_recovery", "before_smoke", "after_canary_start", "after_canary_stop", "after_smoke", "after_settle")) {
    $counts = $result.stageCounts.$stageName

    if ($null -eq $counts.readyWorkers) {
      $lines += "| $stageName | n/a | n/a | n/a | n/a |"
      continue
    }

    $lines += "| $stageName | $($counts.readyWorkers)/$($counts.totalWorkers) | $($counts.reauthRequiredWorkers) | $($counts.disconnectedWorkers) | $($counts.poolStatus) |"
  }

  $lines += ""
  $lines += "## Public Canary"
  $lines += ""
  $lines += "- healthz: $($result.smoke.publicCanary.healthz.ok) (status=$($result.smoke.publicCanary.healthz.statusCode))"
  $lines += "- v1/models: $($result.smoke.publicCanary.models.ok) (status=$($result.smoke.publicCanary.models.statusCode))"
  $lines += "- v1/chat/completions: $($result.smoke.publicCanary.chat.ok) (status=$($result.smoke.publicCanary.chat.statusCode), worker=$($result.smoke.publicCanary.chat.workerId), reply=$($result.smoke.publicCanary.chat.assistantReplyText))"
  $lines += "- Smoke stop strategy: `$($result.smoke.probeLifecycle.stopStrategy)`"
  $lines += ""
  $lines += "## Worker Regression"
  $lines += ""
  $lines += "| Worker | After recovery | Final | First regression stage |"
  $lines += "|--------|----------------|-------|------------------------|"

  foreach ($workerDelta in $perWorkerDeltas) {
    $lines += "| $($workerDelta.workerId) | $($workerDelta.afterRecoveryClassification) | $($workerDelta.finalClassification) | $(if ($workerDelta.firstRegressionStage) { $workerDelta.firstRegressionStage } else { 'none' }) |"
  }

  $lines | Set-Content -Path $OutputMarkdownPath -Encoding UTF8
}

$jsonOutput
