param(
  [string[]]$WorkerIds = @("dad", "wife", "shared-1", "shared-2", "shared-3", "shared-4", "shared-5"),
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$HostControllerToken = "local-host-controller-token",
  [int]$StartupTimeoutSeconds = 45,
  [int]$ProbeTimeoutSeconds = 180,
  [int]$PollIntervalMs = 1500,
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Method,
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [hashtable]$Headers = @{},
    [object]$Body = $null,
    [int]$TimeoutSeconds = 30
  )

  $invokeParams = @{
    Method = $Method
    Uri = $Url
    Headers = $Headers
    ContentType = "application/json"
    TimeoutSec = $TimeoutSeconds
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
    [string]$Description,
    [int]$TimeoutSeconds = 30,
    [int]$PollIntervalMs = 1000
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

function Get-WorkerHealthFromController {
  param(
    [string]$CurrentWorkerId,
    [hashtable]$Headers
  )

  $health = Invoke-JsonRequest -Method "GET" -Url "$HostControllerBaseUrl/health" -Headers $Headers
  return @($health.workers | Where-Object { $_.workerId -eq $CurrentWorkerId })[0]
}

$controllerHeaders = @{
  "x-host-controller-token" = $HostControllerToken
}

$results = @()

foreach ($workerId in $WorkerIds) {
  Write-Host "[windows-block] Probing $workerId..."
  $sessionId = [guid]::NewGuid().ToString()
  $userMessageId = [guid]::NewGuid().ToString()
  $assistantMessageId = [guid]::NewGuid().ToString()
  $expectedReply = "$workerId-windows-block-ok"
  $workerStopped = $false

  try {
    $null = Invoke-JsonRequest `
      -Method "POST" `
      -Url "$HostControllerBaseUrl/workers/$workerId/start" `
      -Headers $controllerHeaders `
      -Body @{
        runtimeMode = "visible_auth"
        profileStrategy = "durable"
        browserWindowMode = "CompactCorner"
      }

    $workerHealth = Wait-Until `
      -Description "worker $workerId to become reachable" `
      -TimeoutSeconds $StartupTimeoutSeconds `
      -PollIntervalMs $PollIntervalMs `
      -Condition {
        $health = Get-WorkerHealthFromController -CurrentWorkerId $workerId -Headers $controllerHeaders

        if ($null -eq $health) {
          return $null
        }

        if ($health.agentListening -and $health.browserListening) {
          return $health
        }

        return $null
      }

    $agentPort = $workerHealth.agentPort
    $agentBaseUrl = "http://127.0.0.1:$agentPort"

    $bootstrap = Invoke-JsonRequest `
      -Method "POST" `
      -Url "$agentBaseUrl/internal/chat/bootstrap" `
      -Body @{
        sessionId = $sessionId
      } `
      -TimeoutSeconds $ProbeTimeoutSeconds

    if ($bootstrap.status -ne "ready") {
      throw "bootstrap_failed:$($bootstrap.failureCode)"
    }

    $relay = Invoke-JsonRequest `
      -Method "POST" `
      -Url "$agentBaseUrl/internal/relay/messages" `
      -Body @{
        sessionId = $sessionId
        userMessageId = $userMessageId
        assistantMessageId = $assistantMessageId
        bodyText = "Please reply with exactly: $expectedReply"
      } `
      -TimeoutSeconds $ProbeTimeoutSeconds

    if ($relay.failureCode) {
      throw "relay_failed:$($relay.failureCode)"
    }

    if ($relay.assistantText -ne $expectedReply) {
      throw "unexpected_reply:$($relay.assistantText)"
    }

    $finalHealth = Invoke-JsonRequest -Method "GET" -Url "$agentBaseUrl/health" -TimeoutSeconds 10

    $results += [pscustomobject][ordered]@{
      workerId = $workerId
      usable = $true
      runtimeMode = $finalHealth.runtimeMode
      runtimeClass = $finalHealth.runtimeClass
      runtimeStatus = $finalHealth.runtimeStatus
      conversationMode = $bootstrap.conversationMode
      modelLabel = $bootstrap.modelLabel
      reply = $relay.assistantText
      bootstrapFailureCode = $bootstrap.failureCode
      relayFailureCode = $relay.failureCode
      detail = "ok"
    }
  } catch {
    $finalHealth = $null

    try {
      $fallbackHealth = Get-WorkerHealthFromController -CurrentWorkerId $workerId -Headers $controllerHeaders

      if ($fallbackHealth -and $fallbackHealth.agentListening) {
        $finalHealth = Invoke-JsonRequest -Method "GET" -Url "http://127.0.0.1:$($fallbackHealth.agentPort)/health" -TimeoutSeconds 10
      }
    } catch {
      $finalHealth = $null
    }

    $results += [pscustomobject][ordered]@{
      workerId = $workerId
      usable = $false
      runtimeMode = $finalHealth.runtimeMode
      runtimeClass = $finalHealth.runtimeClass
      runtimeStatus = $finalHealth.runtimeStatus
      conversationMode = $null
      modelLabel = $null
      reply = $null
      bootstrapFailureCode = $finalHealth.lastBootstrapFailureCode
      relayFailureCode = $finalHealth.lastRelayFailureCode
      detail = "$_"
    }
  } finally {
    try {
      $null = Invoke-JsonRequest `
        -Method "POST" `
        -Url "$HostControllerBaseUrl/workers/$workerId/stop" `
        -Headers $controllerHeaders `
        -Body @{} `
        -TimeoutSeconds 15
      $workerStopped = $true
    } catch {
      Write-Warning "Failed to stop ${workerId}: $_"
    }

    if ($workerStopped) {
      Start-Sleep -Seconds 2
    }
  }
}

$summary = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  workerCount = $results.Count
  usableCount = @($results | Where-Object { $_.usable }).Count
  unusableCount = @($results | Where-Object { -not $_.usable }).Count
  path = "host-controller -> worker-agent/internal/chat/bootstrap -> worker-agent/internal/relay/messages"
  workers = @($results)
}

if ($OutputJsonPath) {
  $outputDir = Split-Path -Parent $OutputJsonPath

  if ($outputDir) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
  }

  $summary | ConvertTo-Json -Depth 8 | Set-Content -Path $OutputJsonPath -Encoding UTF8
}

if ($OutputMarkdownPath) {
  $outputDir = Split-Path -Parent $OutputMarkdownPath

  if ($outputDir) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
  }

  $lines = @()
  $lines += "# Windows Browser Block Worker Matrix"
  $lines += ""
  $lines += "- Generated: $($summary.generatedAt)"
  $lines += "- Workers: $($summary.workerCount)"
  $lines += "- Usable: $($summary.usableCount)"
  $lines += "- Unusable: $($summary.unusableCount)"
  $lines += "- Path: ``$($summary.path)``"
  $lines += ""
  $lines += "| Worker | Usable | Runtime | Status | Model | Reply | Bootstrap | Relay | Detail |"
  $lines += "|--------|--------|---------|--------|-------|-------|-----------|-------|--------|"

  foreach ($worker in $summary.workers) {
    $detail = ($worker.detail -replace "\|", "/" -replace "\r?\n", " ").Trim()
    $reply = ($worker.reply -replace "\|", "/" -replace "\r?\n", " ").Trim()
    $lines += "| $($worker.workerId) | $($worker.usable) | $($worker.runtimeClass) | $($worker.runtimeStatus) | $($worker.modelLabel) | $reply | $($worker.bootstrapFailureCode) | $($worker.relayFailureCode) | $detail |"
  }

  $lines | Set-Content -Path $OutputMarkdownPath -Encoding UTF8
}

$summary | ConvertTo-Json -Depth 8
