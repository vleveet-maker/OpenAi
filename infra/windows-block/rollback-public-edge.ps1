param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [string]$CaddyServiceName = "caddy",
  [string]$CaddyConfigPath = "",
  [string]$CaddyExePath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

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

  if (-not $exePath -or -not (Test-Path $exePath)) {
    throw "Could not resolve caddy.exe path."
  }

  if (-not $configPath) {
    throw "Could not resolve the active Caddy config path."
  }

  return [pscustomobject]@{
    exePath = $exePath
    configPath = $configPath
  }
}

$resolvedBackupPath = (Resolve-Path $BackupPath).Path
$backupJsonPath = Join-Path $resolvedBackupPath "edge-backup.json"

if (-not (Test-Path $backupJsonPath)) {
  throw "Missing edge-backup.json in $resolvedBackupPath"
}

$edgeBackup = Get-Content -LiteralPath $backupJsonPath -Raw | ConvertFrom-Json
$caddyTruth = Resolve-CaddyTruth `
  -RequestedServiceName $CaddyServiceName `
  -RequestedConfigPath $(if ($CaddyConfigPath) { $CaddyConfigPath } else { $edgeBackup.caddyConfigPath }) `
  -RequestedExePath $(if ($CaddyExePath) { $CaddyExePath } else { $edgeBackup.caddyExePath })

$backupConfigPath = $edgeBackup.configBackupPath

if (-not $backupConfigPath -or -not (Test-Path $backupConfigPath)) {
  throw "Missing backed-up Caddy config in $resolvedBackupPath"
}

Copy-Item -LiteralPath $backupConfigPath -Destination $caddyTruth.configPath -Force
& $caddyTruth.exePath reload --config $caddyTruth.configPath --adapter caddyfile | Out-Null

Write-Output $resolvedBackupPath
