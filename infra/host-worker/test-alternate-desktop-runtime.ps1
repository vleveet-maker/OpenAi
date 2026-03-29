param(
  [Parameter(Mandatory = $true)]
  [string]$WorkerId,
  [string]$PublicBaseUrl = "http://127.0.0.1:8080",
  [string]$InternalBaseUrl = "http://127.0.0.1:8081",
  [string]$InternalAdminToken = "local-internal-admin-token",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$HostControllerToken = "local-host-controller-token",
  [int]$TimeoutSeconds = 180,
  [int]$PollIntervalMs = 1500,
  [switch]$ReturnJson
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

function Resolve-WorkerSettings {
  param([string]$Id)

  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path

  switch ($Id) {
    "dad" {
      return @{
        WorkerId = "dad"
        AgentPort = 4021
        StartScriptPath = (Join-Path $PSScriptRoot "start-dad-host-worker.ps1")
        ProfilePath = (Join-Path $repoRoot "infra\\data\\host-profiles\\dad")
        RepoRoot = $repoRoot
      }
    }
    "wife" {
      return @{
        WorkerId = "wife"
        AgentPort = 4022
        StartScriptPath = (Join-Path $PSScriptRoot "start-wife-host-worker.ps1")
        ProfilePath = (Join-Path $repoRoot "infra\\data\\host-profiles\\wife")
        RepoRoot = $repoRoot
      }
    }
    "shared-1" {
      return @{
        WorkerId = "shared-1"
        AgentPort = 4023
        StartScriptPath = (Join-Path $PSScriptRoot "start-shared-1-host-worker.ps1")
        ProfilePath = (Join-Path $repoRoot "infra\\data\\host-profiles\\shared-1")
        RepoRoot = $repoRoot
      }
    }
    default {
      throw "Unsupported worker '$Id' for alternate desktop proof."
    }
  }
}

function Get-WorkerStatePath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,
    [Parameter(Mandatory = $true)]
    [string]$CurrentWorkerId
  )

  return Join-Path $RepoRoot "infra\\data\\host-worker-state\\$CurrentWorkerId.json"
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

function Get-DirectWorkerHealth {
  param(
    [Parameter(Mandatory = $true)]
    [int]$AgentPort
  )

  return Invoke-JsonRequest -Method "GET" -Url "http://127.0.0.1:$AgentPort/health"
}

function Start-AlternateDesktopWorker {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$WorkerSettings,
    [Parameter(Mandatory = $true)]
    [string]$ProxyServer
  )

  & (Join-Path $PSScriptRoot "stop-host-native-worker.ps1") `
    -WorkerId $WorkerSettings.WorkerId `
    -ProfilePath $WorkerSettings.ProfilePath `
    -RepoRoot $WorkerSettings.RepoRoot

  Start-Sleep -Seconds 2

  & $WorkerSettings.StartScriptPath `
    -SkipInstall `
    -DetachAgent `
    -ProxyServer $ProxyServer `
    -RuntimeMode AlternateDesktop `
    -BrowserWindowMode Minimized
}

$hostControllerHeaders = @{
  "x-host-controller-token" = $HostControllerToken
}
$internalHeaders = @{
  "x-internal-admin-token" = $InternalAdminToken
}
$relayProbePath = Join-Path $PSScriptRoot "test-host-worker-relay.ps1"
$workerSettings = Resolve-WorkerSettings -Id $WorkerId
$statePath = Get-WorkerStatePath -RepoRoot $workerSettings.RepoRoot -CurrentWorkerId $WorkerId
$hostHealth = Invoke-JsonRequest -Method "GET" -Url "$HostControllerBaseUrl/health" -Headers $hostControllerHeaders
$proxyServerUrl = $hostHealth.proxyServerUrl
$relayResult = $null
$workerHealth = $null
$directWorkerHealth = $null
$stateMetadata = $null

try {
  Start-AlternateDesktopWorker -WorkerSettings $workerSettings -ProxyServer $proxyServerUrl

  $workerHealth = Wait-Until -Description "alternate desktop worker health for $WorkerId" -Condition {
    $status = Invoke-JsonRequest -Method "GET" -Url "$InternalBaseUrl/internal/workers/$WorkerId/status" -Headers $internalHeaders

    if ($status.runtimeMode -eq "alternate_desktop") {
      return $status
    }

    return $null
  }

  if (Test-Path $statePath) {
    $stateMetadata = Get-Content -Raw $statePath | ConvertFrom-Json
  }

  $relayResult = & $relayProbePath `
    -WorkerId $WorkerId `
    -PublicBaseUrl $PublicBaseUrl `
    -InternalBaseUrl $InternalBaseUrl `
    -InternalAdminToken $InternalAdminToken `
    -HostControllerBaseUrl $HostControllerBaseUrl `
    -HostControllerToken $HostControllerToken `
    -TimeoutSeconds $TimeoutSeconds `
    -PollIntervalMs $PollIntervalMs `
    -ReturnJson

  try {
    $directWorkerHealth = Get-DirectWorkerHealth -AgentPort $workerSettings.AgentPort
  } catch {}
} catch {
  $relayResult = [pscustomobject]@{
    workerId = $WorkerId
    sessionId = $null
    outcome = "probe_failed"
    runtimeUsability = $null
    challengeDetected = $false
    pageUrl = $null
    failureCode = "alternate_desktop_probe_failed"
    assistantBody = $null
    detail = "$_"
  }

  try {
    $workerHealth = Invoke-JsonRequest -Method "GET" -Url "$InternalBaseUrl/internal/workers/$WorkerId/status" -Headers $internalHeaders
  } catch {}

  try {
    $directWorkerHealth = Get-DirectWorkerHealth -AgentPort $workerSettings.AgentPort
  } catch {}

  if (Test-Path $statePath) {
    try {
      $stateMetadata = Get-Content -Raw $statePath | ConvertFrom-Json
    } catch {}
  }
}

$bootstrapFailureCode = $null
$relayFailureCode = $null
$bootstrapStep = $null

if ($relayResult.outcome -eq "bootstrap_failed") {
  $bootstrapFailureCode = $relayResult.failureCode
}

if ($relayResult.outcome -eq "relay_failed") {
  $relayFailureCode = $relayResult.failureCode
}

if ($directWorkerHealth -and $directWorkerHealth.lastBootstrapFailureCode) {
  $bootstrapFailureCode = $directWorkerHealth.lastBootstrapFailureCode
}

if ($directWorkerHealth -and $directWorkerHealth.lastBootstrapStep) {
  $bootstrapStep = $directWorkerHealth.lastBootstrapStep
}

$result = "alternate_desktop_unreachable"
$phase11Ready = $false

if ($relayResult.outcome -eq "relay_complete" -and $relayResult.runtimeUsability -eq "usable") {
  $result = "alternate_desktop_usable"
  $phase11Ready = $true
} elseif ($workerHealth -or $stateMetadata) {
  $result = "alternate_desktop_reachable_but_unusable"
}

$proofFailureClass = $null

if (-not $phase11Ready) {
  if ($result -eq "alternate_desktop_unreachable") {
    $proofFailureClass = "runtime_unreachable"
  } elseif (
    $bootstrapFailureCode -eq "bootstrap_auth_required" -or
    ($directWorkerHealth -and $directWorkerHealth.runtimeStatus -eq "reauth_required")
  ) {
    $proofFailureClass = "auth_required"
  } elseif ($relayResult.outcome -eq "relay_failed") {
    $proofFailureClass = "relay_failed"
  } elseif (
    $relayResult.outcome -eq "probe_failed" -and
    $relayResult.detail -match "assigned to|Timed out waiting for session assignment|worker_not_ready|validation-session"
  ) {
    $proofFailureClass = "assignment_timeout"
  } elseif ($bootstrapFailureCode) {
    $proofFailureClass = "bootstrap_failed"
  } else {
    $proofFailureClass = "runtime_unreachable"
  }
}

$evidence = [ordered]@{
  workerId = $WorkerId
  runtimeClass =
    if ($directWorkerHealth -and $directWorkerHealth.runtimeClass) {
      $directWorkerHealth.runtimeClass
    } elseif ($workerHealth -and $workerHealth.runtimeClass) {
      $workerHealth.runtimeClass
    } else {
      "host_alternate_desktop"
    }
  runtimeMode =
    if ($directWorkerHealth -and $directWorkerHealth.runtimeMode) {
      $directWorkerHealth.runtimeMode
    } elseif ($workerHealth -and $workerHealth.runtimeMode) {
      $workerHealth.runtimeMode
    } else {
      "alternate_desktop"
    }
  result = $result
  phase11Ready = $phase11Ready
  validationPending = (-not $phase11Ready)
  proofFailureClass = $proofFailureClass
  pageUrl = $relayResult.pageUrl
  bootstrapFailureCode = $bootstrapFailureCode
  bootstrapStep = $bootstrapStep
  relayFailureCode = $relayFailureCode
  checkedAt = (Get-Date).ToString("o")
  runtimeDesktopName =
    if ($workerHealth -and $workerHealth.runtimeDesktopName) {
      $workerHealth.runtimeDesktopName
    } elseif ($stateMetadata -and $stateMetadata.desktopName) {
      $stateMetadata.desktopName
    } else {
      $null
    }
  detail = $relayResult.detail
}

Write-RuntimeMatrixRow -Row $evidence -RepoRoot $workerSettings.RepoRoot

if ($ReturnJson) {
  return [pscustomobject]$evidence
}

if (-not $phase11Ready) {
  throw "alternate_desktop_runtime_not_ready:${WorkerId}:$result"
}
