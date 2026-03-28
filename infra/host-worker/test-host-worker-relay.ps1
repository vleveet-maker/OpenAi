param(
  [Parameter(Mandatory = $true)]
  [string]$WorkerId,
  [string]$SessionLabel = "Phase 10 Relay Smoke",
  [string]$ExpectedReply = "smoke-ok",
  [string]$PublicBaseUrl = "http://127.0.0.1:8080",
  [string]$InternalBaseUrl = "http://127.0.0.1:8081",
  [string]$InternalAdminToken = "local-internal-admin-token",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$HostControllerToken = "local-host-controller-token",
  [int]$TimeoutSeconds = 120,
  [int]$PollIntervalMs = 1500,
  [switch]$ReturnJson
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
}

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

function Stop-NonTargetWorker {
  param(
    [Parameter(Mandatory = $true)]
    [pscustomobject]$Worker,
    [Parameter(Mandatory = $true)]
    [hashtable]$HostControllerHeaders,
    [Parameter(Mandatory = $true)]
    [hashtable]$InternalHeaders
  )

  try {
    $null = Invoke-JsonRequest -Method "POST" -Url "$HostControllerBaseUrl/workers/$($Worker.workerId)/stop" -Headers $HostControllerHeaders -Body @{}
    return
  } catch {
    $workerSnapshot = Invoke-JsonRequest -Method "GET" -Url "$InternalBaseUrl/internal/workers/$($Worker.workerId)" -Headers $InternalHeaders
    $repoRoot = Resolve-RepoRoot

    & (Join-Path $PSScriptRoot "stop-host-native-worker.ps1") `
      -WorkerId $Worker.workerId `
      -AgentPort $Worker.agentPort `
      -CdpPort $Worker.cdpPort `
      -ProfilePath $workerSnapshot.profilePath `
      -RepoRoot $repoRoot
  }
}

$hostControllerHeaders = @{
  "x-host-controller-token" = $HostControllerToken
}
$internalHeaders = @{
  "x-internal-admin-token" = $InternalAdminToken
}
$stoppedWorkers = New-Object System.Collections.Generic.List[string]
$sessionId = $null
$probeResult = $null

try {
  Write-Host "[phase-10] Ensuring host pool is started..."
  $null = Invoke-JsonRequest -Method "POST" -Url "$HostControllerBaseUrl/pool/start" -Headers $hostControllerHeaders -Body @{}

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

  foreach ($worker in @($health.workers | Where-Object { $_.workerId -ne $WorkerId })) {
    if ($worker.agentListening -or $worker.browserListening) {
      Write-Host "[phase-10] Stopping non-target worker $($worker.workerId) for isolated relay verification..."
      Stop-NonTargetWorker -Worker $worker -HostControllerHeaders $hostControllerHeaders -InternalHeaders $internalHeaders
      $stoppedWorkers.Add($worker.workerId) | Out-Null
    }
  }

  $null = Wait-Until -Description "control-api to report the target worker ready" -Condition {
    $status = Invoke-JsonRequest -Method "GET" -Url "$InternalBaseUrl/internal/workers/$WorkerId/status" -Headers $internalHeaders

    if ($status.status -eq "ready") {
      return $status
    }

    return $null
  }

  if ($stoppedWorkers.Count -gt 0) {
    $null = Wait-Until -Description "control-api to stop routing to non-target workers" -Condition {
      $workers = Invoke-JsonRequest -Method "GET" -Url "$InternalBaseUrl/internal/workers" -Headers $internalHeaders
      $stillReady = @($workers.workers | Where-Object {
        $stoppedWorkers.Contains($_.workerId) -and $_.status.status -eq "ready"
      })

      if ($stillReady.Count -eq 0) {
        return $workers
      }

      return $null
    }
  }

  Write-Host "[phase-10] Creating a session that should route to $WorkerId..."
  $sessionResponse = Invoke-JsonRequest -Method "POST" -Url "$PublicBaseUrl/api/sessions" -Body @{
    requestedForLabel = $SessionLabel
  }
  $sessionId = $sessionResponse.session.sessionId

  $null = Wait-Until -Description "session assignment to the target worker" -Condition {
    $session = Invoke-JsonRequest -Method "GET" -Url "$PublicBaseUrl/api/sessions/$sessionId"

    if ($session.session.state -eq "active" -and $session.session.workerId -eq $WorkerId) {
      return $session
    }

    if ($session.session.workerId -and $session.session.workerId -ne $WorkerId) {
      throw "Session was assigned to $($session.session.workerId) instead of $WorkerId."
    }

    return $null
  }

  Write-Host "[phase-10] Waiting for fresh chat bootstrap on $WorkerId..."
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
  Write-Host "[phase-10] Sending relay probe: $prompt"
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

  $probeResult = [pscustomobject]@{
    workerId = $WorkerId
    sessionId = $sessionId
    outcome = "relay_complete"
    runtimeUsability = $bootstrapSnapshot.chatBootstrap.runtimeUsability
    challengeDetected = [bool]$bootstrapSnapshot.chatBootstrap.challengeDetected
    pageUrl = $bootstrapSnapshot.chatBootstrap.pageUrl
    failureCode = $null
    assistantBody = $finalAssistant.body
  }

  Write-Host "[phase-10] Relay probe succeeded on $WorkerId with reply '$ExpectedReply'."
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

  $outcome = "probe_failed"
  $failureCode = $null
  $runtimeUsability = $null
  $challengeDetected = $false
  $pageUrl = $null

  if ($snapshot -and $snapshot.chatBootstrap) {
    $failureCode = $snapshot.chatBootstrap.failureCode
    $runtimeUsability = $snapshot.chatBootstrap.runtimeUsability
    $challengeDetected = [bool]$snapshot.chatBootstrap.challengeDetected
    $pageUrl = $snapshot.chatBootstrap.pageUrl

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
    sessionId = $sessionId
    outcome = $outcome
    runtimeUsability = $runtimeUsability
    challengeDetected = $challengeDetected
    pageUrl = $pageUrl
    failureCode = $failureCode
    assistantBody =
      if ($lastAssistant) {
        $lastAssistant.body
      } else {
        $null
      }
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

  foreach ($workerToRestart in $stoppedWorkers) {
    try {
      Write-Host "[phase-10] Restarting previously stopped worker $workerToRestart..."
      $null = Invoke-JsonRequest -Method "POST" -Url "$HostControllerBaseUrl/workers/$workerToRestart/start" -Headers $hostControllerHeaders -Body @{}
    } catch {
      Write-Warning "Failed to restart worker ${workerToRestart}: $_"
    }
  }
}

if ($ReturnJson) {
  return $probeResult
}
