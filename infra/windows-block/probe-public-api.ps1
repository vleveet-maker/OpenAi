param(
  [string]$BaseUrl = "http://127.0.0.1:4010",
  [string]$ApiToken = "",
  [string]$SettingsPath = "",
  [string]$WorkerId = "",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$HostControllerToken = "local-host-controller-token",
  [switch]$EnsureWorkerStarted,
  [switch]$StopWorkerWhenDone,
  [switch]$IncludeChatProbe
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

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

function Invoke-ProbeRequest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [string]$Method = "GET",
    [hashtable]$Headers = @{},
    [string]$Body = "",
    [int]$TimeoutSeconds = 30
  )

  try {
    $invokeParams = @{
      UseBasicParsing = $true
      Uri = $Url
      Method = $Method
      Headers = $Headers
      TimeoutSec = $TimeoutSeconds
    }

    if ($Body -and $Body.Length -gt 0) {
      $invokeParams.ContentType = "application/json"
      $invokeParams.Body = $Body
    }

    $response = Invoke-WebRequest @invokeParams

    return [ordered]@{
      success = $true
      statusCode = [int]$response.StatusCode
      body = $response.Content
      headers = @($response.Headers.Keys | ForEach-Object { "$_=$($response.Headers[$_])" })
      error = $null
      errorKind = $null
      requestUrl = $Url
    }
  } catch {
    $errorMessage = "$_"
    $statusCode = $null
    $body = ""
    $responseHeaders = @()
    $hasHttpResponse = $false

    if ($_.Exception.Response) {
      $hasHttpResponse = $true
      $statusCode = [int]$_.Exception.Response.StatusCode
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $body = $reader.ReadToEnd()
      $responseHeaders = @($_.Exception.Response.Headers.AllKeys | ForEach-Object { "$_=$($_.Exception.Response.Headers[$_])" })
    }

    return [ordered]@{
      success = $false
      statusCode = $statusCode
      body = $body
      headers = $responseHeaders
      error = $errorMessage
      errorKind = (Get-ErrorKind -Message $errorMessage -HasHttpResponse:$hasHttpResponse)
      requestUrl = $Url
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
  $health = Invoke-ProbeRequest -Url "$base/healthz" -TimeoutSeconds 20
  $models = Invoke-ProbeRequest -Url "$base/v1/models" -Headers $headers -TimeoutSeconds 20

  $result = [ordered]@{
    checkedAt = (Get-Date).ToString("o")
    baseUrl = $base
    scheme = ([Uri]$base).Scheme
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

    $result.chatCompletions = Invoke-ProbeRequest `
      -Url "$base/v1/chat/completions" `
      -Method POST `
      -Headers $headers `
      -Body $payload `
      -TimeoutSeconds 120
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
