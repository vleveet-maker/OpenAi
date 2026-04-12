param(
  [string]$BaseUrl = "http://127.0.0.1:4010",
  [string]$ApiToken = "",
  [string]$SettingsPath = "",
  [string]$WorkerId = "",
  [string]$HostHeader = "",
  [string]$HopName = "",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$HostControllerToken = "local-host-controller-token",
  [switch]$EnsureWorkerStarted,
  [switch]$StopWorkerWhenDone,
  [switch]$IncludeChatProbe
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptCompatibilityVersion = "phase27-ubuntu-ssh-recovery-v1"

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
}

$repoRoot = Resolve-RepoRoot

if (-not $SettingsPath -or $SettingsPath.Trim().Length -eq 0) {
  $SettingsPath = Join-Path $repoRoot "infra\\data\\control-api\\remote-relay.local.json"
}

if ((-not $ApiToken -or $ApiToken.Trim().Length -eq 0) -and (Test-Path $SettingsPath)) {
  $settings = Get-Content -LiteralPath $SettingsPath -Raw | ConvertFrom-Json
  if ($settings.apiToken) {
    $ApiToken = [string]$settings.apiToken
  }
}

if (-not $ApiToken -or $ApiToken.Trim().Length -eq 0) {
  $ApiToken = $env:OWMCGP_REMOTE_RELAY_API_TOKEN
}

if (-not $ApiToken -or $ApiToken.Trim().Length -eq 0) {
  throw "ApiToken is required for probe."
}

$base = $BaseUrl.TrimEnd("/")
$headers = @{ Authorization = "Bearer $ApiToken" }
$controllerHeaders = @{ "x-host-controller-token" = $HostControllerToken }
$workerStartedByProbe = $false

function Get-ErrorKind {
  param(
    [string]$Message,
    [bool]$HasHttpResponse = $false
  )

  if ($HasHttpResponse) {
    return "http_error"
  }

  if (-not $Message) {
    return "unknown_error"
  }

  $normalized = $Message.ToLowerInvariant()

  if (
    $normalized -match "ssl" -or
    $normalized -match "tls" -or
    $normalized -match "secure channel" -or
    $normalized -match "authentication or decryption has failed" -or
    $normalized -match "handshake"
  ) {
    return "tls_handshake_failed"
  }

  if (
    $normalized -match "timed out" -or
    $normalized -match "timeout"
  ) {
    return "timeout"
  }

  if (
    $normalized -match "actively refused" -or
    $normalized -match "connection refused" -or
    $normalized -match "unable to connect"
  ) {
    return "connection_refused"
  }

  if (
    $normalized -match "name could not be resolved" -or
    $normalized -match "remote name could not be resolved" -or
    $normalized -match "no such host"
  ) {
    return "dns_failed"
  }

  return "transport_error"
}

function Get-BodyPreview {
  param([string]$Body)

  if ([string]::IsNullOrWhiteSpace($Body)) {
    return ""
  }

  $normalized = ($Body -replace "\s+", " ").Trim()

  if ($normalized.Length -le 200) {
    return $normalized
  }

  return "$($normalized.Substring(0, 200))..."
}

function Invoke-ProbeRequest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [string]$Method = "GET",
    [hashtable]$Headers = @{},
    [string]$Body = "",
    [string]$RequestHostHeader = "",
    [string]$CurrentHopName = "",
    [int]$TimeoutSeconds = 30
  )

  $handler = $null
  $client = $null
  $request = $null

  try {
    $handler = [System.Net.Http.HttpClientHandler]::new()
    $client = [System.Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds($TimeoutSeconds)
    $request = [System.Net.Http.HttpRequestMessage]::new(
      [System.Net.Http.HttpMethod]::new($Method.ToUpperInvariant()),
      $Url
    )

    if ($Body -and $Body.Length -gt 0) {
      $request.Content = [System.Net.Http.StringContent]::new(
        $Body,
        [System.Text.Encoding]::UTF8,
        "application/json"
      )
    }

    foreach ($headerName in $Headers.Keys) {
      $headerValue = [string]$Headers[$headerName]

      if ([string]::IsNullOrWhiteSpace($headerValue)) {
        continue
      }

      $null = $request.Headers.TryAddWithoutValidation($headerName, $headerValue)
    }

    if (-not [string]::IsNullOrWhiteSpace($RequestHostHeader)) {
      $request.Headers.Host = $RequestHostHeader
    }

    $response = $client.SendAsync($request).GetAwaiter().GetResult()
    $responseBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $responseHeaders = New-Object System.Collections.Generic.List[string]

    foreach ($header in $response.Headers.GetEnumerator()) {
      $responseHeaders.Add("$($header.Key)=$(@($header.Value) -join ', ')")
    }

    foreach ($header in $response.Content.Headers.GetEnumerator()) {
      $responseHeaders.Add("$($header.Key)=$(@($header.Value) -join ', ')")
    }

    $serverHeader =
      if ($response.Headers.Server) {
        @($response.Headers.Server | ForEach-Object { $_.ToString() }) -join ", "
      } else {
        $null
      }
    $viaValues = $null
    $hasVia = $response.Headers.TryGetValues("Via", [ref]$viaValues)
    $viaHeader =
      if ($hasVia -and $null -ne $viaValues) {
        @($viaValues) -join ", "
      } else {
        $null
      }
    $statusCode = [int]$response.StatusCode
    $requestHost =
      if ([string]::IsNullOrWhiteSpace($RequestHostHeader)) {
        $null
      } else {
        $RequestHostHeader
      }
    $hopLabel =
      if ([string]::IsNullOrWhiteSpace($CurrentHopName)) {
        $null
      } else {
        $CurrentHopName
      }
    $success = $statusCode -ge 200 -and $statusCode -lt 400

    return [ordered]@{
      success = $success
      statusCode = $statusCode
      body = $responseBody
      bodyPreview = Get-BodyPreview -Body $responseBody
      headers = $responseHeaders.ToArray()
      error =
        if ($success) {
          $null
        } else {
          "HTTP $statusCode"
        }
      errorKind =
        if ($success) {
          $null
        } else {
          "http_error"
        }
      requestUrl = $Url
      requestHostHeader = $requestHost
      hopName = $hopLabel
      serverHeader = $serverHeader
      viaHeader = $viaHeader
    }
  } catch {
    $errorMessage = "$_"
    $statusCode = $null
    $body = ""
    $bodyPreview = ""
    $responseHeaders = @()
    $hasHttpResponse = $false
    $requestHost =
      if ([string]::IsNullOrWhiteSpace($RequestHostHeader)) {
        $null
      } else {
        $RequestHostHeader
      }
    $hopLabel =
      if ([string]::IsNullOrWhiteSpace($CurrentHopName)) {
        $null
      } else {
        $CurrentHopName
      }

    if ($_.Exception.Response) {
      $hasHttpResponse = $true
      $statusCode = [int]$_.Exception.Response.StatusCode
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $body = $reader.ReadToEnd()
      $bodyPreview = Get-BodyPreview -Body $body
      $responseHeaders = @($_.Exception.Response.Headers.AllKeys | ForEach-Object { "$_=$($_.Exception.Response.Headers[$_])" })
    }

    return [ordered]@{
      success = $false
      statusCode = $statusCode
      body = $body
      bodyPreview = $bodyPreview
      headers = $responseHeaders
      error = $errorMessage
      errorKind = (Get-ErrorKind -Message $errorMessage -HasHttpResponse:$hasHttpResponse)
      requestUrl = $Url
      requestHostHeader = $requestHost
      hopName = $hopLabel
      serverHeader = $null
      viaHeader = $null
    }
  } finally {
    if ($null -ne $request) {
      $request.Dispose()
    }

    if ($null -ne $client) {
      $client.Dispose()
    }

    if ($null -ne $handler) {
      $handler.Dispose()
    }
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

  return Invoke-RestMethod @invokeParams
}

function Wait-ForWorkerReady {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CurrentWorkerId,
    [int]$TimeoutSeconds = 45,
    [int]$PollIntervalMs = 1500
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    $health = Invoke-JsonRequest `
      -Method "GET" `
      -Url "$($HostControllerBaseUrl.TrimEnd('/'))/health" `
      -Headers $controllerHeaders `
      -TimeoutSeconds 20

    $worker = @($health.workers | Where-Object { $_.workerId -eq $CurrentWorkerId })[0]

    if (
      $null -ne $worker -and
      $worker.agentListening -and
      $worker.browserListening
    ) {
      return $worker
    }

    Start-Sleep -Milliseconds $PollIntervalMs
  }

  throw "Timed out waiting for worker $CurrentWorkerId to become ready through host-controller."
}

if ($EnsureWorkerStarted) {
  if (-not $WorkerId -or $WorkerId.Trim().Length -eq 0) {
    throw "WorkerId is required when -EnsureWorkerStarted is used."
  }

  $null = Invoke-JsonRequest `
    -Method "POST" `
    -Url "$($HostControllerBaseUrl.TrimEnd('/'))/workers/$($WorkerId.Trim())/start" `
    -Headers $controllerHeaders `
    -Body @{
      runtimeMode = "visible_auth"
      profileStrategy = "durable"
      browserWindowMode = "CompactCorner"
    } `
    -TimeoutSeconds 30

  $workerStartedByProbe = $true
  $null = Wait-ForWorkerReady -CurrentWorkerId $WorkerId.Trim()
}

try {
  $health = Invoke-ProbeRequest -Url "$base/healthz" -RequestHostHeader $HostHeader -CurrentHopName $HopName -TimeoutSeconds 20
  $models = Invoke-ProbeRequest -Url "$base/v1/models" -Headers $headers -RequestHostHeader $HostHeader -CurrentHopName $HopName -TimeoutSeconds 20

  $result = [ordered]@{
    checkedAt = (Get-Date).ToString("o")
    scriptCompatibilityVersion = $scriptCompatibilityVersion
    baseUrl = $base
    scheme = ([Uri]$base).Scheme
    hopName =
      if ([string]::IsNullOrWhiteSpace($HopName)) {
        $null
      } else {
        $HopName
      }
    requestHostHeader =
      if ([string]::IsNullOrWhiteSpace($HostHeader)) {
        $null
      } else {
        $HostHeader
      }
    healthz = $health
    models = $models
  }

  if ($IncludeChatProbe) {
    $payload = @{
      model = "owmcgp-browser"
      timeout_ms = 90000
      messages = @(
        @{
          role = "user"
          content = "Reply with exactly: probe-ok"
        }
      )
    } | ConvertTo-Json -Depth 6

    if ($WorkerId -and $WorkerId.Trim().Length -gt 0) {
      $payloadObject = $payload | ConvertFrom-Json
      $payloadObject | Add-Member -NotePropertyName worker_id -NotePropertyValue $WorkerId.Trim()
      $payload = $payloadObject | ConvertTo-Json -Depth 6
    }

    $chatProbe = Invoke-ProbeRequest `
      -Url "$base/v1/chat/completions" `
      -Method POST `
      -Headers $headers `
      -Body $payload `
      -RequestHostHeader $HostHeader `
      -CurrentHopName $HopName `
      -TimeoutSeconds 120
    $result.chatCompletions = $chatProbe
    $result.chat = $chatProbe
  }

  $result | ConvertTo-Json -Depth 8
} finally {
  if ($workerStartedByProbe -and $StopWorkerWhenDone) {
    try {
      $null = Invoke-JsonRequest `
        -Method "POST" `
        -Url "$($HostControllerBaseUrl.TrimEnd('/'))/workers/$($WorkerId.Trim())/stop" `
        -Headers $controllerHeaders `
        -Body @{} `
        -TimeoutSeconds 20
    } catch {
      Write-Warning "Failed to stop $WorkerId after probe: $_"
    }
  }
}
