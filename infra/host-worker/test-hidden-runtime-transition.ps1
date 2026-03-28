param(
  [Parameter(Mandatory = $true)]
  [string]$WorkerId,
  [string]$PublicBaseUrl = "http://127.0.0.1:8080",
  [string]$InternalBaseUrl = "http://127.0.0.1:8081",
  [string]$InternalAdminToken = "local-internal-admin-token",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$HostControllerToken = "local-host-controller-token",
  [int]$TimeoutSeconds = 180,
  [int]$PollIntervalMs = 1500
)

$ErrorActionPreference = "Stop"

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Method,
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  $invokeParams = @{
    Method = $Method
    Uri = $Url
    Headers = $Headers
    ContentType = "application/json"
  }

  if ($null -ne $Body) {
    $invokeParams.Body = ($Body | ConvertTo-Json -Depth 8 -Compress)
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

function Wait-Until {
  param(
    [Parameter(Mandatory = $true)]
    [scriptblock]$Condition,
    [Parameter(Mandatory = $true)]
    [string]$Description
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $lastError = $null

  while ((Get-Date) -lt $deadline) {
    try {
      $result = & $Condition

      if ($result) {
        return $result
      }
    } catch {
      $lastError = $_
    }

    Start-Sleep -Milliseconds $PollIntervalMs
  }

  if ($lastError) {
    throw "Timed out waiting for $Description. Last error: $lastError"
  }

  throw "Timed out waiting for $Description."
}

function Test-ListeningPort {
  param([Parameter(Mandatory = $true)][int]$Port)

  $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $listeners
}

function Resolve-WorkerSettings {
  param([string]$Id)

  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path

  switch ($Id) {
    "dad" {
      return @{
        WorkerId = "dad"
        DisplayName = "Dad"
        AgentPort = 4021
        CdpPort = 9222
        StartScriptPath = (Join-Path $PSScriptRoot "start-dad-host-worker.ps1")
        ProfilePath = (Join-Path $repoRoot "infra\\data\\host-profiles\\dad")
        RepoRoot = $repoRoot
      }
    }
    "wife" {
      return @{
        WorkerId = "wife"
        DisplayName = "Wife"
        AgentPort = 4022
        CdpPort = 9223
        StartScriptPath = (Join-Path $PSScriptRoot "start-wife-host-worker.ps1")
        ProfilePath = (Join-Path $repoRoot "infra\\data\\host-profiles\\wife")
        RepoRoot = $repoRoot
      }
    }
    "shared-1" {
      return @{
        WorkerId = "shared-1"
        DisplayName = "Shared 1"
        AgentPort = 4023
        CdpPort = 9224
        StartScriptPath = (Join-Path $PSScriptRoot "start-shared-1-host-worker.ps1")
        ProfilePath = (Join-Path $repoRoot "infra\\data\\host-profiles\\shared-1")
        RepoRoot = $repoRoot
      }
    }
    default {
      throw "Unsupported worker '$Id' for hidden runtime transition probe."
    }
  }
}

function Write-RuntimeMatrixRow {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Row,
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $logDirectory = Join-Path $RepoRoot "infra\\data\\host-worker-logs"
  $matrixPath = Join-Path $logDirectory "runtime-matrix.jsonl"
  $null = New-Item -ItemType Directory -Force -Path $logDirectory
  Add-Content -Path $matrixPath -Value ($Row | ConvertTo-Json -Depth 8 -Compress) -Encoding utf8
}

function Start-WorkerVariant {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$WorkerSettings,
    [Parameter(Mandatory = $true)]
    [string]$LaunchVariant,
    [Parameter(Mandatory = $true)]
    [string]$ProxyServer
  )

  & (Join-Path $PSScriptRoot "stop-host-native-worker.ps1") `
    -WorkerId $WorkerSettings.WorkerId `
    -AgentPort $WorkerSettings.AgentPort `
    -CdpPort $WorkerSettings.CdpPort `
    -ProfilePath $WorkerSettings.ProfilePath `
    -RepoRoot $WorkerSettings.RepoRoot

  Start-Sleep -Seconds 2

  & $WorkerSettings.StartScriptPath `
    -SkipInstall `
    -DetachAgent `
    -ProxyServer $ProxyServer `
    -RuntimeMode HiddenRuntime `
    -HiddenLaunchVariant $LaunchVariant `
    -BrowserWindowMode Minimized
}

function Invoke-HiddenRuntimeAttempt {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$WorkerSettings,
    [Parameter(Mandatory = $true)]
    [string]$LaunchVariant,
    [Parameter(Mandatory = $true)]
    [string]$ProxyServer,
    [Parameter(Mandatory = $true)]
    [hashtable]$HostControllerHeaders,
    [Parameter(Mandatory = $true)]
    [hashtable]$InternalHeaders,
    [Parameter(Mandatory = $true)]
    [string]$RelayProbePath
  )

  $internalStatus = $null
  $hostSnapshot = $null
  $probeResult = $null

  try {
    Start-WorkerVariant -WorkerSettings $WorkerSettings -LaunchVariant $LaunchVariant -ProxyServer $ProxyServer

    $hostSnapshot = Wait-Until -Description "host controller health for $($WorkerSettings.WorkerId) after $LaunchVariant" -Condition {
      $snapshot = Invoke-JsonRequest -Method "GET" -Url "$HostControllerBaseUrl/health" -Headers $HostControllerHeaders
      $worker = @($snapshot.workers | Where-Object { $_.workerId -eq $WorkerSettings.WorkerId })[0]

      if ($null -eq $worker) {
        throw "Target worker $($WorkerSettings.WorkerId) is missing from host controller health."
      }

      if ($worker.agentListening) {
        return @{
          Snapshot = $snapshot
          Worker = $worker
        }
      }

      return $null
    }

    $internalStatus = Wait-Until -Description "control-api hidden runtime status for $($WorkerSettings.WorkerId)" -Condition {
      $status = Invoke-JsonRequest -Method "GET" -Url "$InternalBaseUrl/internal/workers/$($WorkerSettings.WorkerId)/status" -Headers $InternalHeaders

      if ($status.runtimeMode -eq "hidden_runtime") {
        return $status
      }

      return $null
    }

    $probeResult = & $RelayProbePath `
      -WorkerId $WorkerSettings.WorkerId `
      -PublicBaseUrl $PublicBaseUrl `
      -InternalBaseUrl $InternalBaseUrl `
      -InternalAdminToken $InternalAdminToken `
      -HostControllerBaseUrl $HostControllerBaseUrl `
      -HostControllerToken $HostControllerToken `
      -TimeoutSeconds $TimeoutSeconds `
      -PollIntervalMs $PollIntervalMs `
      -ReturnJson
  } catch {
    $probeResult = [pscustomobject]@{
      workerId = $WorkerSettings.WorkerId
      sessionId = $null
      outcome = "probe_failed"
      runtimeUsability = $null
      challengeDetected = $false
      pageUrl = $null
      failureCode = "startup_timeout"
      assistantBody = $null
      detail = "$_"
    }

    try {
      $internalStatus = Invoke-JsonRequest -Method "GET" -Url "$InternalBaseUrl/internal/workers/$($WorkerSettings.WorkerId)/status" -Headers $InternalHeaders
    } catch {}
  }

  $hostWorker =
    if ($hostSnapshot) {
      $hostSnapshot.Worker
    } else {
      $null
    }

  $runtimeUsability =
    if ($probeResult.runtimeUsability) {
      $probeResult.runtimeUsability
    } elseif ($internalStatus -and $internalStatus.runtimeStatus -eq "reauth_required") {
      "auth_required"
    } elseif ($probeResult.challengeDetected) {
      "challenge_blocked"
    } else {
      "surface_unusable"
    }

  $row = @{
    workerId = $WorkerSettings.WorkerId
    runtimeClass = "host_hidden_runtime"
    launchVariant = $LaunchVariant
    processReachable = [bool]($hostWorker -and $hostWorker.agentListening)
    browserContextReady =
      if ($internalStatus) {
        [bool]$internalStatus.browserContextReady
      } else {
        $false
      }
    runtimeUsability = $runtimeUsability
    challengeDetected = [bool]$probeResult.challengeDetected
    pageUrl = $probeResult.pageUrl
    failureCode = $probeResult.failureCode
    checkedAt = (Get-Date).ToString("o")
  }

  Write-RuntimeMatrixRow -Row $row -RepoRoot $WorkerSettings.RepoRoot

  return [pscustomobject]@{
    workerId = $WorkerSettings.WorkerId
    runtimeClass = "host_hidden_runtime"
    launchVariant = $LaunchVariant
    processReachable = $row.processReachable
    browserContextReady = $row.browserContextReady
    runtimeUsability = $row.runtimeUsability
    challengeDetected = $row.challengeDetected
    pageUrl = $row.pageUrl
    failureCode = $row.failureCode
    checkedAt = $row.checkedAt
    outcome = $probeResult.outcome
    detail = $probeResult.detail
  }
}

$hostControllerHeaders = @{
  "x-host-controller-token" = $HostControllerToken
}
$internalHeaders = @{
  "x-internal-admin-token" = $InternalAdminToken
}
$relayProbePath = Join-Path $PSScriptRoot "test-host-worker-relay.ps1"
$workerSettings = Resolve-WorkerSettings -Id $WorkerId
$proxyHealth = Invoke-JsonRequest -Method "GET" -Url "$HostControllerBaseUrl/health" -Headers $hostControllerHeaders
$proxyServerUrl = $proxyHealth.proxyServerUrl

$firstAttempt = Invoke-HiddenRuntimeAttempt `
  -WorkerSettings $workerSettings `
  -LaunchVariant "CurrentExecutable" `
  -ProxyServer $proxyServerUrl `
  -HostControllerHeaders $hostControllerHeaders `
  -InternalHeaders $internalHeaders `
  -RelayProbePath $relayProbePath

$finalAttempt = $firstAttempt

if (
  $firstAttempt.failureCode -eq "bootstrap_challenge_detected" -or
  $firstAttempt.failureCode -eq "bootstrap_surface_unusable"
) {
  Write-Host "[phase-10.2] Running one bounded rescue attempt with ChannelMsedge for $WorkerId..."

  $finalAttempt = Invoke-HiddenRuntimeAttempt `
    -WorkerSettings $workerSettings `
    -LaunchVariant "ChannelMsedge" `
    -ProxyServer $proxyServerUrl `
    -HostControllerHeaders $hostControllerHeaders `
    -InternalHeaders $internalHeaders `
    -RelayProbePath $relayProbePath
}

if ($finalAttempt.runtimeUsability -eq "usable") {
  Write-Host "[phase-10.2] Hidden runtime for $WorkerId is usable with launch variant $($finalAttempt.launchVariant)."
  return
}

if ($finalAttempt.runtimeUsability -eq "auth_required") {
  throw "hidden_runtime_auth_unstable: hidden runtime lost auth after manual login for $WorkerId. This requires runtime architecture review."
}

throw "hidden_runtime_unusable_after_bounded_rescue: $WorkerId remained non-usable in hidden runtime. Final launch variant=$($finalAttempt.launchVariant); failureCode=$($finalAttempt.failureCode); runtimeUsability=$($finalAttempt.runtimeUsability)."
