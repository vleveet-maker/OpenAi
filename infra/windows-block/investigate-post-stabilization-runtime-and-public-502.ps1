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
  [int]$PostCanaryDelaySeconds = 10,
  [int]$PostSmokeDelaySeconds = 15,
  [switch]$KeepCanaryRunningUntilFinalSnapshot,
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptCompatibilityVersion = "phase18-runtime-remediation-v1"

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
    runtimeCapability = $Worker.runtimeCapability
    runtimeMode = $Worker.runtimeMode
    runtimeClass = $Worker.runtimeClass
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
    readyWorkers = @($workerList | Where-Object { $_.status.status -eq "ready" }).Count
    reauthRequiredWorkers = @($workerList | Where-Object { $_.status.status -eq "reauth_required" }).Count
    disconnectedWorkers = @($workerList | Where-Object { $_.status.status -eq "disconnected" }).Count
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
    lastEventAt = $Payload.lastEventAt
  }
}

function Get-WorkerAgentPort {
  param([string]$WorkerId)

  switch ($WorkerId) {
    "dad" { return 4021 }
    "wife" { return 4022 }
    default {
      if ($WorkerId -match "^shared-(\d+)$") {
        return 4022 + [int]$Matches[1]
      }

      return $null
    }
  }
}

function Get-ListeningPortEvidence {
  param([int[]]$Ports)

  $evidence = @()
  $connections = @()

  if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
    $connections = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object {
      $_.LocalPort -in $Ports
    })
  }

  foreach ($port in $Ports) {
    $match = @($connections | Where-Object { $_.LocalPort -eq $port })[0]
    $processName = $null
    $owningProcessId = $null

    if ($null -ne $match) {
      $owningProcessId = $match.OwningProcess
      $process = Get-Process -Id $owningProcessId -ErrorAction SilentlyContinue

      if ($null -ne $process) {
        $processName = $process.ProcessName
      }
    }

    $evidence += [pscustomobject][ordered]@{
      port = $port
      listening = $null -ne $match
      localAddress =
        if ($null -ne $match) {
          $match.LocalAddress
        } else {
          $null
        }
      owningProcessId = $owningProcessId
      processName = $processName
    }
  }

  return $evidence
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

function Wait-ForWorkerReady {
  param(
    [string]$CurrentWorkerId,
    [int]$WaitTimeoutSeconds = 45
  )

  $deadline = (Get-Date).AddSeconds($WaitTimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    $health = Invoke-JsonRequest `
      -Method "GET" `
      -Url "$($HostControllerBaseUrl.TrimEnd('/'))/health" `
      -Headers $hostControllerHeaders `
      -RequestTimeoutSeconds 20
    $worker = @($health.workers | Where-Object { $_.workerId -eq $CurrentWorkerId })[0]

    if ($null -ne $worker -and $worker.agentListening -and $worker.browserListening) {
      return
    }

    Start-Sleep -Milliseconds 1500
  }
}

function Start-CanaryWorker {
  $null = Invoke-JsonRequest `
    -Method "POST" `
    -Url "$($HostControllerBaseUrl.TrimEnd('/'))/workers/$CanaryWorkerId/start" `
    -Headers $hostControllerHeaders `
    -Body @{
      runtimeMode = "visible_auth"
      profileStrategy = "durable"
      browserWindowMode = "CompactCorner"
    } `
    -RequestTimeoutSeconds 30

  Wait-ForWorkerReady -CurrentWorkerId $CanaryWorkerId
}

function Stop-Worker {
  param([string]$WorkerId)

  try {
    $null = Invoke-JsonRequest `
      -Method "POST" `
      -Url "$($HostControllerBaseUrl.TrimEnd('/'))/workers/$WorkerId/stop" `
      -Headers $hostControllerHeaders `
      -Body @{} `
      -RequestTimeoutSeconds 20

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

function Invoke-HopProbe {
  param(
    [string]$CurrentHopName,
    [string]$BaseUrl,
    [string]$RequestHostHeader = ""
  )

  $args = @(
    "-BaseUrl", $BaseUrl.TrimEnd("/"),
    "-WorkerId", $CanaryWorkerId,
    "-HostControllerBaseUrl", $HostControllerBaseUrl,
    "-HostControllerToken", $HostControllerToken,
    "-IncludeChatProbe",
    "-HopName", $CurrentHopName
  )

  if (-not [string]::IsNullOrWhiteSpace($RequestHostHeader)) {
    $args += @("-HostHeader", $RequestHostHeader)
  }

  if (-not [string]::IsNullOrWhiteSpace($ApiToken)) {
    $args += @("-ApiToken", $ApiToken)
  }

  if (-not [string]::IsNullOrWhiteSpace($SettingsPath)) {
    $args += @("-SettingsPath", $SettingsPath)
  }

  return (& $probeScriptPath @args) | ConvertFrom-Json
}

function Convert-ProbeToHopStatus {
  param([object]$Probe)

  $chatPayload =
    if ($null -ne $Probe.chatCompletions) {
      ConvertFrom-JsonSafe -Raw $Probe.chatCompletions.body
    } else {
      $null
    }
  $replyText =
    if (
      $null -ne $chatPayload -and
      $null -ne $chatPayload.choices -and
      @($chatPayload.choices).Count -gt 0 -and
      $null -ne $chatPayload.choices[0].message
    ) {
      [string]$chatPayload.choices[0].message.content
    } else {
      $null
    }
  $healthOk = $Probe.healthz.success -eq $true -and [int]$Probe.healthz.statusCode -ge 200 -and [int]$Probe.healthz.statusCode -lt 400
  $modelsOk = $Probe.models.success -eq $true -and [int]$Probe.models.statusCode -ge 200 -and [int]$Probe.models.statusCode -lt 400
  $chatOk = $Probe.chatCompletions.success -eq $true -and [int]$Probe.chatCompletions.statusCode -ge 200 -and [int]$Probe.chatCompletions.statusCode -lt 400 -and $replyText -eq "probe-ok"

  return [pscustomobject][ordered]@{
    hopName = $Probe.hopName
    passed = [bool]($healthOk -and $modelsOk -and $chatOk)
    healthzStatusCode = $Probe.healthz.statusCode
    modelsStatusCode = $Probe.models.statusCode
    chatStatusCode = $Probe.chatCompletions.statusCode
    chatReply = $replyText
    requestHostHeader = $Probe.requestHostHeader
    serverHeader =
      if ($null -ne $Probe.chatCompletions) {
        $Probe.chatCompletions.serverHeader
      } else {
        $null
      }
    errorKind =
      if ($chatOk) {
        $null
      } else {
        $Probe.chatCompletions.errorKind
      }
  }
}

function Get-RuntimeSnapshot {
  $internalBase = $InternalBaseUrl.TrimEnd("/")
  $hostControllerBase = $HostControllerBaseUrl.TrimEnd("/")
  $trackedPorts = @(4021..4029) + @(4040, 8080, 8081)
  $hostHealth = Invoke-JsonRequest -Method "GET" -Url "$hostControllerBase/health" -Headers $hostControllerHeaders -RequestTimeoutSeconds $TimeoutSeconds
  $poolPayload = Invoke-JsonRequest -Method "GET" -Url "$internalBase/internal/host-pool" -Headers $internalHeaders -RequestTimeoutSeconds $TimeoutSeconds
  $workersPayload = Invoke-JsonRequest -Method "GET" -Url "$internalBase/internal/workers" -Headers $internalHeaders -RequestTimeoutSeconds $TimeoutSeconds
  $observabilityPayload = Invoke-JsonRequest -Method "GET" -Url "$internalBase/internal/observability/summary" -Headers $internalHeaders -RequestTimeoutSeconds $TimeoutSeconds
  $hostWorkers = @($hostHealth.workers | ForEach-Object { Normalize-HostWorker -Worker $_ })
  $internalWorkers = @($workersPayload.workers | ForEach-Object { Normalize-InternalWorker -Worker $_ })
  $canaryPort = Get-WorkerAgentPort -WorkerId $CanaryWorkerId
  $listenerEvidence = Get-ListeningPortEvidence -Ports $trackedPorts

  return [pscustomobject][ordered]@{
    capturedAt = (Get-Date).ToString("o")
    hostController = [pscustomobject][ordered]@{
      status = $hostHealth.status
      proxyListening = [bool]$hostHealth.proxyListening
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
    localRuntime = [pscustomobject][ordered]@{
      trackedPorts = $listenerEvidence
      canaryWorkerAgentPort = $canaryPort
      canaryWorkerAgentListening =
        if ($null -ne $canaryPort) {
          @($listenerEvidence | Where-Object { $_.port -eq $canaryPort -and $_.listening }).Count -gt 0
        } else {
          $false
        }
      hostControllerListening = @($listenerEvidence | Where-Object { $_.port -eq 4040 -and $_.listening }).Count -gt 0
      sessionClientListening = @($listenerEvidence | Where-Object { $_.port -eq 8080 -and $_.listening }).Count -gt 0
      internalApiListening = @($listenerEvidence | Where-Object { $_.port -eq 8081 -and $_.listening }).Count -gt 0
    }
  }
}

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\\phases\\17-deployed-windows-post-stabilization-degraded-runtime-and-repeated-public-canary-502-investigation"
$probeScriptPath = Join-Path $PSScriptRoot "probe-public-api.ps1"
$smokeScriptPath = Join-Path $PSScriptRoot "test-rollout-smoke.ps1"
$internalHeaders = @{ "x-internal-admin-token" = $InternalAdminToken }
$hostControllerHeaders = @{ "x-host-controller-token" = $HostControllerToken }
$tempSmokeJsonPath = Join-Path $phaseDir "17-TEMP-SMOKE.json"
$tempSmokeMarkdownPath = Join-Path $phaseDir "17-TEMP-SMOKE.md"

if (-not (Test-Path $probeScriptPath)) {
  throw "Missing runtime investigation dependency: $probeScriptPath"
}

if (-not (Test-Path $smokeScriptPath)) {
  throw "Missing runtime investigation dependency: $smokeScriptPath"
}

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\\data\\post-stabilization-runtime-investigation\\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "17-RUNTIME-INVESTIGATION-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "17-RUNTIME-INVESTIGATION-SUMMARY.md"
}

$stageOrder = @(
  "before_runtime_probe",
  "after_canary_start",
  "after_loopback_probe",
  "after_public_probe",
  "after_smoke_settle",
  "after_cleanup"
)
$stageSnapshots = [ordered]@{
  before_runtime_probe = $null
  after_canary_start = $null
  after_loopback_probe = $null
  after_public_probe = $null
  after_smoke_settle = $null
  after_cleanup = $null
}
$hopResults = [ordered]@{}

$stageSnapshots.before_runtime_probe = Get-RuntimeSnapshot
Start-CanaryWorker

if ($RecoveryWaitSeconds -gt 0) {
  Start-Sleep -Seconds $RecoveryWaitSeconds
}

$stageSnapshots.after_canary_start = Get-RuntimeSnapshot
$loopbackProbe = Invoke-HopProbe -CurrentHopName "loopback_api" -BaseUrl "http://127.0.0.1:4010"
$hopResults.loopback_api = Convert-ProbeToHopStatus -Probe $loopbackProbe

if ($PostCanaryDelaySeconds -gt 0) {
  Start-Sleep -Seconds $PostCanaryDelaySeconds
}

$stageSnapshots.after_loopback_probe = Get-RuntimeSnapshot
$forcedHostProbe = Invoke-HopProbe -CurrentHopName "windows_edge_forced_host" -BaseUrl $WindowsEdgeBaseUrl -RequestHostHeader $PublicHostHeader
$hopResults.windows_edge_forced_host = Convert-ProbeToHopStatus -Probe $forcedHostProbe
$publicOwnerProbe = Invoke-HopProbe -CurrentHopName "ubuntu_public_owner" -BaseUrl $PublicApiBaseUrl
$hopResults.ubuntu_public_owner = Convert-ProbeToHopStatus -Probe $publicOwnerProbe
$stageSnapshots.after_public_probe = Get-RuntimeSnapshot

$smokeArgs = @(
  "-PublicBaseUrl", $PublicApiBaseUrl,
  "-InternalBaseUrl", $InternalBaseUrl,
  "-HostControllerBaseUrl", $HostControllerBaseUrl,
  "-InternalAdminToken", $InternalAdminToken,
  "-HostControllerToken", $HostControllerToken,
  "-CanaryWorkerId", $CanaryWorkerId,
  "-TimeoutSeconds", $TimeoutSeconds,
  "-PostCanaryDelaySeconds", $PostCanaryDelaySeconds,
  "-PostSmokeDelaySeconds", $PostSmokeDelaySeconds,
  "-LatestJsonPath", $tempSmokeJsonPath,
  "-OutputJsonPath", $tempSmokeJsonPath,
  "-OutputMarkdownPath", $tempSmokeMarkdownPath
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

$null = & $smokeScriptPath @smokeArgs
$smokeResult = ConvertFrom-JsonSafe -Raw (Get-Content -Path $tempSmokeJsonPath -Raw)

$stageSnapshots.after_smoke_settle =
  if ($null -ne $smokeResult -and $null -ne $smokeResult.stageSnapshots -and $null -ne $smokeResult.stageSnapshots.after_settle) {
    $smokeResult.stageSnapshots.after_settle
  } else {
    $null
  }
$stageSnapshots.after_cleanup = Get-RuntimeSnapshot

$finalInternalWorkers = @($stageSnapshots.after_cleanup.internal.workers.workers)
$finalHostWorkers = @($stageSnapshots.after_cleanup.hostController.workers)
$workerIdsFromSnapshots = @(
  $stageSnapshots.before_runtime_probe.internal.workers.workers | ForEach-Object { $_.workerId }
  $stageSnapshots.after_cleanup.internal.workers.workers | ForEach-Object { $_.workerId }
  $stageSnapshots.after_cleanup.hostController.workers | ForEach-Object { $_.workerId }
)
$truthWorkerIds = @($WorkerIds)

if (@($truthWorkerIds).Count -eq 0) {
  $truthWorkerIds = @($workerIdsFromSnapshots | Sort-Object -Unique)
}

$finalInternalMap = Get-WorkerMap -Workers $finalInternalWorkers
$finalHostMap = Get-WorkerMap -Workers $finalHostWorkers
$classificationCounts = @{
  reauth_required = 0
  reachable_but_unusable = 0
  disconnected = 0
}
$workerResults = @()

foreach ($workerId in @($truthWorkerIds | Sort-Object -Unique)) {
  $internalWorker =
    if ($finalInternalMap.ContainsKey($workerId)) {
      $finalInternalMap[$workerId]
    } else {
      $null
    }
  $hostWorker =
    if ($finalHostMap.ContainsKey($workerId)) {
      $finalHostMap[$workerId]
    } else {
      $null
    }
  $classification = Get-WorkerClassification -InternalWorker $internalWorker -HostWorker $hostWorker

  if ($classification -ne "ready") {
    $classificationCounts[$classification] = [int]$classificationCounts[$classification] + 1
  }

  $workerResults += [pscustomobject][ordered]@{
    workerId = $workerId
    classification = $classification
    internalStatus =
      if ($null -ne $internalWorker) {
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
    lastBootstrapFailureCode =
      if ($null -ne $internalWorker) {
        $internalWorker.lastBootstrapFailureCode
      } else {
        $null
      }
    hostAgentListening =
      if ($null -ne $hostWorker) {
        [bool]$hostWorker.agentListening
      } else {
        $false
      }
    hostBrowserListening =
      if ($null -ne $hostWorker) {
        [bool]$hostWorker.browserListening
      } else {
        $false
      }
  }
}

$preInvestigationReadyCount = $stageSnapshots.before_runtime_probe.internal.workers.readyWorkers
$postCanaryReadyCount = $stageSnapshots.after_canary_start.internal.workers.readyWorkers
$finalReadyCount = $stageSnapshots.after_cleanup.internal.workers.readyWorkers
$dominantRuntimeBlocker = Get-DominantMapKey -Map $classificationCounts
$firstFailingHop = $null

foreach ($hopName in @("loopback_api", "windows_edge_forced_host", "ubuntu_public_owner")) {
  if ($hopResults[$hopName].passed -ne $true) {
    $firstFailingHop = $hopName
    break
  }
}

if ($null -eq $firstFailingHop -and $null -ne $smokeResult -and $smokeResult.publicCanary.chat.ok -ne $true) {
  $firstFailingHop = "smoke_contract"
}

$verdict =
  if (
    -not [string]::IsNullOrWhiteSpace($dominantRuntimeBlocker) -and
    -not [string]::IsNullOrWhiteSpace($firstFailingHop)
  ) {
    "runtime_blocker_confirmed"
  } else {
    "hold_rollout"
  }
$summary =
  if ($verdict -eq "runtime_blocker_confirmed") {
    "Post-stabilization runtime blocker is $dominantRuntimeBlocker and the first failing hop is $firstFailingHop."
  } else {
    "Hold rollout: preInvestigationReadyCount=$preInvestigationReadyCount, postCanaryReadyCount=$postCanaryReadyCount, finalReadyCount=$finalReadyCount, dominantRuntimeBlocker=$(if ($dominantRuntimeBlocker) { $dominantRuntimeBlocker } else { 'unknown' }), firstFailingHop=$(if ($firstFailingHop) { $firstFailingHop } else { 'not proven' })."
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
  workerIds = @($truthWorkerIds)
  recoveryWaitSeconds = $RecoveryWaitSeconds
  postCanaryDelaySeconds = $PostCanaryDelaySeconds
  postSmokeDelaySeconds = $PostSmokeDelaySeconds
  keepCanaryRunningUntilFinalSnapshot = [bool]$KeepCanaryRunningUntilFinalSnapshot
  preInvestigationReadyCount = $preInvestigationReadyCount
  postCanaryReadyCount = $postCanaryReadyCount
  finalReadyCount = $finalReadyCount
  dominantRuntimeBlocker = $dominantRuntimeBlocker
  firstFailingHop = $firstFailingHop
  verdict = $verdict
  summary = $summary
  stageOrder = $stageOrder
  stageSnapshots = [pscustomobject]$stageSnapshots
  hopResults = [pscustomobject]$hopResults
  smoke = $smokeResult
  workerResults = $workerResults
  preserveFirst = [pscustomobject][ordered]@{
    profilesDeleted = $false
    cookiesCleared = $false
    localStorageCleared = $false
    blindFullPoolRestartPerformed = $false
    massReloginPerformed = $false
  }
}

$jsonOutput = $result | ConvertTo-Json -Depth 14

Ensure-ParentDirectory -Path $LatestJsonPath
$jsonOutput | Set-Content -Path $LatestJsonPath -Encoding UTF8
Ensure-ParentDirectory -Path $OutputJsonPath
$jsonOutput | Set-Content -Path $OutputJsonPath -Encoding UTF8
Ensure-ParentDirectory -Path $OutputMarkdownPath

$lines = @()
$lines += "# Post-Stabilization Runtime Investigation Summary"
$lines += ""
$lines += "- Generated: $($result.generatedAt)"
$lines += "- Script compatibility version: $($result.scriptCompatibilityVersion)"
$lines += "- Verdict: $($result.verdict)"
$lines += "- Summary: $($result.summary)"
$lines += "- Canary worker: $($result.canaryWorkerId)"
$lines += "- Pre-investigation ready count: $($result.preInvestigationReadyCount)"
$lines += "- Post-canary ready count: $($result.postCanaryReadyCount)"
$lines += "- Final ready count: $($result.finalReadyCount)"
$lines += "- Dominant runtime blocker: $(if ($result.dominantRuntimeBlocker) { $result.dominantRuntimeBlocker } else { 'unknown' })"
$lines += "- First failing hop: $(if ($result.firstFailingHop) { $result.firstFailingHop } else { 'not proven' })"
$lines += "- Stage order: $(@($result.stageOrder) -join ', ')"
$lines += ""
$lines += "## Hop Results"
$lines += ""
$lines += "| Hop | Passed | healthz | models | chat | Error |"
$lines += "|-----|--------|---------|--------|------|-------|"

foreach ($hopName in @("loopback_api", "windows_edge_forced_host", "ubuntu_public_owner")) {
  $hop = $result.hopResults.$hopName
  $lines += "| $hopName | $($hop.passed) | $($hop.healthzStatusCode) | $($hop.modelsStatusCode) | $($hop.chatStatusCode) | $(if ($hop.errorKind) { $hop.errorKind } else { 'none' }) |"
}

$lines += ""
$lines += "## Final Worker Classes"
$lines += ""
$lines += "| Worker | Class | Internal status | Runtime capability | Runtime status | Agent | Browser |"
$lines += "|--------|-------|-----------------|--------------------|----------------|-------|---------|"

foreach ($worker in $workerResults) {
  $lines += "| $($worker.workerId) | $($worker.classification) | $(if ($worker.internalStatus) { $worker.internalStatus } else { 'n/a' }) | $(if ($worker.runtimeCapability) { $worker.runtimeCapability } else { 'n/a' }) | $(if ($worker.runtimeStatus) { $worker.runtimeStatus } else { 'n/a' }) | $($worker.hostAgentListening) | $($worker.hostBrowserListening) |"
}

$lines | Set-Content -Path $OutputMarkdownPath -Encoding UTF8

$jsonOutput
