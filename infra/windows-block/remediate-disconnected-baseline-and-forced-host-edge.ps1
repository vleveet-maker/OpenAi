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
  [int]$EdgeSettleSeconds = 10,
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptCompatibilityVersion = "phase16-runtime-parity-sync-v1"

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

function Get-StageSnapshot {
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

function Get-WorkerBlockerCode {
  param(
    [object]$InternalWorker,
    [object]$HostWorker,
    [string]$Classification
  )

  if ($Classification -eq "ready") {
    return $null
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

function New-ProbeStepFailure {
  param(
    [string]$RequestUrl,
    [string]$ErrorKind,
    [string]$ErrorMessage,
    [string]$RequestHostHeader,
    [string]$CurrentHopName
  )

  return [pscustomobject][ordered]@{
    success = $false
    statusCode = $null
    body = ""
    bodyPreview = ""
    headers = @()
    error = $ErrorMessage
    errorKind = $ErrorKind
    requestUrl = $RequestUrl
    requestHostHeader = $RequestHostHeader
    hopName = $CurrentHopName
    serverHeader = $null
    viaHeader = $null
  }
}

function Test-HopStepSuccess {
  param([object]$Probe)

  return (
    $null -ne $Probe -and
    $Probe.success -eq $true -and
    $null -ne $Probe.statusCode -and
    [int]$Probe.statusCode -ge 200 -and
    [int]$Probe.statusCode -lt 400
  )
}

function Get-ProbeChatPayload {
  param([object]$ProbePayload)

  if ($null -eq $ProbePayload -or $null -eq $ProbePayload.chatCompletions) {
    return $null
  }

  return ConvertFrom-JsonSafe -Raw $ProbePayload.chatCompletions.body
}

function Get-ProbeChatReplyText {
  param([object]$ProbePayload)

  $chatPayload = Get-ProbeChatPayload -ProbePayload $ProbePayload

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

function Get-ProbeWorkerId {
  param(
    [object]$ProbePayload,
    [string]$FallbackWorkerId
  )

  $chatPayload = Get-ProbeChatPayload -ProbePayload $ProbePayload

  if ($null -eq $chatPayload -or [string]::IsNullOrWhiteSpace($chatPayload.worker_id)) {
    return $FallbackWorkerId
  }

  return [string]$chatPayload.worker_id
}

function Get-ProbeModel {
  param([object]$ProbePayload)

  $chatPayload = Get-ProbeChatPayload -ProbePayload $ProbePayload

  if ($null -eq $chatPayload) {
    return $null
  }

  return $chatPayload.model
}

function Convert-ProbePayloadToHopResult {
  param(
    [Parameter(Mandatory = $true)]
    [object]$ProbePayload,
    [Parameter(Mandatory = $true)]
    [string]$FallbackWorkerId,
    [Parameter(Mandatory = $true)]
    [string]$CurrentHopName,
    [string]$RequestHostHeader = ""
  )

  $replyText = Get-ProbeChatReplyText -ProbePayload $ProbePayload

  $result = [pscustomobject][ordered]@{
    checkedAt =
      if ($ProbePayload.checkedAt) {
        $ProbePayload.checkedAt
      } else {
        (Get-Date).ToString("o")
      }
    hopName = $CurrentHopName
    baseUrl = $ProbePayload.baseUrl
    requestHostHeader =
      if ([string]::IsNullOrWhiteSpace($RequestHostHeader)) {
        $ProbePayload.requestHostHeader
      } else {
        $RequestHostHeader
      }
    healthz = [pscustomobject][ordered]@{
      ok = Test-HopStepSuccess -Probe $ProbePayload.healthz
      statusCode = $ProbePayload.healthz.statusCode
      errorKind = $ProbePayload.healthz.errorKind
      requestUrl = $ProbePayload.healthz.requestUrl
      requestHostHeader = $ProbePayload.healthz.requestHostHeader
      serverHeader = $ProbePayload.healthz.serverHeader
      viaHeader = $ProbePayload.healthz.viaHeader
      bodyPreview = $ProbePayload.healthz.bodyPreview
    }
    models = [pscustomobject][ordered]@{
      ok = Test-HopStepSuccess -Probe $ProbePayload.models
      statusCode = $ProbePayload.models.statusCode
      errorKind = $ProbePayload.models.errorKind
      requestUrl = $ProbePayload.models.requestUrl
      requestHostHeader = $ProbePayload.models.requestHostHeader
      serverHeader = $ProbePayload.models.serverHeader
      viaHeader = $ProbePayload.models.viaHeader
      bodyPreview = $ProbePayload.models.bodyPreview
    }
    chat = [pscustomobject][ordered]@{
      ok =
        (Test-HopStepSuccess -Probe $ProbePayload.chatCompletions) -and
        $replyText -eq "probe-ok"
      statusCode = $ProbePayload.chatCompletions.statusCode
      errorKind = $ProbePayload.chatCompletions.errorKind
      requestUrl = $ProbePayload.chatCompletions.requestUrl
      requestHostHeader = $ProbePayload.chatCompletions.requestHostHeader
      serverHeader = $ProbePayload.chatCompletions.serverHeader
      viaHeader = $ProbePayload.chatCompletions.viaHeader
      bodyPreview = $ProbePayload.chatCompletions.bodyPreview
      assistantReplyText = $replyText
      workerId = Get-ProbeWorkerId -ProbePayload $ProbePayload -FallbackWorkerId $FallbackWorkerId
      model = Get-ProbeModel -ProbePayload $ProbePayload
    }
  }

  $result | Add-Member -NotePropertyName allChecksPassed -NotePropertyValue (
    [bool]$result.healthz.ok -and
    [bool]$result.models.ok -and
    [bool]$result.chat.ok
  )

  return $result
}

function Invoke-HopProbe {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CurrentHopName,
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,
    [string]$RequestHostHeader = "",
    [switch]$EnsureWorkerStarted
  )

  $normalizedBaseUrl = $BaseUrl.TrimEnd("/")
  $probeParams = @{
    BaseUrl = $normalizedBaseUrl
    WorkerId = $CanaryWorkerId
    HostControllerBaseUrl = $HostControllerBaseUrl
    HostControllerToken = $HostControllerToken
    IncludeChatProbe = $true
    HopName = $CurrentHopName
  }

  if ($EnsureWorkerStarted) {
    $probeParams.EnsureWorkerStarted = $true
  }

  if (-not [string]::IsNullOrWhiteSpace($RequestHostHeader)) {
    $probeParams.HostHeader = $RequestHostHeader
  }

  if (-not [string]::IsNullOrWhiteSpace($ApiToken)) {
    $probeParams.ApiToken = $ApiToken
  }

  if (-not [string]::IsNullOrWhiteSpace($SettingsPath)) {
    $probeParams.SettingsPath = $SettingsPath
  }

  try {
    $probePayload = (& $probeScriptPath @probeParams) | ConvertFrom-Json
  } catch {
    $errorMessage = "$_"
    $probePayload = [pscustomobject][ordered]@{
      checkedAt = (Get-Date).ToString("o")
      baseUrl = $normalizedBaseUrl
      hopName = $CurrentHopName
      requestHostHeader =
        if ([string]::IsNullOrWhiteSpace($RequestHostHeader)) {
          $null
        } else {
          $RequestHostHeader
        }
      healthz = New-ProbeStepFailure -RequestUrl "$normalizedBaseUrl/healthz" -ErrorKind "probe_invocation_failed" -ErrorMessage $errorMessage -RequestHostHeader $RequestHostHeader -CurrentHopName $CurrentHopName
      models = New-ProbeStepFailure -RequestUrl "$normalizedBaseUrl/v1/models" -ErrorKind "probe_invocation_failed" -ErrorMessage $errorMessage -RequestHostHeader $RequestHostHeader -CurrentHopName $CurrentHopName
      chatCompletions = New-ProbeStepFailure -RequestUrl "$normalizedBaseUrl/v1/chat/completions" -ErrorKind "probe_invocation_failed" -ErrorMessage $errorMessage -RequestHostHeader $RequestHostHeader -CurrentHopName $CurrentHopName
    }
  }

  return Convert-ProbePayloadToHopResult -ProbePayload $probePayload -FallbackWorkerId $CanaryWorkerId -CurrentHopName $CurrentHopName -RequestHostHeader $RequestHostHeader
}

function Stop-Worker {
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

function Get-HopStatus {
  param([object]$HopResult)

  return [pscustomobject][ordered]@{
    hopName = $HopResult.hopName
    passed = [bool]$HopResult.allChecksPassed
    healthzStatusCode = $HopResult.healthz.statusCode
    modelsStatusCode = $HopResult.models.statusCode
    chatStatusCode = $HopResult.chat.statusCode
    chatReply = $HopResult.chat.assistantReplyText
    requestHostHeader = $HopResult.requestHostHeader
    serverHeader = $HopResult.chat.serverHeader
    errorKind =
      if (-not $HopResult.allChecksPassed) {
        $HopResult.chat.errorKind
      } else {
        $null
      }
  }
}

function Get-DominantCountKey {
  param([hashtable]$Map)

  $bestKey = $null
  $bestCount = -1

  foreach ($key in @($Map.Keys | Sort-Object)) {
    $count = [int]$Map[$key]

    if ($count -gt $bestCount) {
      $bestKey = $key
      $bestCount = $count
    }
  }

  if ($bestCount -le 0) {
    return $null
  }

  return $bestKey
}

function Get-WorkerMarkdownNote {
  param([object]$WorkerResult)

  if ($WorkerResult.afterClassification -eq "ready" -and $WorkerResult.recovered) {
    return "recovered"
  }

  if ($WorkerResult.afterClassification -eq "ready") {
    return "ready"
  }

  return $WorkerResult.afterBlockerCode
}

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\\phases\\15-deployed-windows-disconnected-baseline-and-forced-host-edge-remediation"
$internalHeaders = @{
  "x-internal-admin-token" = $InternalAdminToken
}
$hostControllerHeaders = @{
  "x-host-controller-token" = $HostControllerToken
}
$probeScriptPath = Join-Path $PSScriptRoot "probe-public-api.ps1"
$recoveryScriptPath = Join-Path $PSScriptRoot "recover-browser-block-readiness.ps1"
$temporaryRecoveryJsonPath = Join-Path $phaseDir "15-TEMP-RECOVERY.json"
$temporaryRecoveryMarkdownPath = Join-Path $phaseDir "15-TEMP-RECOVERY.md"

if (-not (Test-Path $probeScriptPath)) {
  throw "Missing remediation dependency: $probeScriptPath"
}

if (-not (Test-Path $recoveryScriptPath)) {
  throw "Missing remediation dependency: $recoveryScriptPath"
}

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\\data\\disconnected-baseline-remediation\\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "15-REMEDIATION-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "15-REMEDIATION-SUMMARY.md"
}

$stageOrder = @(
  "before_remediation",
  "after_recovery",
  "after_windows_edge_forced_host",
  "after_public_owner_probe",
  "after_canary_stop"
)
$stageSnapshots = [ordered]@{
  before_remediation = $null
  after_recovery = $null
  after_windows_edge_forced_host = $null
  after_public_owner_probe = $null
  after_canary_stop = $null
}
$hopResults = [ordered]@{}

$stageSnapshots.before_remediation = Get-StageSnapshot
$beforeObservedWorkerIds = Get-OrderedUniqueStrings -Values @(
  @($stageSnapshots.before_remediation.internal.workers.workers | ForEach-Object { $_.workerId })
  @($stageSnapshots.before_remediation.hostController.workers | ForEach-Object { $_.workerId })
)
$requestedWorkerIds =
  if (@($WorkerIds).Count -gt 0) {
    Get-OrderedUniqueStrings -Values $WorkerIds
  } else {
    $beforeObservedWorkerIds
  }

$recoveryArgs = @(
  "-SessionBaseUrl", $SessionBaseUrl,
  "-PublicApiBaseUrl", $PublicApiBaseUrl,
  "-InternalBaseUrl", $InternalBaseUrl,
  "-HostControllerBaseUrl", $HostControllerBaseUrl,
  "-InternalAdminToken", $InternalAdminToken,
  "-HostControllerToken", $HostControllerToken,
  "-CanaryWorkerId", $CanaryWorkerId,
  "-TimeoutSeconds", $TimeoutSeconds,
  "-LatestJsonPath", $temporaryRecoveryJsonPath,
  "-OutputJsonPath", $temporaryRecoveryJsonPath,
  "-OutputMarkdownPath", $temporaryRecoveryMarkdownPath
)

if (@($requestedWorkerIds).Count -gt 0) {
  $recoveryArgs += "-WorkerIds"
  $recoveryArgs += $requestedWorkerIds
}

if (-not [string]::IsNullOrWhiteSpace($ApiToken)) {
  $recoveryArgs += @("-ApiToken", $ApiToken)
}

if (-not [string]::IsNullOrWhiteSpace($SettingsPath)) {
  $recoveryArgs += @("-SettingsPath", $SettingsPath)
}

$null = & $recoveryScriptPath @recoveryArgs

Start-Sleep -Seconds $RecoveryWaitSeconds
$stageSnapshots.after_recovery = Get-StageSnapshot

$hopResults.loopback_api = Invoke-HopProbe `
  -CurrentHopName "loopback_api" `
  -BaseUrl "http://127.0.0.1:4010" `
  -EnsureWorkerStarted
$hopResults.windows_edge_forced_host = Invoke-HopProbe `
  -CurrentHopName "windows_edge_forced_host" `
  -BaseUrl $WindowsEdgeBaseUrl `
  -RequestHostHeader $PublicHostHeader

if ($EdgeSettleSeconds -gt 0) {
  Start-Sleep -Seconds $EdgeSettleSeconds
}

$stageSnapshots.after_windows_edge_forced_host = Get-StageSnapshot
$hopResults.ubuntu_public_owner = Invoke-HopProbe `
  -CurrentHopName "ubuntu_public_owner" `
  -BaseUrl $PublicApiBaseUrl
$stageSnapshots.after_public_owner_probe = Get-StageSnapshot
$canaryStopResult = Stop-Worker -WorkerId $CanaryWorkerId
$stageSnapshots.after_canary_stop = Get-StageSnapshot

$beforeInternalMap = Get-WorkerMap -Workers $stageSnapshots.before_remediation.internal.workers.workers
$beforeHostMap = Get-WorkerMap -Workers $stageSnapshots.before_remediation.hostController.workers
$afterInternalMap = Get-WorkerMap -Workers $stageSnapshots.after_public_owner_probe.internal.workers.workers
$afterHostMap = Get-WorkerMap -Workers $stageSnapshots.after_public_owner_probe.hostController.workers
$afterStopObservedWorkerIds = Get-OrderedUniqueStrings -Values @(
  @($stageSnapshots.after_canary_stop.internal.workers.workers | ForEach-Object { $_.workerId })
  @($stageSnapshots.after_canary_stop.hostController.workers | ForEach-Object { $_.workerId })
)
$truthWorkerIds = Get-OrderedUniqueStrings -Values @($requestedWorkerIds + $beforeObservedWorkerIds + $afterStopObservedWorkerIds)
$workerResults = @()
$remainingClassCounts = @{
  reauth_required = 0
  reachable_but_unusable = 0
  disconnected = 0
}

foreach ($workerId in $truthWorkerIds) {
  $beforeInternalWorker =
    if ($beforeInternalMap.ContainsKey($workerId)) {
      $beforeInternalMap[$workerId]
    } else {
      $null
    }
  $beforeHostWorker =
    if ($beforeHostMap.ContainsKey($workerId)) {
      $beforeHostMap[$workerId]
    } else {
      $null
    }
  $afterInternalWorker =
    if ($afterInternalMap.ContainsKey($workerId)) {
      $afterInternalMap[$workerId]
    } else {
      $null
    }
  $afterHostWorker =
    if ($afterHostMap.ContainsKey($workerId)) {
      $afterHostMap[$workerId]
    } else {
      $null
    }

  $beforeClassification = Get-WorkerClassification -InternalWorker $beforeInternalWorker -HostWorker $beforeHostWorker
  $afterClassification = Get-WorkerClassification -InternalWorker $afterInternalWorker -HostWorker $afterHostWorker
  $beforeBlockerCode = Get-WorkerBlockerCode -InternalWorker $beforeInternalWorker -HostWorker $beforeHostWorker -Classification $beforeClassification
  $afterBlockerCode = Get-WorkerBlockerCode -InternalWorker $afterInternalWorker -HostWorker $afterHostWorker -Classification $afterClassification
  $recovered = $beforeClassification -ne "ready" -and $afterClassification -eq "ready"

  if ($afterClassification -ne "ready") {
    if (-not $remainingClassCounts.ContainsKey($afterClassification)) {
      $remainingClassCounts[$afterClassification] = 0
    }

    $remainingClassCounts[$afterClassification] = [int]$remainingClassCounts[$afterClassification] + 1
  }

  $workerResults += [pscustomobject][ordered]@{
    workerId = $workerId
    requested = $workerId -in $requestedWorkerIds
    beforeClassification = $beforeClassification
    afterClassification = $afterClassification
    beforeBlockerCode = $beforeBlockerCode
    afterBlockerCode = $afterBlockerCode
    recovered = $recovered
  }
}

$recoveredReadyCount = $stageSnapshots.after_recovery.internal.workers.readyWorkers
$totalWorkers = $stageSnapshots.after_recovery.internal.workers.totalWorkers
$dominantRemainingBlockerClass = Get-DominantCountKey -Map $remainingClassCounts
$forcedHostHopStatus = Get-HopStatus -HopResult $hopResults.windows_edge_forced_host
$publicOwnerHopStatus = Get-HopStatus -HopResult $hopResults.ubuntu_public_owner
$verdict =
  if (
    $recoveredReadyCount -eq $totalWorkers -and
    $forcedHostHopStatus.passed -eq $true -and
    $publicOwnerHopStatus.passed -eq $true
  ) {
    "remediated_ready_for_smoke"
  } else {
    "hold_rollout"
  }
$summary =
  if ($verdict -eq "remediated_ready_for_smoke") {
    "Recovered $recoveredReadyCount/$totalWorkers workers and both forced-host plus public-owner hops are green, so the host is ready for a fresh smoke rerun."
  } else {
    "Hold rollout: recoveredReadyCount=$recoveredReadyCount/$totalWorkers, dominantRemainingBlockerClass=$(if ($dominantRemainingBlockerClass) { $dominantRemainingBlockerClass } else { 'none' }), forcedHostHopStatus=$($forcedHostHopStatus.passed), publicOwnerHopStatus=$($publicOwnerHopStatus.passed)."
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
  requestedWorkerIds = @($requestedWorkerIds)
  stageOrder = @($stageOrder)
  stageSnapshots = [pscustomobject]$stageSnapshots
  hopResults = [pscustomobject]$hopResults
  recoveredReadyCount = $recoveredReadyCount
  dominantRemainingBlockerClass = $dominantRemainingBlockerClass
  forcedHostHopStatus = $forcedHostHopStatus
  publicOwnerHopStatus = $publicOwnerHopStatus
  verdict = $verdict
  summary = $summary
  recoveryWaitSeconds = $RecoveryWaitSeconds
  edgeSettleSeconds = $EdgeSettleSeconds
  canaryStopResult = $canaryStopResult
  workerResults = $workerResults
  preserveFirst = [pscustomobject][ordered]@{
    profilesDeleted = $false
    cookiesCleared = $false
    localStorageCleared = $false
    blindFullPoolRestartPerformed = $false
    massReloginPerformed = $false
  }
}

$jsonOutput = $result | ConvertTo-Json -Depth 12

Ensure-ParentDirectory -Path $LatestJsonPath
$jsonOutput | Set-Content -Path $LatestJsonPath -Encoding UTF8

Ensure-ParentDirectory -Path $OutputJsonPath
$jsonOutput | Set-Content -Path $OutputJsonPath -Encoding UTF8

Ensure-ParentDirectory -Path $OutputMarkdownPath
$lines = @()
$lines += "# Disconnected Baseline Remediation Summary"
$lines += ""
$lines += "- Generated: $($result.generatedAt)"
$lines += "- Script compatibility version: $($result.scriptCompatibilityVersion)"
$lines += "- Verdict: $($result.verdict)"
$lines += "- Summary: $($result.summary)"
$lines += "- Canary worker: $($result.canaryWorkerId)"
$lines += "- Requested workers: $(@($result.requestedWorkerIds) -join ', ')"
$lines += "- Recovery wait seconds: $RecoveryWaitSeconds"
$lines += "- Edge settle seconds: $EdgeSettleSeconds"
$lines += ""
$lines += "## Latest Remediation"
$lines += ""
$lines += "- recoveredReadyCount: $($result.recoveredReadyCount)"
$lines += "- dominantRemainingBlockerClass: $(if ($result.dominantRemainingBlockerClass) { $result.dominantRemainingBlockerClass } else { 'none' })"
$lines += "- forcedHostHopStatus: passed=$($result.forcedHostHopStatus.passed) healthz=$($result.forcedHostHopStatus.healthzStatusCode) models=$($result.forcedHostHopStatus.modelsStatusCode) chat=$($result.forcedHostHopStatus.chatStatusCode)"
$lines += "- publicOwnerHopStatus: passed=$($result.publicOwnerHopStatus.passed) healthz=$($result.publicOwnerHopStatus.healthzStatusCode) models=$($result.publicOwnerHopStatus.modelsStatusCode) chat=$($result.publicOwnerHopStatus.chatStatusCode)"
$lines += "- stageOrder: $(@($result.stageOrder) -join ', ')"
$lines += ""
$lines += "## Worker Results"
$lines += ""
$lines += "| Worker | Before | After | Recovered | Note |"
$lines += "|--------|--------|-------|-----------|------|"

foreach ($workerResult in $workerResults) {
  $lines += "| $($workerResult.workerId) | $($workerResult.beforeClassification) | $($workerResult.afterClassification) | $($workerResult.recovered) | $(Get-WorkerMarkdownNote -WorkerResult $workerResult) |"
}

$lines | Set-Content -Path $OutputMarkdownPath -Encoding UTF8

$jsonOutput
