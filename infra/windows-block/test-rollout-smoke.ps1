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
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

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

function Invoke-InternalJsonRequest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url
  )

  return Invoke-RestMethod `
    -Method "GET" `
    -Uri $Url `
    -Headers @{
      "x-internal-admin-token" = $InternalAdminToken
    } `
    -TimeoutSec $TimeoutSeconds
}

function Get-WorkerStatusCount {
  param(
    [object[]]$Workers,
    [string]$Status
  )

  return @($Workers | Where-Object { $_.status.status -eq $Status }).Count
}

function Get-StabilityCount {
  param(
    [object[]]$Workers,
    [string]$Status
  )

  return @($Workers | Where-Object { $_.stabilityGateStatus -eq $Status }).Count
}

function Get-WorkerIdsByStatus {
  param(
    [object[]]$Workers,
    [string]$Status
  )

  return @(
    $Workers |
      Where-Object { $_.status.status -eq $Status } |
      ForEach-Object { $_.workerId }
  )
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

$repoRoot = Resolve-RepoRoot

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\\data\\rollout-smoke\\latest.json"
}

$internalBase = $InternalBaseUrl.TrimEnd("/")
$publicBase = $PublicBaseUrl.TrimEnd("/")
$probeScriptPath = Join-Path $PSScriptRoot "probe-public-api.ps1"

if (-not (Test-Path $probeScriptPath)) {
  throw "Missing rollout smoke dependency: $probeScriptPath"
}

$poolPayload = Invoke-InternalJsonRequest -Url "$internalBase/internal/host-pool"
$workersPayload = Invoke-InternalJsonRequest -Url "$internalBase/internal/workers"
$observabilityPayload = Invoke-InternalJsonRequest -Url "$internalBase/internal/observability/summary"
$workers = @($workersPayload.workers)

$probeArgs = @(
  "-BaseUrl",
  $publicBase,
  "-WorkerId",
  $CanaryWorkerId,
  "-HostControllerBaseUrl",
  $HostControllerBaseUrl,
  "-HostControllerToken",
  $HostControllerToken,
  "-IncludeChatProbe",
  "-EnsureWorkerStarted",
  "-StopWorkerWhenDone"
)

if (-not [string]::IsNullOrWhiteSpace($ApiToken)) {
  $probeArgs += @("-ApiToken", $ApiToken)
}

if (-not [string]::IsNullOrWhiteSpace($SettingsPath)) {
  $probeArgs += @("-SettingsPath", $SettingsPath)
}

$probePayload = (& $probeScriptPath @probeArgs) | ConvertFrom-Json
$chatPayload = ConvertFrom-JsonSafe -Raw $probePayload.chatCompletions.body
$chatMessage =
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
$publicHealthOk = Test-ProbeSuccess -Probe $probePayload.healthz
$publicModelsOk = Test-ProbeSuccess -Probe $probePayload.models
$publicChatOk = (Test-ProbeSuccess -Probe $probePayload.chatCompletions) -and $chatMessage -eq "probe-ok"

$readyWorkers = Get-WorkerStatusCount -Workers $workers -Status "ready"
$startingWorkers = Get-WorkerStatusCount -Workers $workers -Status "starting"
$reauthRequiredWorkers = Get-WorkerStatusCount -Workers $workers -Status "reauth_required"
$disconnectedWorkers = Get-WorkerStatusCount -Workers $workers -Status "disconnected"
$stableWorkers = Get-StabilityCount -Workers $workers -Status "stable"
$provisionalWorkers = Get-StabilityCount -Workers $workers -Status "provisional"
$unstableWorkers = Get-StabilityCount -Workers $workers -Status "unstable"
$verdict =
  if (
    $poolPayload.pool.status -eq "ready" -and
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
    "Pool is ready and the public canary path passed on $CanaryWorkerId."
  } else {
    "Hold rollout: pool status is $($poolPayload.pool.status), public healthz is $($probePayload.healthz.statusCode), public models is $($probePayload.models.statusCode), and public chat passed=$publicChatOk."
  }

$result = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  publicBaseUrl = $publicBase
  canaryWorkerId = $CanaryWorkerId
  expectedChatReply = "probe-ok"
  verdict = $verdict
  summary = $summary
  internal = [pscustomobject][ordered]@{
    pool = [pscustomobject][ordered]@{
      status = $poolPayload.pool.status
      controllerReachable = [bool]$poolPayload.pool.controllerReachable
      proxyListening = [bool]$poolPayload.pool.proxyListening
      routineRuntimeClass = $poolPayload.pool.routineRuntimeClass
      routineBrowserWindowMode = $poolPayload.pool.routineBrowserWindowMode
      lastAction = $poolPayload.pool.lastAction
      lastError = $poolPayload.pool.lastError
      updatedAt = $poolPayload.pool.updatedAt
    }
    workers = [pscustomobject][ordered]@{
      totalWorkers = @($workers).Count
      readyWorkers = $readyWorkers
      startingWorkers = $startingWorkers
      reauthRequiredWorkers = $reauthRequiredWorkers
      disconnectedWorkers = $disconnectedWorkers
      stableWorkers = $stableWorkers
      provisionalWorkers = $provisionalWorkers
      unstableWorkers = $unstableWorkers
      readyWorkerIds = @(Get-WorkerIdsByStatus -Workers $workers -Status "ready")
      reauthRequiredWorkerIds = @(Get-WorkerIdsByStatus -Workers $workers -Status "reauth_required")
      disconnectedWorkerIds = @(Get-WorkerIdsByStatus -Workers $workers -Status "disconnected")
    }
    observability = [pscustomobject][ordered]@{
      totalEvents = $observabilityPayload.totalEvents
      recentFailureCount = @($observabilityPayload.recentFailures).Count
      recentRestartCount = @($observabilityPayload.recentRestarts).Count
      lastEventAt = $observabilityPayload.lastEventAt
      warnEvents = $observabilityPayload.severityCounts.warn
      errorEvents = $observabilityPayload.severityCounts.error
    }
  }
  publicCanary = [pscustomobject][ordered]@{
    healthz = [pscustomobject][ordered]@{
      ok = $publicHealthOk
      statusCode = $probePayload.healthz.statusCode
      errorKind = $probePayload.healthz.errorKind
      requestUrl = $probePayload.healthz.requestUrl
    }
    models = [pscustomobject][ordered]@{
      ok = $publicModelsOk
      statusCode = $probePayload.models.statusCode
      errorKind = $probePayload.models.errorKind
      requestUrl = $probePayload.models.requestUrl
    }
    chat = [pscustomobject][ordered]@{
      ok = $publicChatOk
      statusCode = $probePayload.chatCompletions.statusCode
      errorKind = $probePayload.chatCompletions.errorKind
      requestUrl = $probePayload.chatCompletions.requestUrl
      assistantReplyText = $chatMessage
      workerId =
        if ($null -ne $chatPayload -and $chatPayload.worker_id) {
          $chatPayload.worker_id
        } else {
          $CanaryWorkerId
        }
      model =
        if ($null -ne $chatPayload -and $chatPayload.model) {
          $chatPayload.model
        } else {
          $null
        }
    }
  }
}

$jsonOutput = $result | ConvertTo-Json -Depth 8

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
  $lines += "- Verdict: `$($result.verdict)`"
  $lines += "- Public base URL: `$($result.publicBaseUrl)`"
  $lines += "- Canary worker: `$($result.canaryWorkerId)`"
  $lines += "- Summary: $($result.summary)"
  $lines += ""
  $lines += "## Internal Readiness"
  $lines += ""
  $lines += "- Pool status: `$($result.internal.pool.status)`"
  $lines += "- Controller reachable: `$($result.internal.pool.controllerReachable)`"
  $lines += "- Proxy listening: `$($result.internal.pool.proxyListening)`"
  $lines += "- Ready workers: $($result.internal.workers.readyWorkers)/$($result.internal.workers.totalWorkers)"
  $lines += "- Reauth required: $($result.internal.workers.reauthRequiredWorkers)"
  $lines += "- Disconnected: $($result.internal.workers.disconnectedWorkers)"
  $lines += "- Stable workers: $($result.internal.workers.stableWorkers)"
  $lines += "- Provisional workers: $($result.internal.workers.provisionalWorkers)"
  $lines += "- Recent operator failures: $($result.internal.observability.recentFailureCount)"
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
