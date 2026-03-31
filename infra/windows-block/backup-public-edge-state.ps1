param(
  [string]$RepoRoot = "",
  [string]$OutputRoot = "",
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

  return (Join-Path $ResolvedRepoRoot "infra\data\windows-edge-backups")
}

function ConvertTo-PlainString {
  param([object]$Value)

  if ($null -eq $Value) {
    return ""
  }

  return "$Value".Trim('"')
}

function Get-PathFromCommandLine {
  param(
    [string]$CommandLine,
    [string]$SwitchName
  )

  if (-not $CommandLine -or -not $SwitchName) {
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

  $pathName = if ($service) { "$($service.PathName)" } else { "" }
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

  return [pscustomobject]@{
    service = $service
    exePath = ConvertTo-PlainString -Value $exePath
    configPath = ConvertTo-PlainString -Value $configPath
    pathName = $pathName
  }
}

function Get-ListenerSnapshot {
  $ports = @(80, 443, 4010, 4040)

  return @(
    foreach ($port in $ports) {
      $connections = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue

      if (-not $connections) {
        [pscustomobject]@{
          localPort = $port
          state = "not_listening"
          localAddress = $null
          owningProcessId = $null
          owningProcessName = $null
        }

        continue
      }

      foreach ($connection in $connections) {
        $processName = $null

        try {
          $processName = (Get-Process -Id $connection.OwningProcess -ErrorAction Stop).ProcessName
        } catch {
          $processName = "<unknown>"
        }

        [pscustomobject]@{
          localPort = $port
          state = "listening"
          localAddress = $connection.LocalAddress
          owningProcessId = $connection.OwningProcess
          owningProcessName = $processName
        }
      }
    }
  )
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot
$resolvedOutputRoot = Resolve-OutputRoot -ResolvedRepoRoot $resolvedRepoRoot -Candidate $OutputRoot
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $resolvedOutputRoot $timestamp
$null = New-Item -ItemType Directory -Force -Path $backupPath

$caddyTruth = Resolve-CaddyTruth `
  -RequestedServiceName $CaddyServiceName `
  -RequestedConfigPath $CaddyConfigPath `
  -RequestedExePath $CaddyExePath

$listeners = Get-ListenerSnapshot
$configBackupPath = $null

if ($caddyTruth.configPath -and (Test-Path $caddyTruth.configPath)) {
  $configDirectory = Join-Path $backupPath "caddy"
  $null = New-Item -ItemType Directory -Force -Path $configDirectory
  $configBackupPath = Join-Path $configDirectory (Split-Path $caddyTruth.configPath -Leaf)
  Copy-Item -LiteralPath $caddyTruth.configPath -Destination $configBackupPath -Force
}

$serviceExport = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  backupPath = $backupPath
  caddyServiceName = if ($caddyTruth.service) { $caddyTruth.service.Name } else { $CaddyServiceName }
  caddyDisplayName = if ($caddyTruth.service) { $caddyTruth.service.DisplayName } else { $null }
  caddyState = if ($caddyTruth.service) { $caddyTruth.service.State } else { "not_found" }
  caddyPathName = $caddyTruth.pathName
  caddyExePath = $caddyTruth.exePath
  caddyConfigPath = $caddyTruth.configPath
  configBackupPath = $configBackupPath
  listeners = $listeners
}

$serviceExport | ConvertTo-Json -Depth 8 | Set-Content -Path (Join-Path $backupPath "edge-backup.json") -Encoding UTF8

$resolvedServiceName = if ($caddyTruth.service) { $caddyTruth.service.Name } else { $CaddyServiceName }
$resolvedConfigPath = if ($caddyTruth.configPath) { $caddyTruth.configPath } else { "<unknown>" }
$resolvedConfigBackupPath = if ($configBackupPath) { $configBackupPath } else { "<not copied>" }

$summaryLines = @(
  "# Windows Public Edge Backup",
  "",
  "- Generated at: $(Get-Date -Format "o")",
  "- Backup path: $backupPath",
  "- Caddy service: $resolvedServiceName",
  "- Caddy config path: $resolvedConfigPath",
  "- Caddy config backup: $resolvedConfigBackupPath",
  "",
  "## Listener Snapshot"
)

foreach ($listener in $listeners) {
  $summaryLines += "- Port $($listener.localPort): $($listener.state) via $($listener.owningProcessName) (pid $($listener.owningProcessId)) on $($listener.localAddress)"
}

$summaryLines | Set-Content -Path (Join-Path $backupPath "README.md") -Encoding UTF8

Write-Output $backupPath
