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
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptCompatibilityVersion = "phase20-runtime-parity-backport-v1"

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

function Get-ArrayCount {
  param([object[]]$Values)

  return @($Values).Count
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

function Test-ProbeStepSuccess {
  param([object]$Probe)

  return (
    $null -ne $Probe -and
    $Probe.success -eq $true -and
    $null -ne $Probe.statusCode -and
    [int]$Probe.statusCode -ge 200 -and
    [int]$Probe.statusCode -lt 400
  )
}

function Get-ProbeChatReplyText {
  param([object]$ProbePayload)

  if ($null -eq $ProbePayload -or $null -eq $ProbePayload.chatCompletions) {
    return $null
  }

  $chatPayload = ConvertFrom-JsonSafe -Raw $ProbePayload.chatCompletions.body

  if (
    $null -eq $chatPayload -or
    $null -eq $chatPayload.choices -or
    @($chatPayload.choices).Count -eq 0 -or
    $null -eq $chatPayload.choices[0].message
  ) {
    return $null
  }

  return [string]$chatPayload.choices[0].message.content
}

function Get-ProbeModel {
  param([object]$ProbePayload)

  if ($null -eq $ProbePayload -or $null -eq $ProbePayload.chatCompletions) {
    return $null
  }

  $chatPayload = ConvertFrom-JsonSafe -Raw $ProbePayload.chatCompletions.body

  if ($null -eq $chatPayload) {
    return $null
  }

  return $chatPayload.model
}

function Get-ProbeWorkerId {
  param(
    [object]$ProbePayload,
    [string]$FallbackWorkerId
  )

  if ($null -eq $ProbePayload -or $null -eq $ProbePayload.chatCompletions) {
    return $FallbackWorkerId
  }

  $chatPayload = ConvertFrom-JsonSafe -Raw $ProbePayload.chatCompletions.body

  if ($null -eq $chatPayload -or [string]::IsNullOrWhiteSpace($chatPayload.worker_id)) {
    return $FallbackWorkerId
  }

  return [string]$chatPayload.worker_id
}

function New-ProbeStepFailure {
  param(
    [string]$RequestUrl,
    [string]$ErrorKind,
    [string]$ErrorMessage
  )

  return [pscustomobject][ordered]@{
    success = $false
    statusCode = $null
    body = ""
    headers = @()
    error = $ErrorMessage
    errorKind = $ErrorKind
    requestUrl = $RequestUrl
  }
}

function Convert-PublicProbeResult {
  param(
    [Parameter(Mandatory = $true)]
    [object]$ProbePayload,
    [Parameter(Mandatory = $true)]
    [string]$FallbackWorkerId
  )

  $replyText = Get-ProbeChatReplyText -ProbePayload $ProbePayload

  return [pscustomobject][ordered]@{
    checkedAt =
      if ($ProbePayload.checkedAt) {
        $ProbePayload.checkedAt
      } else {
        (Get-Date).ToString("o")
      }
    baseUrl = $ProbePayload.baseUrl
    healthz = [pscustomobject][ordered]@{
      ok = Test-ProbeStepSuccess -Probe $ProbePayload.healthz
      statusCode = $ProbePayload.healthz.statusCode
      errorKind = $ProbePayload.healthz.errorKind
      requestUrl = $ProbePayload.healthz.requestUrl
    }
    models = [pscustomobject][ordered]@{
      ok = Test-ProbeStepSuccess -Probe $ProbePayload.models
      statusCode = $ProbePayload.models.statusCode
      errorKind = $ProbePayload.models.errorKind
      requestUrl = $ProbePayload.models.requestUrl
    }
    chat = [pscustomobject][ordered]@{
      ok =
        (Test-ProbeStepSuccess -Probe $ProbePayload.chatCompletions) -and
        $replyText -eq "probe-ok"
      statusCode = $ProbePayload.chatCompletions.statusCode
      errorKind = $ProbePayload.chatCompletions.errorKind
      requestUrl = $ProbePayload.chatCompletions.requestUrl
      assistantReplyText = $replyText
      workerId = Get-ProbeWorkerId -ProbePayload $ProbePayload -FallbackWorkerId $FallbackWorkerId
      model = Get-ProbeModel -ProbePayload $ProbePayload
    }
  }
}

function Test-PublicCanarySuccess {
  param([object]$Probe)

  return (
    $null -ne $Probe -and
    $Probe.healthz.ok -eq $true -and
    $Probe.models.ok -eq $true -and
    $Probe.chat.ok -eq $true
  )
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
    reauthRequiredWorkerIds = @($workerList | Where-Object { $_.status.status -eq "reauth_required" } | ForEach-Object { $_.workerId })
    disconnectedWorkerIds = @($workerList | Where-Object { $_.status.status -eq "disconnected" } | ForEach-Object { $_.workerId })
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

function Get-RecoverySnapshot {
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

function Test-RelayProbeSuccess {
  param([object]$Probe)

  return (
    $null -ne $Probe -and
    $Probe.outcome -eq "relay_complete" -and
    $Probe.proofUsability -eq "usable" -and
    $Probe.bootstrapResult -eq "ready" -and
    $Probe.relayResult -eq "complete" -and
    $Probe.assistantReplyText -eq "smoke-ok"
  )
}

function Invoke-PublicCanaryProbe {
  $publicBase = $PublicApiBaseUrl.TrimEnd("/")
  $args = @(
    "-BaseUrl",
    $publicBase,
    "-WorkerId",
    $CanaryWorkerId,
    "-HostControllerBaseUrl",
    $HostControllerBaseUrl,
    "-HostControllerToken",
    $HostControllerToken,
    "-IncludeChatProbe"
  )

  if (-not [string]::IsNullOrWhiteSpace($ApiToken)) {
    $args += @("-ApiToken", $ApiToken)
  }

  if (-not [string]::IsNullOrWhiteSpace($SettingsPath)) {
    $args += @("-SettingsPath", $SettingsPath)
  }

  try {
    $probePayload = (& $probeScriptPath @args) | ConvertFrom-Json
  } catch {
    $errorMessage = "$_"
    $probePayload = [pscustomobject][ordered]@{
      checkedAt = (Get-Date).ToString("o")
      baseUrl = $publicBase
      healthz = New-ProbeStepFailure -RequestUrl "$publicBase/healthz" -ErrorKind "probe_invocation_failed" -ErrorMessage $errorMessage
      models = New-ProbeStepFailure -RequestUrl "$publicBase/v1/models" -ErrorKind "probe_invocation_failed" -ErrorMessage $errorMessage
      chatCompletions = New-ProbeStepFailure -RequestUrl "$publicBase/v1/chat/completions" -ErrorKind "probe_invocation_failed" -ErrorMessage $errorMessage
    }
  }

  return Convert-PublicProbeResult -ProbePayload $probePayload -FallbackWorkerId $CanaryWorkerId
}

function Stop-RecoveryWorker {
  param([string]$WorkerId)

  try {
    $null = Invoke-JsonRequest `
      -Method "POST" `
      -Url "$($HostControllerBaseUrl.TrimEnd('/'))/workers/$WorkerId/stop" `
      -Headers $hostControllerHeaders `
      -Body @{} `
      -RequestTimeoutSeconds $TimeoutSeconds

    return [pscustomobject][ordered]@{
      requested = $true
      ok = $true
      detail = $null
    }
  } catch {
    return [pscustomobject][ordered]@{
      requested = $true
      ok = $false
      detail = "$_"
    }
  }
}

function Get-WorkerBlockerCode {
  param(
    [object]$WorkerResult,
    [object]$InternalWorker,
    [object]$HostWorker,
    [string]$Classification
  )

  if ($Classification -eq "ready") {
    return $null
  }

  if ($null -ne $WorkerResult) {
    if ($WorkerResult.attemptStatus -eq "skipped_after_abort" -and $WorkerResult.abortReason) {
      return [string]$WorkerResult.abortReason
    }

    if ($WorkerResult.attemptStatus -eq "canary_public_regression") {
      return "public_canary_failed"
    }

    if ($null -ne $WorkerResult.relayProbe) {
      if ($WorkerResult.relayProbe.failureCode) {
        return [string]$WorkerResult.relayProbe.failureCode
      }

      if ($WorkerResult.relayProbe.relayFailureCode) {
        return [string]$WorkerResult.relayProbe.relayFailureCode
      }

      if ($WorkerResult.relayProbe.bootstrapFailureCode) {
        return [string]$WorkerResult.relayProbe.bootstrapFailureCode
      }
    }
  }

  if ($Classification -eq "reauth_required") {
    return "reauth_required"
  }

  if ($null -ne $InternalWorker) {
    if ($InternalWorker.lastBootstrapFailureCode) {
      return [string]$InternalWorker.lastBootstrapFailureCode
    }

    if ($InternalWorker.lastRelayFailureCode) {
      return [string]$InternalWorker.lastRelayFailureCode
    }

    if ($InternalWorker.runtimeCapability -and $InternalWorker.runtimeCapability -ne "usable") {
      return [string]$InternalWorker.runtimeCapability
    }

    if ($InternalWorker.runtimeStatus) {
      return [string]$InternalWorker.runtimeStatus
    }
  }

  if ($null -ne $HostWorker) {
    if ($HostWorker.agentListening -and -not $HostWorker.browserListening) {
      return "browser_not_listening"
    }

    if (-not $HostWorker.agentListening -and $HostWorker.browserListening) {
      return "agent_not_listening"
    }
  }

  return $Classification
}

function Get-PublicCanaryLabel {
  param([object]$Probe)

  if ($null -eq $Probe) {
    return "not_run"
  }

  if (Test-PublicCanarySuccess -Probe $Probe) {
    return "pass"
  }

  return "fail"
}

function Get-PublicCanaryDetail {
  param([object]$Probe)

  if ($null -eq $Probe) {
    return "not run"
  }

  return "healthz=$($Probe.healthz.statusCode) models=$($Probe.models.statusCode) chat=$($Probe.chat.statusCode) reply=$($Probe.chat.assistantReplyText)"
}

function Get-WorkerMarkdownNote {
  param([object]$WorkerResult)

  if ($null -eq $WorkerResult) {
    return ""
  }

  if ($WorkerResult.afterClassification -eq "ready") {
    if ($WorkerResult.recovered) {
      return "recovered"
    }

    return "ready"
  }

  return $WorkerResult.blockerCode
}

$repoRoot = Resolve-RepoRoot
$internalHeaders = @{
  "x-internal-admin-token" = $InternalAdminToken
}
$hostControllerHeaders = @{
  "x-host-controller-token" = $HostControllerToken
}
$relayScriptPath = Join-Path $repoRoot "infra\\host-worker\\test-host-worker-relay.ps1"
$probeScriptPath = Join-Path $PSScriptRoot "probe-public-api.ps1"
$phaseDir = Join-Path $repoRoot ".planning\\phases\\12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization"

if (-not (Test-Path $relayScriptPath)) {
  throw "Missing readiness recovery dependency: $relayScriptPath"
}

if (-not (Test-Path $probeScriptPath)) {
  throw "Missing readiness recovery dependency: $probeScriptPath"
}

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\\data\\readiness-recovery\\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "12-RECOVERY-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "12-RECOVERY-SUMMARY.md"
}

$beforeSnapshot = Get-RecoverySnapshot
$observedWorkerIdsBefore = @($beforeSnapshot.hostController.workers | ForEach-Object { $_.workerId })
$requestedWorkerIds =
  if ((Get-ArrayCount -Values $WorkerIds) -gt 0) {
    Get-OrderedUniqueStrings -Values $WorkerIds
  } else {
    Get-OrderedUniqueStrings -Values $observedWorkerIdsBefore
  }
$orderedWorkerIds = Get-OrderedUniqueStrings -Values (@($CanaryWorkerId) + @($requestedWorkerIds | Where-Object { $_ -ne $CanaryWorkerId }))

$workerAttempts = @()
$publicCanaryGate = $null
$abortReason = $null

foreach ($workerId in $orderedWorkerIds) {
  if ($abortReason) {
    $workerAttempts += [pscustomobject][ordered]@{
      workerId = $workerId
      attemptStatus = "skipped_after_abort"
      abortReason = $abortReason
      relayProbe = $null
      publicCanaryGate = $null
      stopResult = $null
      stopIssuedOnFailure = $false
    }
    continue
  }

  Write-Host "[readiness-recovery] probing $workerId ..."

  $relayProbe = $null
  $stopResult = $null
  $attemptStatus = "relay_failed"
  $stopIssuedOnFailure = $false

  try {
    $relayProbe = & $relayScriptPath `
      -WorkerId $workerId `
      -PublicBaseUrl $SessionBaseUrl `
      -InternalBaseUrl $InternalBaseUrl `
      -InternalAdminToken $InternalAdminToken `
      -HostControllerBaseUrl $HostControllerBaseUrl `
      -HostControllerToken $HostControllerToken `
      -TimeoutSeconds $TimeoutSeconds `
      -KeepWorkerRunning `
      -ReturnJson
  } catch {
    $relayProbe = [pscustomobject][ordered]@{
      scriptCompatibilityVersion = $scriptCompatibilityVersion
      workerId = $workerId
      runtimeMode = $null
      runtimeClass = $null
      runtimeCapability = "unreachable"
      proofUsability = "unusable"
      stabilityGateStatus = "unstable"
      stabilityPassCount = 0
      bootstrapResult = "unknown"
      bootstrapFailureCode = "probe_invocation_failed"
      conversationMode = "unknown"
      expectedConversationMode = "Temporary Chat"
      conversationModeMatchesExpectation = $false
      modelLabel = $null
      expectedModelLabel = "GPT-5.4 Thinking"
      modelMatchesExpectation = $false
      relayResult = $null
      relayFailureCode = "probe_invocation_failed"
      assistantReplyText = $null
      proofPath = "CompactCorner -> Temporary Chat -> GPT-5.4 Thinking -> relay"
      sessionId = $null
      outcome = "probe_invocation_failed"
      failureCode = "probe_invocation_failed"
      detail = "$_"
      relaySucceeded = $false
      classification = "disconnected"
      errorKind = "probe_invocation_failed"
      keepWorkerRunningRequested = $true
    }
  }

  if (Test-RelayProbeSuccess -Probe $relayProbe) {
    $attemptStatus = "relay_complete"
  } else {
    $stopIssuedOnFailure = $true
    $stopResult = Stop-RecoveryWorker -WorkerId $workerId

    if ($workerId -eq $CanaryWorkerId) {
      $abortReason = "canary_probe_failed"
    }
  }

  if ($attemptStatus -eq "relay_complete" -and $workerId -eq $CanaryWorkerId) {
    $publicCanaryGate = Invoke-PublicCanaryProbe

    if (-not (Test-PublicCanarySuccess -Probe $publicCanaryGate)) {
      $attemptStatus = "canary_public_regression"
      $abortReason = "canary_public_regression"
      $stopIssuedOnFailure = $true
      $stopResult = Stop-RecoveryWorker -WorkerId $workerId
    }
  }

  $workerAttempts += [pscustomobject][ordered]@{
    workerId = $workerId
    attemptStatus = $attemptStatus
    abortReason = $null
    relayProbe = $relayProbe
    publicCanaryGate =
      if ($workerId -eq $CanaryWorkerId) {
        $publicCanaryGate
      } else {
        $null
      }
    stopResult = $stopResult
    stopIssuedOnFailure = $stopIssuedOnFailure
  }
}

$afterSnapshot = Get-RecoverySnapshot
$publicCanaryAfterRecovery =
  if (-not [string]::IsNullOrWhiteSpace($abortReason)) {
    $publicCanaryGate
  } else {
    Invoke-PublicCanaryProbe
  }

$beforeHostMap = Get-WorkerMap -Workers $beforeSnapshot.hostController.workers
$beforeInternalMap = Get-WorkerMap -Workers $beforeSnapshot.internal.workers.workers
$afterHostMap = Get-WorkerMap -Workers $afterSnapshot.hostController.workers
$afterInternalMap = Get-WorkerMap -Workers $afterSnapshot.internal.workers.workers
$attemptMap = Get-WorkerMap -Workers $workerAttempts
$observedWorkerIdsAfter = @($afterSnapshot.hostController.workers | ForEach-Object { $_.workerId })
$truthWorkerIds = Get-OrderedUniqueStrings -Values (@($orderedWorkerIds) + @($observedWorkerIdsBefore) + @($observedWorkerIdsAfter))
$missingRequestedWorkerIds = @($orderedWorkerIds | Where-Object { $_ -notin $observedWorkerIdsBefore })
$extraObservedWorkerIdsBefore = @($observedWorkerIdsBefore | Where-Object { $_ -notin $orderedWorkerIds })
$extraObservedWorkerIdsAfter = @($observedWorkerIdsAfter | Where-Object { $_ -notin $orderedWorkerIds })

$workerResults = @()

foreach ($workerId in $truthWorkerIds) {
  $beforeHostWorker =
    if ($beforeHostMap.ContainsKey($workerId)) {
      $beforeHostMap[$workerId]
    } else {
      $null
    }
  $beforeInternalWorker =
    if ($beforeInternalMap.ContainsKey($workerId)) {
      $beforeInternalMap[$workerId]
    } else {
      $null
    }
  $afterHostWorker =
    if ($afterHostMap.ContainsKey($workerId)) {
      $afterHostMap[$workerId]
    } else {
      $null
    }
  $afterInternalWorker =
    if ($afterInternalMap.ContainsKey($workerId)) {
      $afterInternalMap[$workerId]
    } else {
      $null
    }
  $attempt =
    if ($attemptMap.ContainsKey($workerId)) {
      $attemptMap[$workerId]
    } else {
      $null
    }

  $beforeClassification = Get-WorkerClassification -InternalWorker $beforeInternalWorker -HostWorker $beforeHostWorker
  $afterClassification = Get-WorkerClassification -InternalWorker $afterInternalWorker -HostWorker $afterHostWorker
  $blockerCode = Get-WorkerBlockerCode `
    -WorkerResult $attempt `
    -InternalWorker $afterInternalWorker `
    -HostWorker $afterHostWorker `
    -Classification $afterClassification
  $recovered = $beforeClassification -ne "ready" -and $afterClassification -eq "ready"
  $relaySucceeded =
    if ($null -ne $attempt -and $null -ne $attempt.relayProbe) {
      Test-RelayProbeSuccess -Probe $attempt.relayProbe
    } else {
      $null
    }

  $workerResults += [pscustomobject][ordered]@{
    workerId = $workerId
    requested = $workerId -in $orderedWorkerIds
    observedBefore = $workerId -in $observedWorkerIdsBefore
    observedAfter = $workerId -in $observedWorkerIdsAfter
    beforeClassification = $beforeClassification
    afterClassification = $afterClassification
    attemptStatus =
      if ($null -ne $attempt) {
        $attempt.attemptStatus
      } elseif ($workerId -in $orderedWorkerIds) {
        "not_attempted"
      } else {
        "not_requested"
      }
    relaySucceeded = $relaySucceeded
    recovered = $recovered
    blockerCode = $blockerCode
    blockerSummary =
      if ($afterClassification -eq "ready") {
        $null
      } else {
        "${workerId}:$blockerCode"
      }
    stopIssuedOnFailure =
      if ($null -ne $attempt) {
        [bool]$attempt.stopIssuedOnFailure
      } else {
        $false
      }
    stopResult =
      if ($null -ne $attempt) {
        $attempt.stopResult
      } else {
        $null
      }
    relayProbe =
      if ($null -ne $attempt) {
        $attempt.relayProbe
      } else {
        $null
      }
    publicCanaryGate =
      if ($null -ne $attempt) {
        $attempt.publicCanaryGate
      } else {
        $null
      }
  }
}

$recoveredWorkerIds = @($workerResults | Where-Object { $_.recovered } | ForEach-Object { $_.workerId })
$failedWorkerIds = @(
  $workerResults |
    Where-Object {
      $_.attemptStatus -eq "relay_failed" -or
      $_.attemptStatus -eq "canary_public_regression"
    } |
    ForEach-Object { $_.workerId }
)
$blockerWorkerIds = @($workerResults | Where-Object { $_.afterClassification -ne "ready" } | ForEach-Object { $_.workerId })
$blockerSummaries = @($workerResults | Where-Object { $_.blockerSummary } | ForEach-Object { $_.blockerSummary })

$counts = [pscustomobject][ordered]@{
  totalWorkers = @($workerResults).Count
  readyWorkers = @($workerResults | Where-Object { $_.afterClassification -eq "ready" }).Count
  reauthRequiredWorkers = @($workerResults | Where-Object { $_.afterClassification -eq "reauth_required" }).Count
  reachableButUnusableWorkers = @($workerResults | Where-Object { $_.afterClassification -eq "reachable_but_unusable" }).Count
  disconnectedWorkers = @($workerResults | Where-Object { $_.afterClassification -eq "disconnected" }).Count
  recoveredWorkers = @($recoveredWorkerIds).Count
  failedWorkers = @($failedWorkerIds).Count
}

$inventoryMismatch =
  @($missingRequestedWorkerIds).Count -gt 0 -or
  @($extraObservedWorkerIdsBefore).Count -gt 0 -or
  @($extraObservedWorkerIdsAfter).Count -gt 0

$recoveryStatus =
  if ($abortReason -eq "canary_public_regression") {
    "hold_after_canary_public_regression"
  } elseif ($abortReason -eq "canary_probe_failed") {
    "hold_after_canary_probe_failure"
  } elseif (@($blockerWorkerIds).Count -gt 0) {
    "partial_recovery"
  } else {
    "recovered"
  }

$summary =
  if ($recoveryStatus -eq "recovered") {
    "Recovered $($counts.readyWorkers)/$($counts.totalWorkers) workers and the public canary on $CanaryWorkerId still passes."
  } elseif ($recoveryStatus -eq "partial_recovery") {
    "Recovered $($counts.recoveredWorkers) workers, but blockers remain on $(@($blockerWorkerIds) -join ', ')."
  } elseif ($recoveryStatus -eq "hold_after_canary_public_regression") {
    "Held recovery after $CanaryWorkerId introduced a public canary regression."
  } else {
    "Held recovery after the canary relay proof failed on $CanaryWorkerId."
  }

$canaryAttempt = @($workerAttempts | Where-Object { $_.workerId -eq $CanaryWorkerId })[0]
$canaryStopDeferredUntilFinalSnapshot =
  $null -ne $canaryAttempt -and
  $canaryAttempt.attemptStatus -eq "relay_complete" -and
  -not $canaryAttempt.stopIssuedOnFailure
$canaryLifecycle = [pscustomobject][ordered]@{
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  workerId = $CanaryWorkerId
  keepWorkerRunningRequested = $true
  stopStrategy =
    if ($canaryStopDeferredUntilFinalSnapshot) {
      "deferred_until_final_snapshot"
    } else {
      "immediate_on_failure"
    }
  stoppedImmediately =
    if ($null -ne $canaryAttempt) {
      [bool]$canaryAttempt.stopIssuedOnFailure
    } else {
      $false
    }
  deferredUntilFinalSnapshot = [bool]$canaryStopDeferredUntilFinalSnapshot
  stopResult =
    if ($null -ne $canaryAttempt) {
      $canaryAttempt.stopResult
    } else {
      $null
    }
}

$result = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  sessionBaseUrl = $SessionBaseUrl.TrimEnd("/")
  publicBaseUrl = $PublicApiBaseUrl.TrimEnd("/")
  internalBaseUrl = $InternalBaseUrl.TrimEnd("/")
  hostControllerBaseUrl = $HostControllerBaseUrl.TrimEnd("/")
  canaryWorkerId = $CanaryWorkerId
  recoveryStatus = $recoveryStatus
  summary = $summary
  requestedWorkerIds = @($orderedWorkerIds)
  before = $beforeSnapshot
  after = $afterSnapshot
  counts = $counts
  inventory = [pscustomobject][ordered]@{
    observedWorkerIds = @($observedWorkerIdsAfter)
    observedWorkerIdsBefore = @($observedWorkerIdsBefore)
    observedWorkerIdsAfter = @($observedWorkerIdsAfter)
    inventoryMismatch = $inventoryMismatch
    missingRequestedWorkerIds = @($missingRequestedWorkerIds)
    extraObservedWorkerIdsBefore = @($extraObservedWorkerIdsBefore)
    extraObservedWorkerIdsAfter = @($extraObservedWorkerIdsAfter)
  }
  recoveredWorkerIds = @($recoveredWorkerIds)
  failedWorkerIds = @($failedWorkerIds)
  blockerWorkerIds = @($blockerWorkerIds)
  blockerSummaries = @($blockerSummaries)
  canaryLifecycle = $canaryLifecycle
  publicCanaryGate = $publicCanaryGate
  publicCanaryAfterRecovery = $publicCanaryAfterRecovery
  workerResults = $workerResults
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
  $lines += "# Readiness Recovery Summary"
  $lines += ""
  $lines += "- Generated: $($result.generatedAt)"
  $lines += "- Script compatibility version: $($result.scriptCompatibilityVersion)"
  $lines += "- Recovery status: $($result.recoveryStatus)"
  $lines += "- Summary: $($result.summary)"
  $lines += "- Session base URL: $($result.sessionBaseUrl)"
  $lines += "- Public base URL: $($result.publicBaseUrl)"
  $lines += "- Internal base URL: $($result.internalBaseUrl)"
  $lines += "- Host-controller base URL: $($result.hostControllerBaseUrl)"
  $lines += "- Canary worker: $($result.canaryWorkerId)"
  $lines += "- Requested workers: $(@($result.requestedWorkerIds) -join ', ')"
  $lines += "- Inventory mismatch: $($result.inventory.inventoryMismatch)"
  $lines += ""
  $lines += "## Counts"
  $lines += ""
  $lines += "- Ready workers: $($result.counts.readyWorkers)/$($result.counts.totalWorkers)"
  $lines += "- reauth_required: $($result.counts.reauthRequiredWorkers)"
  $lines += "- reachable_but_unusable: $($result.counts.reachableButUnusableWorkers)"
  $lines += "- disconnected: $($result.counts.disconnectedWorkers)"
  $lines += "- Recovered workers: $($result.counts.recoveredWorkers)"
  $lines += "- Failed workers: $($result.counts.failedWorkers)"
  $lines += "- Recovered worker IDs: $(if (@($result.recoveredWorkerIds).Count -gt 0) { @($result.recoveredWorkerIds) -join ', ' } else { 'none' })"
  $lines += "- Blockers: $(if (@($result.blockerSummaries).Count -gt 0) { @($result.blockerSummaries) -join '; ' } else { 'none' })"
  $lines += ""
  $lines += "## Snapshots"
  $lines += ""
  $lines += "- Before ready workers: $($result.before.internal.workers.readyWorkers)/$($result.before.internal.workers.totalWorkers)"
  $lines += "- After ready workers: $($result.after.internal.workers.readyWorkers)/$($result.after.internal.workers.totalWorkers)"
  $lines += "- Host-controller pool before: $($result.before.hostController.poolStatus)"
  $lines += "- Host-controller pool after: $($result.after.hostController.poolStatus)"
  $lines += ""
  $lines += "## Public Canary"
  $lines += ""
  $lines += "- Canary stop strategy: $($result.canaryLifecycle.stopStrategy)"
  $lines += "- Canary stopped immediately: $($result.canaryLifecycle.stoppedImmediately)"
  $lines += "- Canary deferred until final snapshot: $($result.canaryLifecycle.deferredUntilFinalSnapshot)"
  $lines += "- Gate result after canary: $(Get-PublicCanaryLabel -Probe $result.publicCanaryGate) ($(Get-PublicCanaryDetail -Probe $result.publicCanaryGate))"
  $lines += "- Final result after recovery: $(Get-PublicCanaryLabel -Probe $result.publicCanaryAfterRecovery) ($(Get-PublicCanaryDetail -Probe $result.publicCanaryAfterRecovery))"
  $lines += ""
  $lines += "## Worker Results"
  $lines += ""
  $lines += "| Worker | Before | After | Attempt | Relay | Note |"
  $lines += "|--------|--------|-------|---------|-------|------|"

  foreach ($workerResult in $workerResults) {
    $relayLabel =
      if ($null -eq $workerResult.relaySucceeded) {
        "n/a"
      } elseif ($workerResult.relaySucceeded) {
        "pass"
      } else {
        "fail"
      }

    $lines += "| $($workerResult.workerId) | $($workerResult.beforeClassification) | $($workerResult.afterClassification) | $($workerResult.attemptStatus) | $relayLabel | $(Get-WorkerMarkdownNote -WorkerResult $workerResult) |"
  }

  $lines | Set-Content -Path $OutputMarkdownPath -Encoding UTF8
}

$jsonOutput
