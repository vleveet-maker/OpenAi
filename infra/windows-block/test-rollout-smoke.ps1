param(
  [string]$PublicBaseUrl = "http://77.66.186.75",
  [string]$InternalBaseUrl = "http://127.0.0.1:8081",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$InternalAdminToken = "local-internal-admin-token",
  [string]$HostControllerToken = "local-host-controller-token",
  [string]$CanaryWorkerId = "shared-6",
  [string]$ApiToken = "",
  [string]$SettingsPath = "",
  [int]$TimeoutSeconds = 180,
  [int]$PostCanaryDelaySeconds = 0,
  [int]$PostSmokeDelaySeconds = 0,
  [switch]$KeepCanaryRunningUntilFinalSnapshot,
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptCompatibilityVersion = "phase24-exact-smoke-wrapper-compat-backport-v1"

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

function Get-ObjectPropertyValue {
  param(
    [object]$InputObject,
    [string]$PropertyName,
    [object]$DefaultValue = $null
  )

  if ($null -eq $InputObject -or [string]::IsNullOrWhiteSpace($PropertyName)) {
    return $DefaultValue
  }

  $property = $InputObject.PSObject.Properties[$PropertyName]

  if ($null -eq $property) {
    return $DefaultValue
  }

  if ($null -eq $property.Value) {
    return $DefaultValue
  }

  return $property.Value
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

function Test-ProbeSuccess {
  param([object]$Probe)

  return (
    $null -ne $Probe -and
    $Probe.success -eq $true -and
    $null -ne $Probe.statusCode -and
    [int]$Probe.statusCode -ge 200 -and
    [int]$Probe.statusCode -lt 400
  )
}

function Get-ProbeBaseUrl {
  param([object]$ProbePayload)

  $baseUrl = Get-ObjectPropertyValue -InputObject $ProbePayload -PropertyName "baseUrl" -DefaultValue ""

  if ([string]::IsNullOrWhiteSpace([string]$baseUrl)) {
    return $null
  }

  return ([string]$baseUrl).TrimEnd("/")
}

function Get-ProbeStep {
  param(
    [object]$ProbePayload,
    [string]$PropertyName,
    [string[]]$AlternatePropertyNames = @(),
    [string]$FallbackPath
  )

  $candidatePropertyNames = @($PropertyName) + @($AlternatePropertyNames | Where-Object {
    -not [string]::IsNullOrWhiteSpace([string]$_)
  })

  foreach ($candidatePropertyName in $candidatePropertyNames) {
    $step = Get-ObjectPropertyValue -InputObject $ProbePayload -PropertyName $candidatePropertyName

    if ($null -ne $step) {
      return $step
    }
  }

  $baseUrl = Get-ProbeBaseUrl -ProbePayload $ProbePayload
  $requestUrl =
    if (-not [string]::IsNullOrWhiteSpace($baseUrl) -and -not [string]::IsNullOrWhiteSpace($FallbackPath)) {
      "$baseUrl$FallbackPath"
    } else {
      $null
    }

  return New-ProbeStepFailure `
    -RequestUrl $requestUrl `
    -ErrorKind "missing_probe_step" `
    -ErrorMessage "Probe payload did not include $PropertyName."
}

function Get-ProbeChatPayload {
  param([object]$ProbePayload)

  $chatProbe = Get-ProbeStep `
    -ProbePayload $ProbePayload `
    -PropertyName "chatCompletions" `
    -AlternatePropertyNames @("chat") `
    -FallbackPath "/v1/chat/completions"

  if ($null -eq $chatProbe -or [string]::IsNullOrWhiteSpace([string]$chatProbe.body)) {
    return $null
  }

  return ConvertFrom-JsonSafe -Raw $chatProbe.body
}

function Get-ProbeChatReplyText {
  param([object]$ProbePayload)

  $chatPayload = Get-ProbeChatPayload -ProbePayload $ProbePayload
  $choices = @(Get-ObjectPropertyValue -InputObject $chatPayload -PropertyName "choices" -DefaultValue @())

  if (
    $null -eq $chatPayload -or
    $choices.Count -eq 0
  ) {
    return $null
  }

  $message = Get-ObjectPropertyValue -InputObject $choices[0] -PropertyName "message"
  $content = Get-ObjectPropertyValue -InputObject $message -PropertyName "content"

  if ($null -eq $message -or $null -eq $content) {
    return $null
  }

  return [string]$content
}

function Get-ProbeWorkerId {
  param(
    [object]$ProbePayload,
    [string]$FallbackWorkerId
  )

  $chatPayload = Get-ProbeChatPayload -ProbePayload $ProbePayload
  $workerId = Get-ObjectPropertyValue -InputObject $chatPayload -PropertyName "worker_id" -DefaultValue ""

  if ($null -eq $chatPayload -or [string]::IsNullOrWhiteSpace([string]$workerId)) {
    return $FallbackWorkerId
  }

  return [string]$workerId
}

function Get-ProbeModel {
  param([object]$ProbePayload)

  $chatPayload = Get-ProbeChatPayload -ProbePayload $ProbePayload

  if ($null -eq $chatPayload) {
    return $null
  }

  return Get-ObjectPropertyValue -InputObject $chatPayload -PropertyName "model"
}

function Convert-PublicProbeResult {
  param(
    [Parameter(Mandatory = $true)]
    [object]$ProbePayload,
    [Parameter(Mandatory = $true)]
    [string]$FallbackWorkerId
  )

  $checkedAt = Get-ObjectPropertyValue -InputObject $ProbePayload -PropertyName "checkedAt"
  $baseUrl = Get-ProbeBaseUrl -ProbePayload $ProbePayload
  $healthProbe = Get-ProbeStep -ProbePayload $ProbePayload -PropertyName "healthz" -FallbackPath "/healthz"
  $modelsProbe = Get-ProbeStep -ProbePayload $ProbePayload -PropertyName "models" -FallbackPath "/v1/models"
  $chatProbe = Get-ProbeStep `
    -ProbePayload $ProbePayload `
    -PropertyName "chatCompletions" `
    -AlternatePropertyNames @("chat") `
    -FallbackPath "/v1/chat/completions"
  $replyText = Get-ProbeChatReplyText -ProbePayload $ProbePayload

  return [pscustomobject][ordered]@{
    checkedAt =
      if ($checkedAt) {
        $checkedAt
      } else {
        (Get-Date).ToString("o")
      }
    baseUrl = $baseUrl
    healthz = [pscustomobject][ordered]@{
      ok = Test-ProbeSuccess -Probe $healthProbe
      statusCode = $healthProbe.statusCode
      errorKind = $healthProbe.errorKind
      requestUrl = $healthProbe.requestUrl
    }
    models = [pscustomobject][ordered]@{
      ok = Test-ProbeSuccess -Probe $modelsProbe
      statusCode = $modelsProbe.statusCode
      errorKind = $modelsProbe.errorKind
      requestUrl = $modelsProbe.requestUrl
    }
    chat = [pscustomobject][ordered]@{
      ok =
        (Test-ProbeSuccess -Probe $chatProbe) -and
        $replyText -eq "probe-ok"
      statusCode = $chatProbe.statusCode
      errorKind = $chatProbe.errorKind
      requestUrl = $chatProbe.requestUrl
      assistantReplyText = $replyText
      workerId = Get-ProbeWorkerId -ProbePayload $ProbePayload -FallbackWorkerId $FallbackWorkerId
      model = Get-ProbeModel -ProbePayload $ProbePayload
    }
  }
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
    stableWorkers = @($workerList | Where-Object { $_.stabilityGateStatus -eq "stable" }).Count
    provisionalWorkers = @($workerList | Where-Object { $_.stabilityGateStatus -eq "provisional" }).Count
    unstableWorkers = @($workerList | Where-Object { $_.stabilityGateStatus -eq "unstable" }).Count
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

function Get-SmokeSnapshot {
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

function Stop-SmokeWorker {
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

function Invoke-PublicCanaryProbe {
  $publicBase = $PublicBaseUrl.TrimEnd("/")
  $args = @(
    "-BaseUrl",
    $publicBase,
    "-WorkerId",
    $CanaryWorkerId,
    "-HostControllerBaseUrl",
    $HostControllerBaseUrl,
    "-HostControllerToken",
    $HostControllerToken,
    "-IncludeChatProbe",
    "-EnsureWorkerStarted"
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
      chat = New-ProbeStepFailure -RequestUrl "$publicBase/v1/chat/completions" -ErrorKind "probe_invocation_failed" -ErrorMessage $errorMessage
    }
  }

  return [pscustomobject][ordered]@{
    raw = $probePayload
    normalized = Convert-PublicProbeResult -ProbePayload $probePayload -FallbackWorkerId $CanaryWorkerId
  }
}

$repoRoot = Resolve-RepoRoot
$internalHeaders = @{
  "x-internal-admin-token" = $InternalAdminToken
}
$hostControllerHeaders = @{
  "x-host-controller-token" = $HostControllerToken
}
$probeScriptPath = Join-Path $PSScriptRoot "probe-public-api.ps1"
$phaseDir = Join-Path $repoRoot ".planning\\phases\\11-rollout-smoke-confidence"

if (-not (Test-Path $probeScriptPath)) {
  throw "Missing rollout smoke dependency: $probeScriptPath"
}

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\\data\\rollout-smoke\\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "11-SMOKE-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "11-SMOKE-SUMMARY.md"
}

$stageOrder = New-Object System.Collections.Generic.List[string]
$stageSnapshots = [ordered]@{
  before_smoke = $null
  after_canary_start = $null
  after_canary_stop = $null
  after_smoke = $null
  after_settle = $null
}
$probeLifecycle = [pscustomobject][ordered]@{
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  workerId = $CanaryWorkerId
  keepCanaryRunningUntilFinalSnapshot = [bool]$KeepCanaryRunningUntilFinalSnapshot
  keepWorkerRunningRequested = $true
  stopStrategy =
    if ($KeepCanaryRunningUntilFinalSnapshot) {
      "deferred_until_final_snapshot"
    } else {
      "immediate_after_probe"
    }
  stopRequested = $false
  stopStage = $null
  stopResult = $null
  canaryStoppedImmediately = $false
  canaryDeferredUntilFinalSnapshot = [bool]$KeepCanaryRunningUntilFinalSnapshot
}

$stageSnapshots.before_smoke = Get-SmokeSnapshot
$stageOrder.Add("before_smoke")

$probeResult = Invoke-PublicCanaryProbe

if ($PostCanaryDelaySeconds -gt 0) {
  Start-Sleep -Seconds $PostCanaryDelaySeconds
}

$stageSnapshots.after_canary_start = Get-SmokeSnapshot
$stageOrder.Add("after_canary_start")

if (-not $KeepCanaryRunningUntilFinalSnapshot) {
  $probeLifecycle.stopRequested = $true
  $probeLifecycle.stopStage = "after_canary_stop"
  $probeLifecycle.stopResult = Stop-SmokeWorker -WorkerId $CanaryWorkerId
  $probeLifecycle.canaryStoppedImmediately = $true
  $stageSnapshots.after_canary_stop = Get-SmokeSnapshot
  $stageOrder.Add("after_canary_stop")
}

$stageSnapshots.after_smoke = Get-SmokeSnapshot
$stageOrder.Add("after_smoke")

if ($KeepCanaryRunningUntilFinalSnapshot) {
  $probeLifecycle.stopRequested = $true
  $probeLifecycle.stopStage = "after_canary_stop"
  $probeLifecycle.stopResult = Stop-SmokeWorker -WorkerId $CanaryWorkerId
  $stageSnapshots.after_canary_stop = Get-SmokeSnapshot
  $stageOrder.Add("after_canary_stop")
}

if ($PostSmokeDelaySeconds -gt 0) {
  Start-Sleep -Seconds $PostSmokeDelaySeconds
}

$stageSnapshots.after_settle = Get-SmokeSnapshot
$stageOrder.Add("after_settle")

$finalSnapshot =
  if ($null -ne $stageSnapshots.after_settle) {
    $stageSnapshots.after_settle
  } elseif ($null -ne $stageSnapshots.after_smoke) {
    $stageSnapshots.after_smoke
  } elseif ($null -ne $stageSnapshots.after_canary_stop) {
    $stageSnapshots.after_canary_stop
  } elseif ($null -ne $stageSnapshots.after_canary_start) {
    $stageSnapshots.after_canary_start
  } else {
    $stageSnapshots.before_smoke
  }
$finalStageName =
  if ($null -ne $stageSnapshots.after_settle) {
    "after_settle"
  } elseif ($null -ne $stageSnapshots.after_smoke) {
    "after_smoke"
  } elseif ($null -ne $stageSnapshots.after_canary_stop) {
    "after_canary_stop"
  } elseif ($null -ne $stageSnapshots.after_canary_start) {
    "after_canary_start"
  } else {
    "before_smoke"
  }
$publicCanary = $probeResult.normalized
$publicHealthOk = [bool]$publicCanary.healthz.ok
$publicModelsOk = [bool]$publicCanary.models.ok
$publicChatOk = [bool]$publicCanary.chat.ok
$verdict =
  if (
    $finalSnapshot.internal.pool.status -eq "ready" -and
    $publicHealthOk -and
    $publicModelsOk -and
    $publicChatOk
  ) {
    "ready_for_household_use"
  } else {
    "hold_rollout"
  }
$summary =
  if ($verdict -eq "ready_for_household_use") {
    "Pool is ready and the public canary path passed on $CanaryWorkerId through the final smoke snapshot."
  } else {
    "Hold rollout: final stage $finalStageName shows pool status $($finalSnapshot.internal.pool.status), ready workers $($finalSnapshot.internal.workers.readyWorkers)/$($finalSnapshot.internal.workers.totalWorkers), and public canary passed=$publicChatOk."
  }

$result = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  publicBaseUrl = $PublicBaseUrl.TrimEnd("/")
  internalBaseUrl = $InternalBaseUrl.TrimEnd("/")
  hostControllerBaseUrl = $HostControllerBaseUrl.TrimEnd("/")
  canaryWorkerId = $CanaryWorkerId
  expectedChatReply = "probe-ok"
  verdict = $verdict
  summary = $summary
  keepCanaryRunningUntilFinalSnapshot = [bool]$KeepCanaryRunningUntilFinalSnapshot
  delays = [pscustomobject][ordered]@{
    postCanaryDelaySeconds = $PostCanaryDelaySeconds
    postSmokeDelaySeconds = $PostSmokeDelaySeconds
  }
  finalStage = $finalStageName
  stageOrder = @($stageOrder)
  stageSnapshots = [pscustomobject]$stageSnapshots
  probeLifecycle = $probeLifecycle
  internal = $finalSnapshot.internal
  hostController = $finalSnapshot.hostController
  publicCanary = $publicCanary
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
  $lines += "# Rollout Smoke Summary"
  $lines += ""
  $lines += "- Generated: $($result.generatedAt)"
  $lines += "- Script compatibility version: $($result.scriptCompatibilityVersion)"
  $lines += "- Verdict: $($result.verdict)"
  $lines += "- Public base URL: $($result.publicBaseUrl)"
  $lines += "- Internal base URL: $($result.internalBaseUrl)"
  $lines += "- Host-controller base URL: $($result.hostControllerBaseUrl)"
  $lines += "- Canary worker: $($result.canaryWorkerId)"
  $lines += "- Summary: $($result.summary)"
  $lines += "- Final stage: $($result.finalStage)"
  $lines += "- Stage order: $(@($result.stageOrder) -join ', ')"
  $lines += "- Keep canary running until final snapshot: $($result.keepCanaryRunningUntilFinalSnapshot)"
  $lines += "- Canary stop strategy: $($result.probeLifecycle.stopStrategy)"
  $lines += "- Canary stop stage: $($result.probeLifecycle.stopStage)"
  $lines += "- Canary stop ok: $($result.probeLifecycle.stopResult.ok)"
  $lines += ""
  $lines += "## Internal Readiness"
  $lines += ""
  $lines += "- Pool status: $($result.internal.pool.status)"
  $lines += "- Controller reachable: $($result.internal.pool.controllerReachable)"
  $lines += "- Proxy listening: $($result.internal.pool.proxyListening)"
  $lines += "- Ready workers: $($result.internal.workers.readyWorkers)/$($result.internal.workers.totalWorkers)"
  $lines += "- Reauth required: $($result.internal.workers.reauthRequiredWorkers)"
  $lines += "- Disconnected: $($result.internal.workers.disconnectedWorkers)"
  $lines += "- Stable workers: $($result.internal.workers.stableWorkers)"
  $lines += "- Provisional workers: $($result.internal.workers.provisionalWorkers)"
  $lines += "- Recent operator failures: $($result.internal.observability.recentFailureCount)"
  $lines += ""
  $lines += "## Stage Counts"
  $lines += ""
  $lines += "| Stage | Ready | Reauth | Disconnected |"
  $lines += "|-------|-------|--------|--------------|"

  foreach ($stageName in @("before_smoke", "after_canary_start", "after_canary_stop", "after_smoke", "after_settle")) {
    $snapshot = $result.stageSnapshots.$stageName

    if ($null -eq $snapshot) {
      $lines += "| $stageName | n/a | n/a | n/a |"
      continue
    }

    $lines += "| $stageName | $($snapshot.internal.workers.readyWorkers)/$($snapshot.internal.workers.totalWorkers) | $($snapshot.internal.workers.reauthRequiredWorkers) | $($snapshot.internal.workers.disconnectedWorkers) |"
  }

  $lines += ""
  $lines += "## Public Canary"
  $lines += ""
  $lines += "| Check | Result | Detail |"
  $lines += "|-------|--------|--------|"
  $lines += "| healthz | $($result.publicCanary.healthz.ok) | status=$($result.publicCanary.healthz.statusCode) error=$($result.publicCanary.healthz.errorKind) |"
  $lines += "| v1/models | $($result.publicCanary.models.ok) | status=$($result.publicCanary.models.statusCode) error=$($result.publicCanary.models.errorKind) |"
  $lines += "| v1/chat/completions | $($result.publicCanary.chat.ok) | status=$($result.publicCanary.chat.statusCode) worker=$($result.publicCanary.chat.workerId) reply=$($result.publicCanary.chat.assistantReplyText) error=$($result.publicCanary.chat.errorKind) |"

  $lines | Set-Content -Path $OutputMarkdownPath -Encoding UTF8
}

$jsonOutput
