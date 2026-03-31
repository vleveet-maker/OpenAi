param(
  [string]$RepoRoot = "",
  [string]$OutputRoot = "",
  [string]$BackupPath = "",
  [string]$CaddyServiceName = "caddy",
  [string]$CaddyConfigPath = "",
  [string]$CaddyExePath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-RepoRoot {
  param([string]$Candidate)

  if ($Candidate -and (Test-Path $Candidate)) {
    return (Resolve-Path $Candidate).Path
  }

  return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Resolve-OutputRoot {
  param(
    [string]$ResolvedRepoRoot,
    [string]$Candidate
  )

  if ($Candidate -and $Candidate.Trim().Length -gt 0) {
    return $Candidate
  }

  return (Join-Path $ResolvedRepoRoot "infra\data\windows-edge-audits")
}

function Invoke-OptionalRequest {
  param(
    [string]$Url,
    [string]$Method = "GET",
    [hashtable]$Headers = @{},
    [string]$Body = ""
  )

  try {
    $params = @{
      Method = $Method
      Uri = $Url
      Headers = $Headers
      TimeoutSec = 20
      UseBasicParsing = $true
    }

    if ($Body -and $Body.Length -gt 0) {
      $params.ContentType = "application/json"
      $params.Body = $Body
    }

    $response = Invoke-WebRequest @params

    return [pscustomobject]@{
      statusCode = [int]$response.StatusCode
      content = $response.Content
      headers = @($response.Headers.Keys | ForEach-Object { "$_=$($response.Headers[$_])" })
      error = $null
    }
  } catch {
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      return [pscustomobject]@{
        statusCode = [int]$_.Exception.Response.StatusCode
        content = $reader.ReadToEnd()
        headers = @($_.Exception.Response.Headers.AllKeys | ForEach-Object { "$_=$($_.Exception.Response.Headers[$_])" })
        error = "$($_.Exception.Message)"
      }
    }

    return [pscustomobject]@{
      statusCode = $null
      content = ""
      headers = @()
      error = "$_"
    }
  }
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot
$resolvedOutputRoot = Resolve-OutputRoot -ResolvedRepoRoot $resolvedRepoRoot -Candidate $OutputRoot
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$auditPath = Join-Path $resolvedOutputRoot $timestamp
$null = New-Item -ItemType Directory -Force -Path $auditPath

if (-not $BackupPath -or $BackupPath.Trim().Length -eq 0) {
  $backupScript = Join-Path $PSScriptRoot "backup-public-edge-state.ps1"
  $backupResult = & $backupScript `
    -RepoRoot $resolvedRepoRoot `
    -CaddyServiceName $CaddyServiceName `
    -CaddyConfigPath $CaddyConfigPath `
    -CaddyExePath $CaddyExePath

  $BackupPath = ($backupResult | Select-Object -Last 1).Trim()
}

$backupJsonPath = Join-Path $BackupPath "edge-backup.json"

if (-not (Test-Path $backupJsonPath)) {
  throw "Expected edge-backup.json at $backupJsonPath"
}

$edgeTruth = Get-Content -LiteralPath $backupJsonPath -Raw | ConvertFrom-Json
$healthz = Invoke-OptionalRequest -Url "http://127.0.0.1/healthz"
$models = Invoke-OptionalRequest -Url "http://127.0.0.1/v1/models"
$api4010 = Invoke-OptionalRequest -Url "http://127.0.0.1:4010/healthz"
$controller4040 = Invoke-OptionalRequest -Url "http://127.0.0.1:4040/health"

$auditObject = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  backupPath = $edgeTruth.backupPath
  caddyServiceName = $edgeTruth.caddyServiceName
  caddyDisplayName = $edgeTruth.caddyDisplayName
  caddyState = $edgeTruth.caddyState
  caddyExePath = $edgeTruth.caddyExePath
  caddyConfigPath = $edgeTruth.caddyConfigPath
  configBackupPath = $edgeTruth.configBackupPath
  listeners = $edgeTruth.listeners
  probes = [ordered]@{
    "http://127.0.0.1/healthz" = $healthz
    "http://127.0.0.1/v1/models" = $models
    "http://127.0.0.1:4010/healthz" = $api4010
    "http://127.0.0.1:4040/health" = $controller4040
  }
}

$auditObject | ConvertTo-Json -Depth 8 | Set-Content -Path (Join-Path $auditPath "edge-audit.json") -Encoding UTF8

$resolvedAuditConfigPath = if ($edgeTruth.caddyConfigPath) { $edgeTruth.caddyConfigPath } else { "<unknown>" }
$resolvedAuditBackupPath = if ($edgeTruth.configBackupPath) { $edgeTruth.configBackupPath } else { "<not copied>" }

$lines = @(
  "# Windows Public Edge Audit",
  "",
  "- Generated at: $(Get-Date -Format "o")",
  "- Backup path: $($edgeTruth.backupPath)",
  "- Caddy service: $($edgeTruth.caddyServiceName) ($($edgeTruth.caddyState))",
  "- Caddy config path: $resolvedAuditConfigPath",
  "- Config backup path: $resolvedAuditBackupPath",
  "",
  "## Listener Ownership"
)

foreach ($listener in $edgeTruth.listeners) {
  $lines += "- Port $($listener.localPort): $($listener.state) via $($listener.owningProcessName) (pid $($listener.owningProcessId)) on $($listener.localAddress)"
}

$lines += ""
$lines += "## Local Probe Snapshot"

foreach ($probeName in $auditObject.probes.Keys) {
  $probe = $auditObject.probes[$probeName]
  $statusText = if ($null -ne $probe.statusCode) { "$($probe.statusCode)" } else { "<none>" }
  $errorText = if ($probe.error) { "$($probe.error)" } else { "<none>" }
  $lines += "- ${probeName}: status $statusText, error $errorText"
}

$lines | Set-Content -Path (Join-Path $auditPath "README.md") -Encoding UTF8

Write-Output $auditPath
