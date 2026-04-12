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
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptCompatibilityVersion = "phase14-zero-ready-root-cause-v1"

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

function Get-BaselineSnapshot {
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

function Stop-CanaryWorker {
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

function Convert-CountMapToObject {
  param([hashtable]$Map)

  $ordered = [ordered]@{}

  foreach ($key in @($Map.Keys | Sort-Object)) {
    $ordered[$key] = [int]$Map[$key]
  }

  return [pscustomobject]$ordered
}

function Get-DominantMapKey {
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

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\\phases\\14-deployed-windows-zero-ready-post-recovery-baseline-and-public-canary-502-root-cause-investigation"
$internalHeaders = @{
  "x-internal-admin-token" = $InternalAdminToken
}
$hostControllerHeaders = @{
  "x-host-controller-token" = $HostControllerToken
}
$probeScriptPath = Join-Path $PSScriptRoot "probe-public-api.ps1"

if (-not (Test-Path $probeScriptPath)) {
  throw "Missing zero-ready root-cause dependency: $probeScriptPath"
}

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\\data\\zero-ready-root-cause\\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "14-ROOT-CAUSE-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "14-ROOT-CAUSE-SUMMARY.md"
}

$requestedWorkerIds =
  if (@($WorkerIds).Count -gt 0) {
    Get-OrderedUniqueStrings -Values $WorkerIds
  } else {
    @()
  }

$baselineSnapshot = Get-BaselineSnapshot
$observedWorkerIds = Get-OrderedUniqueStrings -Values @(
  @($baselineSnapshot.internal.workers.workers | ForEach-Object { $_.workerId })
  @($baselineSnapshot.hostController.workers | ForEach-Object { $_.workerId })
)
$truthWorkerIds = Get-OrderedUniqueStrings -Values @($requestedWorkerIds + $observedWorkerIds)
$missingRequestedWorkerIds =
  if (@($requestedWorkerIds).Count -eq 0) {
    @()
  } else {
    @($requestedWorkerIds | Where-Object { $_ -notin $observedWorkerIds })
  }
$extraObservedWorkerIds =
  if (@($requestedWorkerIds).Count -eq 0) {
    @()
  } else {
    @($observedWorkerIds | Where-Object { $_ -notin $requestedWorkerIds })
  }

$hostWorkerMap = Get-WorkerMap -Workers $baselineSnapshot.hostController.workers
$internalWorkerMap = Get-WorkerMap -Workers $baselineSnapshot.internal.workers.workers
$classificationCounts = @{
  ready = 0
  reauth_required = 0
  reachable_but_unusable = 0
  disconnected = 0
}
$blockerCodeCounts = @{}
$workerResults = @()

foreach ($workerId in $truthWorkerIds) {
  $hostWorker =
    if ($hostWorkerMap.ContainsKey($workerId)) {
      $hostWorkerMap[$workerId]
    } else {
      $null
    }
  $internalWorker =
    if ($internalWorkerMap.ContainsKey($workerId)) {
      $internalWorkerMap[$workerId]
    } else {
      $null
    }
  $classification = Get-WorkerClassification -InternalWorker $internalWorker -HostWorker $hostWorker
  $blockerCode = Get-WorkerBlockerCode -InternalWorker $internalWorker -HostWorker $hostWorker -Classification $classification

  $classificationCounts[$classification] = [int]$classificationCounts[$classification] + 1

  if (-not [string]::IsNullOrWhiteSpace($blockerCode)) {
    if (-not $blockerCodeCounts.ContainsKey($blockerCode)) {
      $blockerCodeCounts[$blockerCode] = 0
    }

    $blockerCodeCounts[$blockerCode] = [int]$blockerCodeCounts[$blockerCode] + 1
  }

  $workerResults += [pscustomobject][ordered]@{
    workerId = $workerId
    displayName =
      if ($null -ne $internalWorker -and -not [string]::IsNullOrWhiteSpace($internalWorker.displayName)) {
        $internalWorker.displayName
      } elseif ($null -ne $hostWorker) {
        $hostWorker.displayName
      } else {
        $workerId
      }
    classification = $classification
    blockerCode = $blockerCode
    blockerSummary =
      if ($classification -eq "ready") {
        $null
      } else {
        "${workerId}:$blockerCode"
      }
    internalStatus =
      if ($null -ne $internalWorker -and $null -ne $internalWorker.status) {
        $internalWorker.status.status
      } else {
        $null
      }
    runtimeCapability =
      if ($null -ne $internalWorker) {
        $internalWorker.runtimeCapability
      } else {
        $null
      }
    runtimeStatus =
      if ($null -ne $internalWorker) {
        $internalWorker.runtimeStatus
      } else {
        $null
      }
    browserContextReady =
      if ($null -ne $internalWorker) {
        $internalWorker.browserContextReady
      } else {
        $null
      }
    lastBootstrapFailureCode =
      if ($null -ne $internalWorker) {
        $internalWorker.lastBootstrapFailureCode
      } else {
        $null
      }
    lastRelayFailureCode =
      if ($null -ne $internalWorker) {
        $internalWorker.lastRelayFailureCode
      } else {
        $null
      }
    hostController = [pscustomobject][ordered]@{
      agentListening =
        if ($null -ne $hostWorker) {
          [bool]$hostWorker.agentListening
        } else {
          $false
        }
      browserListening =
        if ($null -ne $hostWorker) {
          [bool]$hostWorker.browserListening
        } else {
          $false
        }
      runtimeMode =
        if ($null -ne $hostWorker) {
          $hostWorker.runtimeMode
        } else {
          $null
        }
      runtimeClass =
        if ($null -ne $hostWorker) {
          $hostWorker.runtimeClass
        } else {
          $null
        }
    }
  }
}

$nonReadyClassCounts = @{
  reauth_required = [int]$classificationCounts.reauth_required
  reachable_but_unusable = [int]$classificationCounts.reachable_but_unusable
  disconnected = [int]$classificationCounts.disconnected
}
$dominantBlockerClass = Get-DominantMapKey -Map $nonReadyClassCounts
$dominantBlockerClassCount =
  if ($null -eq $dominantBlockerClass) {
    0
  } else {
    [int]$nonReadyClassCounts[$dominantBlockerClass]
  }
$dominantBlockerCode = Get-DominantMapKey -Map $blockerCodeCounts
$dominantBlockerCodeCount =
  if ($null -eq $dominantBlockerCode) {
    0
  } else {
    [int]$blockerCodeCounts[$dominantBlockerCode]
  }

$hopDefinitions = @(
  [pscustomobject]@{
    name = "loopback_api"
    baseUrl = "http://127.0.0.1:4010"
    requestHostHeader = ""
    ensureWorkerStarted = $true
  },
  [pscustomobject]@{
    name = "windows_edge_forced_host"
    baseUrl = $WindowsEdgeBaseUrl.TrimEnd("/")
    requestHostHeader = $PublicHostHeader
    ensureWorkerStarted = $false
  },
  [pscustomobject]@{
    name = "ubuntu_public_owner"
    baseUrl = $PublicApiBaseUrl.TrimEnd("/")
    requestHostHeader = ""
    ensureWorkerStarted = $false
  }
)
$hopOrder = @($hopDefinitions | ForEach-Object { $_.name })
$hopResults = [ordered]@{}

foreach ($hop in $hopDefinitions) {
  $hopResults[$hop.name] = Invoke-HopProbe `
    -CurrentHopName $hop.name `
    -BaseUrl $hop.baseUrl `
    -RequestHostHeader $hop.requestHostHeader `
    -EnsureWorkerStarted:$hop.ensureWorkerStarted
}

$canaryStopResult = Stop-CanaryWorker -WorkerId $CanaryWorkerId
$canaryLifecycle = [pscustomobject][ordered]@{
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  workerId = $CanaryWorkerId
  startedByFirstHop = $true
  stopRequested = $true
  stopReason = "bounded_phase14_probe_cleanup"
  stopResult = $canaryStopResult
}

$firstFailingHop = $null

foreach ($hopName in $hopOrder) {
  if (-not $hopResults[$hopName].allChecksPassed) {
    $firstFailingHop = $hopName
    break
  }
}

$readyCount = [int]$classificationCounts.ready
$reauthRequiredCount = [int]$classificationCounts.reauth_required
$reachableButUnusableCount = [int]$classificationCounts.reachable_but_unusable
$disconnectedCount = [int]$classificationCounts.disconnected
$totalWorkers = @($truthWorkerIds).Count
$rootCauseConfirmed =
  -not [string]::IsNullOrWhiteSpace($dominantBlockerClass) -and
  -not [string]::IsNullOrWhiteSpace($firstFailingHop)
$verdict =
  if ($rootCauseConfirmed) {
    "root_cause_confirmed"
  } else {
    "hold_rollout"
  }
$summary =
  if ($verdict -eq "root_cause_confirmed") {
    "Zero-ready baseline is dominated by $dominantBlockerClass ($dominantBlockerClassCount/$totalWorkers), and the first failing canary hop is $firstFailingHop."
  } else {
    "Hold rollout: ready workers are $readyCount/$totalWorkers, dominant blocker class is $(if ($dominantBlockerClass) { $dominantBlockerClass } else { 'unknown' }), and first failing hop is $(if ($firstFailingHop) { $firstFailingHop } else { 'not proven' })."
  }

$result = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  sessionBaseUrl = $SessionBaseUrl.TrimEnd("/")
  publicBaseUrl = $PublicApiBaseUrl.TrimEnd("/")
  internalBaseUrl = $InternalBaseUrl.TrimEnd("/")
  hostControllerBaseUrl = $HostControllerBaseUrl.TrimEnd("/")
  windowsEdgeBaseUrl = $WindowsEdgeBaseUrl.TrimEnd("/")
  publicHostHeader = $PublicHostHeader
  canaryWorkerId = $CanaryWorkerId
  requestedWorkerIds = @($requestedWorkerIds)
  verdict = $verdict
  summary = $summary
  readyCount = $readyCount
  totalWorkers = $totalWorkers
  reauthRequiredCount = $reauthRequiredCount
  reachableButUnusableCount = $reachableButUnusableCount
  disconnectedCount = $disconnectedCount
  dominantBlockerClass = $dominantBlockerClass
  dominantBlockerClassCount = $dominantBlockerClassCount
  dominantBlockerCode = $dominantBlockerCode
  dominantBlockerCodeCount = $dominantBlockerCodeCount
  firstFailingHop = $firstFailingHop
  hopOrder = @($hopOrder)
  classificationCounts = [pscustomobject][ordered]@{
    ready = $readyCount
    reauth_required = $reauthRequiredCount
    reachable_but_unusable = $reachableButUnusableCount
    disconnected = $disconnectedCount
  }
  blockerCodeCounts = Convert-CountMapToObject -Map $blockerCodeCounts
  inventory = [pscustomobject][ordered]@{
    observedWorkerIds = @($observedWorkerIds)
    missingRequestedWorkerIds = @($missingRequestedWorkerIds)
    extraObservedWorkerIds = @($extraObservedWorkerIds)
    inventoryMismatch =
      @($missingRequestedWorkerIds).Count -gt 0 -or
      @($extraObservedWorkerIds).Count -gt 0
  }
  baselineSnapshot = $baselineSnapshot
  hopResults = [pscustomobject]$hopResults
  canaryLifecycle = $canaryLifecycle
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
  $lines += "# Zero-Ready Root Cause Summary"
  $lines += ""
  $lines += "- Generated: $($result.generatedAt)"
  $lines += "- Script compatibility version: $($result.scriptCompatibilityVersion)"
  $lines += "- Verdict: $($result.verdict)"
  $lines += "- Summary: $($result.summary)"
  $lines += "- Canary worker: $($result.canaryWorkerId)"
  $lines += "- Ready workers: $($result.readyCount)/$($result.totalWorkers)"
  $lines += "- Dominant blocker class: $(if ($result.dominantBlockerClass) { $result.dominantBlockerClass } else { 'unknown' })"
  $lines += "- Dominant blocker code: $(if ($result.dominantBlockerCode) { $result.dominantBlockerCode } else { 'unknown' })"
  $lines += "- First failing hop: $(if ($result.firstFailingHop) { $result.firstFailingHop } else { 'not proven' })"
  $lines += "- Inventory mismatch: $($result.inventory.inventoryMismatch)"
  $lines += ""
  $lines += "## Baseline Counts"
  $lines += ""
  $lines += "- reauth_required: $($result.reauthRequiredCount)"
  $lines += "- reachable_but_unusable: $($result.reachableButUnusableCount)"
  $lines += "- disconnected: $($result.disconnectedCount)"
  $lines += ""
  $lines += "## Hop Results"
  $lines += ""
  $lines += "| Hop | Passed | healthz | models | chat | Host header | Server | Via |"
  $lines += "|-----|--------|---------|--------|------|-------------|--------|-----|"

  foreach ($hopName in $hopOrder) {
    $hopResult = $result.hopResults.$hopName
    $lines += "| $hopName | $($hopResult.allChecksPassed) | $($hopResult.healthz.statusCode) | $($hopResult.models.statusCode) | $($hopResult.chat.statusCode) | $(if ($hopResult.requestHostHeader) { $hopResult.requestHostHeader } else { 'none' }) | $(if ($hopResult.chat.serverHeader) { $hopResult.chat.serverHeader } else { 'n/a' }) | $(if ($hopResult.chat.viaHeader) { $hopResult.chat.viaHeader } else { 'n/a' }) |"
  }

  $lines += ""
  $lines += "## Worker Blockers"
  $lines += ""
  $lines += "| Worker | Class | Blocker | Runtime capability | Runtime status | Agent | Browser |"
  $lines += "|--------|-------|---------|--------------------|----------------|-------|---------|"

  foreach ($worker in $workerResults) {
    $lines += "| $($worker.workerId) | $($worker.classification) | $(if ($worker.blockerCode) { $worker.blockerCode } else { 'none' }) | $(if ($worker.runtimeCapability) { $worker.runtimeCapability } else { 'n/a' }) | $(if ($worker.runtimeStatus) { $worker.runtimeStatus } else { 'n/a' }) | $($worker.hostController.agentListening) | $($worker.hostController.browserListening) |"
  }

  $lines | Set-Content -Path $OutputMarkdownPath -Encoding UTF8
}

$jsonOutput
