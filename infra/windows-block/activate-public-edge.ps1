param(
  [ValidateSet("shadow", "promoted")]
  [string]$Mode = "shadow",
  [string]$RepoRoot = "",
  [string]$BackupPath = "",
  [string]$CaddyServiceName = "caddy",
  [string]$CaddyConfigPath = "",
  [string]$CaddyExePath = "",
  [string]$SiteAddress = ":80",
  [string]$ShadowUpstream = "127.0.0.1:4011",
  [string]$PromotedUpstream = "127.0.0.1:4010",
  [switch]$Apply
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

function Get-PathFromCommandLine {
  param(
    [string]$CommandLine,
    [string]$SwitchName
  )

  if (-not $CommandLine) {
    return $null
  }

  $quotedPattern = "(?i)$([regex]::Escape($SwitchName))\s+`"([^`"]+)`""
  $plainPattern = "(?i)$([regex]::Escape($SwitchName))\s+([^\s]+)"

  if ($CommandLine -match $quotedPattern) {
    return $Matches[1]
  }

  if ($CommandLine -match $plainPattern) {
    return $Matches[1]
  }

  return $null
}

function Resolve-CaddyTruth {
  param(
    [string]$RequestedServiceName,
    [string]$RequestedConfigPath,
    [string]$RequestedExePath
  )

  $service = Get-CimInstance Win32_Service -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -ieq $RequestedServiceName -or
      $_.DisplayName -like "*Caddy*"
    } |
    Select-Object -First 1

  if (-not $service) {
    throw "Could not find the Caddy Windows service."
  }

  $pathName = "$($service.PathName)"
  $exePath = $RequestedExePath
  $configPath = $RequestedConfigPath

  if (-not $exePath -and $pathName) {
    if ($pathName -match '^\s*"([^"]+)"') {
      $exePath = $Matches[1]
    } elseif ($pathName -match '^\s*([^\s]+)') {
      $exePath = $Matches[1]
    }
  }

  if (-not $configPath -and $pathName) {
    $configPath = Get-PathFromCommandLine -CommandLine $pathName -SwitchName "--config"
  }

  if (-not $configPath) {
    $candidates = @(
      "C:\Caddy\Caddyfile",
      "C:\ProgramData\Caddy\Caddyfile",
      (Join-Path $env:ProgramData "Caddy\Caddyfile"),
      "C:\Program Files\Caddy\Caddyfile"
    ) | Where-Object { $_ }

    foreach ($candidate in $candidates) {
      if (Test-Path $candidate) {
        $configPath = $candidate
        break
      }
    }
  }

  if (-not $exePath -or -not (Test-Path $exePath)) {
    throw "Could not resolve caddy.exe path."
  }

  if (-not $configPath) {
    throw "Could not resolve the active Caddy config path."
  }

  return [pscustomobject]@{
    serviceName = $service.Name
    exePath = $exePath
    configPath = $configPath
  }
}

function Get-GeneratedCaddyfile {
  param(
    [string]$ResolvedSiteAddress,
    [string]$Upstream
  )

  return @(
    "{",
    "  auto_https off",
    "}",
    "",
    "$ResolvedSiteAddress {",
    "  encode gzip",
    "  @owmcgp_api path /healthz /api/relay/health /api/relay/ask /api/relay/dialogs* /v1/models /v1/chat/completions",
    "  handle @owmcgp_api {",
    "    reverse_proxy $Upstream",
    "  }",
    "  handle {",
    "    respond ""owmcgp public edge active; route not found"" 404",
    "  }",
    "}"
  ) -join [Environment]::NewLine
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot

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
  throw "Missing edge backup manifest at $backupJsonPath"
}

$edgeBackup = Get-Content -LiteralPath $backupJsonPath -Raw | ConvertFrom-Json
$caddyTruth = Resolve-CaddyTruth `
  -RequestedServiceName $CaddyServiceName `
  -RequestedConfigPath $edgeBackup.caddyConfigPath `
  -RequestedExePath $edgeBackup.caddyExePath

$upstream = if ($Mode -eq "shadow") { $ShadowUpstream } else { $PromotedUpstream }
$generatedRoot = Join-Path $resolvedRepoRoot "infra\data\windows-edge-generated"
$null = New-Item -ItemType Directory -Force -Path $generatedRoot
$generatedConfigPath = Join-Path $generatedRoot "Caddyfile-$Mode"
$generatedContent = Get-GeneratedCaddyfile -ResolvedSiteAddress $SiteAddress -Upstream $upstream
$generatedContent | Set-Content -LiteralPath $generatedConfigPath -Encoding UTF8

& $caddyTruth.exePath validate --config $generatedConfigPath --adapter caddyfile | Out-Null

if (-not $Apply) {
  Write-Output $generatedConfigPath
  return
}

Copy-Item -LiteralPath $generatedConfigPath -Destination $caddyTruth.configPath -Force

try {
  & $caddyTruth.exePath reload --config $caddyTruth.configPath --adapter caddyfile | Out-Null
} catch {
  $backupConfigPath = $edgeBackup.configBackupPath

  if ($backupConfigPath -and (Test-Path $backupConfigPath)) {
    Copy-Item -LiteralPath $backupConfigPath -Destination $caddyTruth.configPath -Force
    & $caddyTruth.exePath reload --config $caddyTruth.configPath --adapter caddyfile | Out-Null
  }

  throw
}

Write-Output $generatedConfigPath
