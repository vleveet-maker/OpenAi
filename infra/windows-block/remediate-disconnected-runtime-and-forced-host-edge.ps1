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
    runtimeStatus = $Worker.runtimeStatus
  }
}

function Normalize-InternalWorker {
  param([object]$Worker)

  $statusValue = $null
  $statusPayload = $Worker.status

  if ($null -ne $statusPayload) {
    if ($statusPayload -is [string]) {
      $statusValue = [string]$statusPayload
    } elseif ($statusPayload.PSObject.Properties.Match("status").Count -gt 0) {
      $statusValue = $statusPayload.status
    }
  }

  return [pscustomobject][ordered]@{
    workerId = [string]$Worker.workerId
    displayName = [string]$Worker.displayName
    status =
      if (-not [string]::IsNullOrWhiteSpace($statusValue)) {
        $statusValue
      } else {
        $Worker.runtimeStatus
      }
    runtimeStatus = $Worker.runtimeStatus
    runtimeCapability = $Worker.runtimeCapability
    browserContextReady = $Worker.browserContextReady
    lastBootstrapFailureCode = $Worker.lastBootstrapFailureCode
    lastRelayFailureCode = $Worker.lastRelayFailureCode
  }
}

function New-InternalWorkersSummary {
  param([object[]]$Workers)

  $workerList = @($Workers)

  return [pscustomobject][ordered]@{
    totalWorkers = @($workerList).Count
    readyWorkers = @($workerList | Where-Object { $_.status -eq "ready" }).Count
    reauthRequiredWorkers = @($workerList | Where-Object { $_.status -eq "reauth_required" }).Count
    disconnectedWorkers = @($workerList | Where-Object { $_.status -eq "disconnected" }).Count
    workers = $workerList
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

  $hostWorkers = @($hostHealth.workers | ForEach-Object { Normalize-HostWorker -Worker $_ })
  $internalWorkers = @($workersPayload.workers | ForEach-Object { Normalize-InternalWorker -Worker $_ })

  return [pscustomobject][ordered]@{
    capturedAt = (Get-Date).ToString("o")
    hostController = [pscustomobject][ordered]@{
      status = $hostHealth.status
      poolStatus = $hostHealth.poolStatus
      proxyListening = [bool]$hostHealth.proxyListening
      workers = $hostWorkers
    }
    internal = [pscustomobject][ordered]@{
      pool = [pscustomobject][ordered]@{
        status = $poolPayload.pool.status
        controllerReachable = [bool]$poolPayload.pool.controllerReachable
        proxyListening = [bool]$poolPayload.pool.proxyListening
        lastAction = $poolPayload.pool.lastAction
        lastError = $poolPayload.pool.lastError
      }
      workers = New-InternalWorkersSummary -Workers $internalWorkers
    }
  }
}

function Get-WorkerMap {
  param([object[]]$Workers)

  $map = @{}

  foreach ($worker in @($Workers)) {
    if ($null -ne $worker -and -not [string]::IsNullOrWhiteSpace($worker.workerId)) {
      $map[$worker.workerId] = $worker
    }
  }

  return $map
}

function Get-WorkerClassification {
  param(
    [object]$InternalWorker,
    [object]$HostWorker
  )

  if ($null -ne $InternalWorker) {
    if ($InternalWorker.status -eq "ready") {
      return "ready"
    }

    if ($InternalWorker.status -eq "reauth_required") {
      return "reauth_required"
    }

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

    if ($InternalWorker.runtimeCapability) {
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

function Convert-ProbePayloadToHopResult {
  param(
    [Parameter(Mandatory = $true)]
    [object]$ProbePayload,
    [Parameter(Mandatory = $true)]
    [string]$CurrentHopName,
    [Parameter(Mandatory = $true)]
    [string]$FallbackWorkerId,
    [string]$RequestHostHeader = ""
  )

  $replyText = Get-ProbeChatReplyText -ProbePayload $ProbePayload
  $chatPayload = Get-ProbeChatPayload -ProbePayload $ProbePayload

  $result = [pscustomobject][ordered]@{
    hopName = $CurrentHopName
    passed =
      (Test-HopStepSuccess -Probe $ProbePayload.healthz) -and
      (Test-HopStepSuccess -Probe $ProbePayload.models) -and
      (Test-HopStepSuccess -Probe $ProbePayload.chatCompletions) -and
      $replyText -eq "probe-ok"
    healthzStatusCode = $ProbePayload.healthz.statusCode
    modelsStatusCode = $ProbePayload.models.statusCode
    chatStatusCode = $ProbePayload.chatCompletions.statusCode
    chatReply = $replyText
    requestHostHeader =
      if ([string]::IsNullOrWhiteSpace($RequestHostHeader)) {
        $ProbePayload.requestHostHeader
      } else {
        $RequestHostHeader
      }
    serverHeader = $ProbePayload.chatCompletions.serverHeader
    errorKind = $ProbePayload.chatCompletions.errorKind
    workerId =
      if ($null -ne $chatPayload -and -not [string]::IsNullOrWhiteSpace($chatPayload.worker_id)) {
        [string]$chatPayload.worker_id
      } else {
        $FallbackWorkerId
      }
  }

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

  $probeParams = @{
    BaseUrl = $BaseUrl.TrimEnd("/")
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
    $normalizedBase = $BaseUrl.TrimEnd("/")
    $probePayload = [pscustomobject][ordered]@{
      baseUrl = $normalizedBase
      requestHostHeader = $RequestHostHeader
      healthz = New-ProbeStepFailure -RequestUrl "$normalizedBase/healthz" -ErrorKind "probe_invocation_failed" -ErrorMessage $errorMessage -RequestHostHeader $RequestHostHeader -CurrentHopName $CurrentHopName
      models = New-ProbeStepFailure -RequestUrl "$normalizedBase/v1/models" -ErrorKind "probe_invocation_failed" -ErrorMessage $errorMessage -RequestHostHeader $RequestHostHeader -CurrentHopName $CurrentHopName
      chatCompletions = New-ProbeStepFailure -RequestUrl "$normalizedBase/v1/chat/completions" -ErrorKind "probe_invocation_failed" -ErrorMessage $errorMessage -RequestHostHeader $RequestHostHeader -CurrentHopName $CurrentHopName
    }
  }

  return Convert-ProbePayloadToHopResult `
    -ProbePayload $probePayload `
    -CurrentHopName $CurrentHopName `
    -FallbackWorkerId $CanaryWorkerId `
    -RequestHostHeader $RequestHostHeader
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

  if ($WorkerResult.afterClassification -eq "ready" -and $WorkerResult.remediated) {
    return "remediated"
  }

  if ($WorkerResult.afterClassification -eq "ready") {
    return "ready"
  }

  return $WorkerResult.afterBlockerCode
}

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\\phases\\18-deployed-windows-disconnected-runtime-remediation-forced-host-edge-repair-and-runtime-parity-resync"
$probeScriptPath = Join-Path $PSScriptRoot "probe-public-api.ps1"
$recoveryScriptPath = Join-Path $PSScriptRoot "recover-browser-block-readiness.ps1"
$temporaryRecoveryJsonPath = Join-Path $phaseDir "18-TEMP-RECOVERY.json"
$temporaryRecoveryMarkdownPath = Join-Path $phaseDir "18-TEMP-RECOVERY.md"
$internalHeaders = @{
  "x-internal-admin-token" = $InternalAdminToken
}
$hostControllerHeaders = @{
  "x-host-controller-token" = $HostControllerToken
}

if (-not (Test-Path $probeScriptPath)) {
  throw "Missing remediation dependency: $probeScriptPath"
}

if (-not (Test-Path $recoveryScriptPath)) {
  throw "Missing remediation dependency: $recoveryScriptPath"
}

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\\data\\disconnected-runtime-remediation\\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "18-REMEDIATION-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "18-REMEDIATION-SUMMARY.md"
}

$stageOrder = @(
  "before_runtime_remediation",
  "after_targeted_reconnect",
  "after_loopback_probe",
  "after_forced_host_probe",
  "after_public_owner_probe",
  "after_canary_stop"
)
$stageSnapshots = [ordered]@{
  before_runtime_remediation = $null
  after_targeted_reconnect = $null
  after_loopback_probe = $null
  after_forced_host_probe = $null
  after_public_owner_probe = $null
  after_canary_stop = $null
}
$hopResults = [ordered]@{}

$stageSnapshots.before_runtime_remediation = Get-StageSnapshot
$requestedWorkerIds =
  if (@($WorkerIds).Count -gt 0) {
    Get-OrderedUniqueStrings -Values $WorkerIds
  } else {
    Get-OrderedUniqueStrings -Values @(
      @($stageSnapshots.before_runtime_remediation.internal.workers.workers | ForEach-Object { $_.workerId })
      @($stageSnapshots.before_runtime_remediation.hostController.workers | ForEach-Object { $_.workerId })
    )
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
$recoveryResult =
  if (Test-Path $temporaryRecoveryJsonPath) {
    ConvertFrom-JsonSafe -Raw (Get-Content -Path $temporaryRecoveryJsonPath -Raw)
  } else {
    $null
  }

Start-Sleep -Seconds $RecoveryWaitSeconds
$stageSnapshots.after_targeted_reconnect = Get-StageSnapshot
$hopResults.loopback_api = Invoke-HopProbe `
  -CurrentHopName "loopback_api" `
  -BaseUrl "http://127.0.0.1:4010" `
  -EnsureWorkerStarted
$stageSnapshots.after_loopback_probe = Get-StageSnapshot
$hopResults.windows_edge_forced_host = Invoke-HopProbe `
  -CurrentHopName "windows_edge_forced_host" `
  -BaseUrl $WindowsEdgeBaseUrl `
  -RequestHostHeader $PublicHostHeader

if ($EdgeSettleSeconds -gt 0) {
  Start-Sleep -Seconds $EdgeSettleSeconds
}

$stageSnapshots.after_forced_host_probe = Get-StageSnapshot
$hopResults.ubuntu_public_owner = Invoke-HopProbe `
  -CurrentHopName "ubuntu_public_owner" `
  -BaseUrl $PublicApiBaseUrl
$stageSnapshots.after_public_owner_probe = Get-StageSnapshot
$canaryStopResult = Stop-Worker -WorkerId $CanaryWorkerId
$stageSnapshots.after_canary_stop = Get-StageSnapshot

$beforeInternalMap = Get-WorkerMap -Workers $stageSnapshots.before_runtime_remediation.internal.workers.workers
$beforeHostMap = Get-WorkerMap -Workers $stageSnapshots.before_runtime_remediation.hostController.workers
$afterInternalMap = Get-WorkerMap -Workers $stageSnapshots.after_targeted_reconnect.internal.workers.workers
$afterHostMap = Get-WorkerMap -Workers $stageSnapshots.after_targeted_reconnect.hostController.workers
$truthWorkerIds = Get-OrderedUniqueStrings -Values @(
  $requestedWorkerIds
  @($stageSnapshots.before_runtime_remediation.internal.workers.workers | ForEach-Object { $_.workerId })
  @($stageSnapshots.after_canary_stop.internal.workers.workers | ForEach-Object { $_.workerId })
)
$remainingClassCounts = @{
  reauth_required = 0
  reachable_but_unusable = 0
  disconnected = 0
}
$workerResults = @()

foreach ($workerId in $truthWorkerIds) {
  $beforeInternalWorker = if ($beforeInternalMap.ContainsKey($workerId)) { $beforeInternalMap[$workerId] } else { $null }
  $beforeHostWorker = if ($beforeHostMap.ContainsKey($workerId)) { $beforeHostMap[$workerId] } else { $null }
  $afterInternalWorker = if ($afterInternalMap.ContainsKey($workerId)) { $afterInternalMap[$workerId] } else { $null }
  $afterHostWorker = if ($afterHostMap.ContainsKey($workerId)) { $afterHostMap[$workerId] } else { $null }
  $beforeClassification = Get-WorkerClassification -InternalWorker $beforeInternalWorker -HostWorker $beforeHostWorker
  $afterClassification = Get-WorkerClassification -InternalWorker $afterInternalWorker -HostWorker $afterHostWorker
  $afterBlockerCode = Get-WorkerBlockerCode -InternalWorker $afterInternalWorker -HostWorker $afterHostWorker -Classification $afterClassification
  $remediated = $beforeClassification -ne "ready" -and $afterClassification -eq "ready"

  if ($afterClassification -ne "ready") {
    $remainingClassCounts[$afterClassification] = [int]$remainingClassCounts[$afterClassification] + 1
  }

  $workerResults += [pscustomobject][ordered]@{
    workerId = $workerId
    beforeClassification = $beforeClassification
    afterClassification = $afterClassification
    afterBlockerCode = $afterBlockerCode
    remediated = $remediated
  }
}

$preRemediationReadyCount = $stageSnapshots.before_runtime_remediation.internal.workers.readyWorkers
$preRemediationTotalWorkers = $stageSnapshots.before_runtime_remediation.internal.workers.totalWorkers
$postRemediationReadyCount = $stageSnapshots.after_targeted_reconnect.internal.workers.readyWorkers
$postRemediationTotalWorkers = $stageSnapshots.after_targeted_reconnect.internal.workers.totalWorkers
$dominantRuntimeBlocker = Get-DominantCountKey -Map $remainingClassCounts
$firstFailingHop = $null

foreach ($hopName in @("loopback_api", "windows_edge_forced_host", "ubuntu_public_owner")) {
  if ($hopResults[$hopName].passed -ne $true) {
    $firstFailingHop = $hopName
    break
  }
}

$verdict =
  if (
    $postRemediationReadyCount -eq $postRemediationTotalWorkers -and
    $hopResults.loopback_api.passed -eq $true -and
    $hopResults.windows_edge_forced_host.passed -eq $true -and
    $hopResults.ubuntu_public_owner.passed -eq $true
  ) {
    "remediated_ready_for_smoke"
  } else {
    "hold_rollout"
  }
$summary =
  if ($verdict -eq "remediated_ready_for_smoke") {
    "Disconnected runtime remediation recovered $postRemediationReadyCount/$postRemediationTotalWorkers workers and all hop checks are green, so the host is ready for a fresh smoke rerun."
  } else {
    "Hold rollout: preRemediationReadyCount=$preRemediationReadyCount/$preRemediationTotalWorkers, postRemediationReadyCount=$postRemediationReadyCount/$postRemediationTotalWorkers, dominantRuntimeBlocker=$(if ($dominantRuntimeBlocker) { $dominantRuntimeBlocker } else { 'none' }), firstFailingHop=$(if ($firstFailingHop) { $firstFailingHop } else { 'not_proven' })."
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
  recoveryWaitSeconds = $RecoveryWaitSeconds
  edgeSettleSeconds = $EdgeSettleSeconds
  stageOrder = @($stageOrder)
  stageSnapshots = [pscustomobject]$stageSnapshots
  hopResults = [pscustomobject]$hopResults
  preRemediationReadyCount = $preRemediationReadyCount
  preRemediationTotalWorkers = $preRemediationTotalWorkers
  postRemediationReadyCount = $postRemediationReadyCount
  postRemediationTotalWorkers = $postRemediationTotalWorkers
  dominantRuntimeBlocker =
    if ($dominantRuntimeBlocker) { $dominantRuntimeBlocker } else { "none" }
  firstFailingHop =
    if ($firstFailingHop) { $firstFailingHop } else { "not_proven" }
  forcedHostStatus = $hopResults.windows_edge_forced_host
  publicOwnerStatus = $hopResults.ubuntu_public_owner
  verdict = $verdict
  summary = $summary
  recovery = $recoveryResult
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
$lines += "# Disconnected Runtime Remediation Summary"
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
$lines += "## Runtime Remediation"
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

foreach ($workerResult in $workerResults) {
  $lines += "| $($workerResult.workerId) | $($workerResult.beforeClassification) | $($workerResult.afterClassification) | $($workerResult.remediated) | $(Get-WorkerMarkdownNote -WorkerResult $workerResult) |"
}

$lines | Set-Content -Path $OutputMarkdownPath -Encoding UTF8

$jsonOutput
