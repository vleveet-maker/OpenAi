param(
  [Parameter(Mandatory = $true)]
  [string]$WorkerId,
  [string]$SessionLabel = "Compact visible relay smoke",
  [string]$ExpectedReply = "smoke-ok",
  [string]$ExpectedConversationMode = "Temporary Chat",
  [string]$ExpectedModelLabel = "GPT-5.4 Thinking",
  [string]$PublicBaseUrl = "http://127.0.0.1:8080",
  [string]$InternalBaseUrl = "http://127.0.0.1:8081",
  [string]$InternalAdminToken = "local-internal-admin-token",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$HostControllerToken = "local-host-controller-token",
  [int]$TimeoutSeconds = 120,
  [int]$PollIntervalMs = 1500,
  [switch]$KeepWorkerRunning,
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

      if (
        "$lastError" -match "Chat bootstrap failed" -or
        "$lastError" -match "Relay failed" -or
        "$lastError" -match "assigned to"
      ) {
        throw $lastError
      }
    }

    Start-Sleep -Milliseconds $PollIntervalMs
  }

  if ($lastError) {
    throw "Timed out waiting for $Description. Last error: $lastError"
  }

  throw "Timed out waiting for $Description."
}

function Get-SessionMessagesSnapshot {
  param([string]$SessionId)

  if ([string]::IsNullOrWhiteSpace($SessionId)) {
    return $null
  }

  try {
    return Invoke-JsonRequest -Method "GET" -Url "$PublicBaseUrl/api/sessions/$SessionId/messages"
  } catch {
    return $null
  }
}

function Get-WorkerStatusSnapshot {
  param([string]$WorkerId)

  if ([string]::IsNullOrWhiteSpace($WorkerId)) {
    return $null
  }

  try {
    return Invoke-JsonRequest -Method "GET" -Url "$InternalBaseUrl/internal/workers/$WorkerId/status" -Headers $internalHeaders
  } catch {
    return $null
  }
}

$hostControllerHeaders = @{
  "x-host-controller-token" = $HostControllerToken
}
$internalHeaders = @{
  "x-internal-admin-token" = $InternalAdminToken
}
$sessionId = $null
$probeResult = $null
$workerStartedForProbe = $false

try {
  Write-Host "[compact-visible] Starting $WorkerId in CompactCorner mode..."
  $null = Invoke-JsonRequest -Method "POST" -Url "$HostControllerBaseUrl/workers/$WorkerId/start" -Headers $hostControllerHeaders -Body @{
    runtimeMode = "visible_auth"
    profileStrategy = "durable"
    browserWindowMode = "CompactCorner"
  }
  $workerStartedForProbe = $true

  $health = Wait-Until -Description "host controller to report the target worker reachable" -Condition {
    $snapshot = Invoke-JsonRequest -Method "GET" -Url "$HostControllerBaseUrl/health" -Headers $hostControllerHeaders
    $targetWorker = @($snapshot.workers | Where-Object { $_.workerId -eq $WorkerId })[0]

    if ($null -eq $targetWorker) {
      throw "Target worker $WorkerId is missing from host controller health."
    }

    if ($targetWorker.agentListening -and $targetWorker.browserListening) {
      return $snapshot
    }

    return $null
  }

  $readyWorkerStatus = Wait-Until -Description "control-api to report the target worker ready" -Condition {
    $status = Invoke-JsonRequest -Method "GET" -Url "$InternalBaseUrl/internal/workers/$WorkerId/status" -Headers $internalHeaders

    if ($status.status -eq "ready") {
      return $status
    }

    return $null
  }

  Write-Host "[compact-visible] Creating a worker-pinned validation session for $WorkerId..."
  $sessionResponse = Invoke-JsonRequest -Method "POST" -Url "$InternalBaseUrl/internal/workers/$WorkerId/validation-session" -Headers $internalHeaders -Body @{
    requestedForLabel = $SessionLabel
  }
  $sessionId =
    if ($sessionResponse.sessionId) {
      $sessionResponse.sessionId
    } elseif ($sessionResponse.session -and $sessionResponse.session.session) {
      $sessionResponse.session.session.sessionId
    } else {
      $null
    }

  if ([string]::IsNullOrWhiteSpace($sessionId)) {
    throw "Validation session did not return a sessionId."
  }

  $null = Wait-Until -Description "validation session activation on the target worker" -Condition {
    $session = Invoke-JsonRequest -Method "GET" -Url "$PublicBaseUrl/api/sessions/$sessionId"

    if ($session.session.state -eq "active" -and $session.session.workerId -eq $WorkerId) {
      return $session
    }

    if ($session.session.workerId -and $session.session.workerId -ne $WorkerId) {
      throw "Session was assigned to $($session.session.workerId) instead of $WorkerId."
    }

    return $null
  }

  Write-Host "[compact-visible] Waiting for Temporary Chat bootstrap on $WorkerId..."
  $bootstrapSnapshot = Wait-Until -Description "fresh chat bootstrap to become ready" -Condition {
    $snapshot = Invoke-JsonRequest -Method "GET" -Url "$PublicBaseUrl/api/sessions/$sessionId/messages"

    if ($snapshot.chatBootstrap.status -eq "failed") {
      throw "Chat bootstrap failed with $($snapshot.chatBootstrap.failureCode)."
    }

    if ($snapshot.chatBootstrap.status -eq "ready" -and $snapshot.canSend) {
      return $snapshot
    }

    return $null
  }

  $prompt = "Please reply with exactly: $ExpectedReply"
  Write-Host "[compact-visible] Sending relay probe: $prompt"
  $null = Invoke-JsonRequest -Method "POST" -Url "$PublicBaseUrl/api/sessions/$sessionId/messages" -Body @{
    bodyText = $prompt
  }

  $completedConversation = Wait-Until -Description "assistant reply completion" -Condition {
    $snapshot = Invoke-JsonRequest -Method "GET" -Url "$PublicBaseUrl/api/sessions/$sessionId/messages"
    $assistantMessages = @($snapshot.messages | Where-Object { $_.role -eq "assistant" })
    $lastAssistant = $assistantMessages[-1]

    if ($null -eq $lastAssistant) {
      return $null
    }

    if ($lastAssistant.state -eq "failed") {
      throw "Relay failed with $($lastAssistant.failureCode)."
    }

    if ($lastAssistant.state -eq "complete") {
      return $snapshot
    }

    return $null
  }

  $assistantMessages = @($completedConversation.messages | Where-Object { $_.role -eq "assistant" })
  $finalAssistant = $assistantMessages[-1]

  if ($finalAssistant.body -ne $ExpectedReply) {
    throw "Expected assistant reply '$ExpectedReply' but received '$($finalAssistant.body)'."
  }

  $finalWorkerStatus =
    Wait-Until -Description "worker truth to reflect successful compact-visible relay" -Condition {
      $status = Get-WorkerStatusSnapshot -WorkerId $WorkerId

      if (
        $status -and
        ($status.runtimeCapability -eq "usable" -or
          ($status.lastRelayAt -and -not $status.lastRelayFailureCode))
      ) {
        return $status
      }

      return $null
    }
  $probeResult = [pscustomobject]@{
    workerId = $WorkerId
    runtimeMode =
      if ($finalWorkerStatus) {
        $finalWorkerStatus.runtimeMode
      } else {
        $readyWorkerStatus.runtimeMode
      }
    runtimeClass =
      if ($finalWorkerStatus) {
        $finalWorkerStatus.runtimeClass
      } else {
        $readyWorkerStatus.runtimeClass
      }
    runtimeCapability =
      if ($finalWorkerStatus) {
        $finalWorkerStatus.runtimeCapability
      } else {
        $readyWorkerStatus.runtimeCapability
      }
    proofUsability = "usable"
    stabilityGateStatus =
      if ($finalWorkerStatus) {
        $finalWorkerStatus.stabilityGateStatus
      } else {
        $readyWorkerStatus.stabilityGateStatus
      }
    stabilityPassCount =
      if ($finalWorkerStatus) {
        $finalWorkerStatus.stabilityPassCount
      } else {
        $readyWorkerStatus.stabilityPassCount
      }
    bootstrapResult = $bootstrapSnapshot.chatBootstrap.status
    bootstrapFailureCode = $bootstrapSnapshot.chatBootstrap.failureCode
    conversationMode = $bootstrapSnapshot.chatBootstrap.conversationMode
    expectedConversationMode = $ExpectedConversationMode
    conversationModeMatchesExpectation =
      $bootstrapSnapshot.chatBootstrap.conversationMode -eq "temporary"
    modelLabel = $bootstrapSnapshot.chatBootstrap.modelLabel
    expectedModelLabel = $ExpectedModelLabel
    modelMatchesExpectation =
      $bootstrapSnapshot.chatBootstrap.modelLabel -eq $ExpectedModelLabel
    relayResult = $finalAssistant.state
    relayFailureCode = $finalAssistant.failureCode
    assistantReplyText = $finalAssistant.body
    proofPath = "CompactCorner -> Temporary Chat -> GPT-5.4 Thinking -> relay"
    sessionId = $sessionId
    outcome = "relay_complete"
    failureCode = $null
  }

  Write-Host "[compact-visible] Relay probe succeeded on $WorkerId with reply '$ExpectedReply'."
} catch {
  if (-not $ReturnJson) {
    throw
  }

  $snapshot = Get-SessionMessagesSnapshot -SessionId $sessionId
  $assistantMessages =
    if ($snapshot) {
      @($snapshot.messages | Where-Object { $_.role -eq "assistant" })
    } else {
      @()
    }
  $lastAssistant =
    if ($assistantMessages.Count -gt 0) {
      $assistantMessages[-1]
    } else {
      $null
    }

  $workerStatus = Get-WorkerStatusSnapshot -WorkerId $WorkerId
  $outcome = "probe_failed"
  $failureCode = $null

  if ($snapshot -and $snapshot.chatBootstrap) {
    $failureCode = $snapshot.chatBootstrap.failureCode

    if ($snapshot.chatBootstrap.status -eq "failed") {
      $outcome = "bootstrap_failed"
    } elseif ($lastAssistant -and $lastAssistant.state -eq "failed") {
      $outcome = "relay_failed"
      $failureCode =
        if ($lastAssistant.failureCode) {
          $lastAssistant.failureCode
        } else {
          $failureCode
        }
    }
  }

  $probeResult = [pscustomobject]@{
    workerId = $WorkerId
    runtimeMode = $workerStatus.runtimeMode
    runtimeClass = $workerStatus.runtimeClass
    runtimeCapability = $workerStatus.runtimeCapability
    proofUsability = "unusable"
    stabilityGateStatus = $workerStatus.stabilityGateStatus
    stabilityPassCount = $workerStatus.stabilityPassCount
    bootstrapResult =
      if ($snapshot -and $snapshot.chatBootstrap) {
        $snapshot.chatBootstrap.status
      } else {
        "unknown"
      }
    bootstrapFailureCode = $failureCode
    conversationMode =
      if ($snapshot -and $snapshot.chatBootstrap) {
        $snapshot.chatBootstrap.conversationMode
      } else {
        "unknown"
      }
    expectedConversationMode = $ExpectedConversationMode
    conversationModeMatchesExpectation =
      $snapshot -and $snapshot.chatBootstrap -and
      $snapshot.chatBootstrap.conversationMode -eq "temporary"
    modelLabel =
      if ($snapshot -and $snapshot.chatBootstrap) {
        $snapshot.chatBootstrap.modelLabel
      } else {
        $null
      }
    expectedModelLabel = $ExpectedModelLabel
    modelMatchesExpectation =
      $snapshot -and $snapshot.chatBootstrap -and
      $snapshot.chatBootstrap.modelLabel -eq $ExpectedModelLabel
    relayResult =
      if ($lastAssistant) {
        $lastAssistant.state
      } else {
        $null
      }
    relayFailureCode =
      if ($lastAssistant) {
        $lastAssistant.failureCode
      } else {
        $null
      }
    assistantReplyText =
      if ($lastAssistant) {
        $lastAssistant.body
      } else {
        $null
      }
    proofPath = "CompactCorner -> Temporary Chat -> GPT-5.4 Thinking -> relay"
    sessionId = $sessionId
    outcome = $outcome
    failureCode = $failureCode
    detail = "$_"
  }
} finally {
  if ($sessionId) {
    try {
      $null = Invoke-JsonRequest -Method "POST" -Url "$PublicBaseUrl/api/sessions/$sessionId/end" -Body @{}
    } catch {
      Write-Warning "Failed to end probe session ${sessionId}: $_"
    }
  }

  if ($workerStartedForProbe -and -not $KeepWorkerRunning) {
    try {
      $null = Invoke-JsonRequest -Method "POST" -Url "$HostControllerBaseUrl/workers/$WorkerId/stop" -Headers $hostControllerHeaders -Body @{}
    } catch {
      Write-Warning "Failed to stop probe worker ${WorkerId}: $_"
    }
  }
}

if ($ReturnJson) {
  return $probeResult
}

$probeResult | ConvertTo-Json -Depth 8
