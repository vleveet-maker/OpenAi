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

function New-HiddenRuntimeAuthError {
  param([string]$Detail = "")

  $suffix =
    if ([string]::IsNullOrWhiteSpace($Detail)) {
      ""
    } else {
      " Original detail: $Detail"
    }

  return "hidden_runtime_auth_unstable: hidden runtime loses auth after manual login; runtime architecture review required.$suffix"
}

$hostControllerHeaders = @{
  "x-host-controller-token" = $HostControllerToken
}
$internalHeaders = @{
  "x-internal-admin-token" = $InternalAdminToken
}
$relayProbePath = Join-Path $PSScriptRoot "test-host-worker-relay.ps1"

$targetWorker = Wait-Until -Description "host controller health for $WorkerId" -Condition {
  $snapshot = Invoke-JsonRequest -Method "GET" -Url "$HostControllerBaseUrl/health" -Headers $hostControllerHeaders
  $worker = @($snapshot.workers | Where-Object { $_.workerId -eq $WorkerId })[0]

  if ($null -eq $worker) {
    throw "Target worker $WorkerId is missing from host controller health."
  }

  if ($worker.agentListening) {
    return $worker
  }

  return $null
}

$workerStatus = Wait-Until -Description "control-api hidden runtime status for $WorkerId" -Condition {
  $status = Invoke-JsonRequest -Method "GET" -Url "$InternalBaseUrl/internal/workers/$WorkerId/status" -Headers $internalHeaders

  if ($status.runtimeMode -eq "hidden_runtime") {
    return $status
  }

  return $null
}

if ($workerStatus.runtimeMode -ne "hidden_runtime") {
  throw "Expected runtimeMode hidden_runtime for $WorkerId but received '$($workerStatus.runtimeMode)'."
}

if (
  $workerStatus.status -eq "reauth_required" -or
  $workerStatus.runtimeStatus -eq "reauth_required"
) {
  throw (New-HiddenRuntimeAuthError -Detail "reauth_required")
}

if (-not $targetWorker.cdpPort) {
  throw "Worker $WorkerId did not report a CDP port."
}

if (Test-ListeningPort -Port $targetWorker.cdpPort) {
  throw "Expected hidden runtime for $WorkerId to run without any visible desktop browser, but CDP port $($targetWorker.cdpPort) is still listening."
}

try {
  & $relayProbePath `
    -WorkerId $WorkerId `
    -PublicBaseUrl $PublicBaseUrl `
    -InternalBaseUrl $InternalBaseUrl `
    -InternalAdminToken $InternalAdminToken `
    -HostControllerBaseUrl $HostControllerBaseUrl `
    -HostControllerToken $HostControllerToken `
    -TimeoutSeconds $TimeoutSeconds `
    -PollIntervalMs $PollIntervalMs

  if ($LASTEXITCODE -ne 0) {
    throw "Relay probe exited with code $LASTEXITCODE."
  }
} catch {
  $detail = "$_"

  if ($detail -match "bootstrap_auth_required" -or $detail -match "reauth_required") {
    throw (New-HiddenRuntimeAuthError -Detail $detail)
  }

  throw
}

Write-Host "[phase-10.1] Hidden runtime transition for $WorkerId is live-complete without any visible desktop browser."
