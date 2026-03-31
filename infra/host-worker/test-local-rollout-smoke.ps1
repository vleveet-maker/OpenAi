param(
  [string[]]$WorkerIds = @("dad", "wife", "shared-1", "shared-2", "shared-3", "shared-4", "shared-5"),
  [string]$PublicBaseUrl = "http://127.0.0.1:8080",
  [string]$InternalBaseUrl = "http://127.0.0.1:8081",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$InternalAdminToken = "local-internal-admin-token",
  [string]$HostControllerToken = "local-host-controller-token",
  [int]$TimeoutSeconds = 180,
  [string]$OutputJsonPath,
  [string]$OutputMarkdownPath
)

$ErrorActionPreference = "Stop"

$singleProbePath = Join-Path $PSScriptRoot "test-host-worker-relay.ps1"

if (-not (Test-Path $singleProbePath)) {
  throw "Missing local proof script: $singleProbePath"
}

$results = @()

foreach ($workerId in $WorkerIds) {
  Write-Host "[local-rollout] Probing $workerId..."

  $expectedReply = "$workerId-smoke-ok"
  $result = & $singleProbePath `
    -WorkerId $workerId `
    -SessionLabel "Local rollout smoke: $workerId" `
    -ExpectedReply $expectedReply `
    -PublicBaseUrl $PublicBaseUrl `
    -InternalBaseUrl $InternalBaseUrl `
    -HostControllerBaseUrl $HostControllerBaseUrl `
    -InternalAdminToken $InternalAdminToken `
    -HostControllerToken $HostControllerToken `
    -TimeoutSeconds $TimeoutSeconds `
    -ReturnJson

  $results += ,$result
}

$usableCount = @($results | Where-Object { $_.proofUsability -eq "usable" }).Count
$unusableCount = $results.Count - $usableCount

$summary = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  workerCount = $results.Count
  usableCount = $usableCount
  unusableCount = $unusableCount
  proofPath = "CompactCorner -> Temporary Chat -> GPT-5.4 Thinking -> relay"
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
  $lines += "# Local Rollout Smoke Matrix"
  $lines += ""
  $lines += "- Generated: $($summary.generatedAt)"
  $lines += "- Workers: $($summary.workerCount)"
  $lines += "- Usable: $($summary.usableCount)"
  $lines += "- Unusable: $($summary.unusableCount)"
  $lines += "- Proof path: ``$($summary.proofPath)``"
  $lines += ""
  $lines += "| Worker | Usability | Runtime | Conversation | Model | Relay | Failure | Reply |"
  $lines += "|--------|-----------|---------|--------------|-------|-------|---------|-------|"

  foreach ($worker in $summary.workers) {
    $failure = @($worker.failureCode, $worker.bootstrapFailureCode, $worker.relayFailureCode) |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
      Select-Object -First 1

    $reply =
      if ([string]::IsNullOrWhiteSpace($worker.assistantReplyText)) {
        ""
      } else {
        ($worker.assistantReplyText -replace "\|", "/")
      }

    $lines += "| $($worker.workerId) | $($worker.proofUsability) | $($worker.runtimeClass) | $($worker.conversationMode) | $($worker.modelLabel) | $($worker.relayResult) | $failure | $reply |"
  }

  $lines | Set-Content -Path $OutputMarkdownPath -Encoding UTF8
}

$summary | ConvertTo-Json -Depth 8
