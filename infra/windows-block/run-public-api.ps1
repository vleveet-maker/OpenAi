param(
  [string]$RepoRoot = "",
  [string]$ListenHost = "127.0.0.1",
  [int]$ListenPort = 4010,
  [string]$ApiToken = "",
  [string]$SettingsPath = "",
  [string]$DefaultWorkerId = "",
  [string[]]$AllowedWorkerIds = @(),
  [int]$RequestTimeoutMs = 180000,
  [switch]$SkipInstall,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-RepoRoot {
  param([string]$Candidate)

  if ($Candidate -and (Test-Path $Candidate)) {
    return (Resolve-Path $Candidate).Path
  }

  return (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
}

function Resolve-SettingsPath {
  param(
    [string]$ResolvedRepoRoot,
    [string]$Candidate
  )

  if ($Candidate -and $Candidate.Trim().Length -gt 0) {
    if ([System.IO.Path]::IsPathRooted($Candidate)) {
      return $Candidate
    }

    return (Join-Path $ResolvedRepoRoot $Candidate)
  }

  return (Join-Path $ResolvedRepoRoot "infra\\data\\control-api\\remote-relay.local.json")
}

function Get-WorkerSortKey {
  param([string]$WorkerId)

  switch ($WorkerId) {
    "dad" { return 0 }
    "wife" { return 1 }
    default {
      if ($WorkerId -match "^shared-(\d+)$") {
        return 100 + [int]$Matches[1]
      }

      return 1000
    }
  }
}

function Get-AgentPortForWorker {
  param([string]$WorkerId)

  switch ($WorkerId) {
    "dad" { return 4021 }
    "wife" { return 4022 }
    default {
      if ($WorkerId -match "^shared-(\d+)$") {
        return 4022 + [int]$Matches[1]
      }

      throw "Unsupported worker id: $WorkerId"
    }
  }
}

function Get-DiscoveredWorkerIds {
  param([string]$ResolvedRepoRoot)

  $hostWorkerDir = Join-Path $ResolvedRepoRoot "infra\\host-worker"
  $patterns = Get-ChildItem -LiteralPath $hostWorkerDir -Filter "start-*-host-worker.ps1" -ErrorAction Stop

  $workerIds =
    $patterns |
    ForEach-Object {
      if ($_.BaseName -match "^start-(.+)-host-worker$") {
        $Matches[1]
      }
    } |
    Where-Object { $_ } |
    Sort-Object { Get-WorkerSortKey -WorkerId $_ }

  if (-not $workerIds -or $workerIds.Count -eq 0) {
    throw "No host worker launchers found in $hostWorkerDir"
  }

  return @($workerIds)
}

function Normalize-WorkerIdList {
  param([object]$Value)

  if ($null -eq $Value) {
    return @()
  }

  if ($Value -is [string]) {
    return @($Value.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  }

  if ($Value -is [System.Collections.IEnumerable]) {
    $result = @()
    foreach ($entry in $Value) {
      if ($null -eq $entry) {
        continue
      }

      $trimmed = "$entry".Trim()
      if ($trimmed.Length -gt 0) {
        $result += $trimmed
      }
    }

    return @($result)
  }

  return @()
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot
$resolvedSettingsPath = Resolve-SettingsPath -ResolvedRepoRoot $resolvedRepoRoot -Candidate $SettingsPath
$settings = $null

if (Test-Path $resolvedSettingsPath) {
  $settings = Get-Content -LiteralPath $resolvedSettingsPath -Raw | ConvertFrom-Json
}

if (-not $ApiToken -and $settings -and $settings.apiToken) {
  $ApiToken = [string]$settings.apiToken
}

if (-not $ApiToken -and $env:OWMCGP_REMOTE_RELAY_API_TOKEN) {
  $ApiToken = $env:OWMCGP_REMOTE_RELAY_API_TOKEN
}

if (-not $ApiToken -or $ApiToken.Trim().Length -eq 0) {
  throw "ApiToken is required. Pass -ApiToken, set OWMCGP_REMOTE_RELAY_API_TOKEN, or create $resolvedSettingsPath"
}

if ($settings) {
  if ($settings.listenHost) {
    $ListenHost = [string]$settings.listenHost
  }

  if ($settings.listenPort) {
    $ListenPort = [int]$settings.listenPort
  }

  if (-not $DefaultWorkerId -and $settings.defaultWorkerId) {
    $DefaultWorkerId = [string]$settings.defaultWorkerId
  }

  if ($settings.requestTimeoutMs) {
    $RequestTimeoutMs = [int]$settings.requestTimeoutMs
  }

  if ((-not $AllowedWorkerIds -or $AllowedWorkerIds.Count -eq 0) -and $settings.allowedWorkerIds) {
    $AllowedWorkerIds = Normalize-WorkerIdList -Value $settings.allowedWorkerIds
  }
}

$workerIds = Get-DiscoveredWorkerIds -ResolvedRepoRoot $resolvedRepoRoot

if ($AllowedWorkerIds -and $AllowedWorkerIds.Count -gt 0) {
  $unknownWorkerIds = @($AllowedWorkerIds | Where-Object { $_ -notin $workerIds })

  if ($unknownWorkerIds.Count -gt 0) {
    throw "Unknown AllowedWorkerIds: $($unknownWorkerIds -join ', ')"
  }

  $workerIds = @($workerIds | Where-Object { $_ -in $AllowedWorkerIds })
}

if (-not $workerIds -or $workerIds.Count -eq 0) {
  throw "No workers selected for the public API."
}

$workerDefinitionsObject = @(
  $workerIds |
    ForEach-Object {
      $workerId = $_
      [ordered]@{
        workerId = $workerId
        displayName = $workerId
        containerName = "worker-$workerId"
        profilePath = (Join-Path $resolvedRepoRoot "infra\\data\\host-profiles\\$workerId")
        agentBaseUrl = "http://127.0.0.1:$((Get-AgentPortForWorker -WorkerId $workerId))"
        runtimeType = "host"
        defaultStatus = "starting"
      }
    }
)

$workerDefinitions = $workerDefinitionsObject | ConvertTo-Json -Compress

if (
  $workerDefinitionsObject.Count -eq 1 -and
  -not $workerDefinitions.TrimStart().StartsWith("[")
) {
  $workerDefinitions = "[$workerDefinitions]"
}

$controlApiDir = Join-Path $resolvedRepoRoot "services\\control-api"
$controlApiDataDir = Join-Path $resolvedRepoRoot "infra\\data\\control-api"
$null = New-Item -ItemType Directory -Force -Path $controlApiDataDir

Push-Location $controlApiDir
try {
  if (
    -not $SkipInstall -or
    -not (Test-Path (Join-Path $controlApiDir "node_modules")) -or
    -not (Test-Path (Join-Path $controlApiDir "package-lock.json"))
  ) {
    cmd /c npm.cmd ci --no-audit --no-fund
  }

  if (-not $SkipBuild -or -not (Test-Path (Join-Path $controlApiDir "dist\\server.js"))) {
    cmd /c npm.cmd run build
  }

  $env:CONTROL_API_NAME = "owmcgp-remote-relay"
  $env:CONTROL_API_MODE = "remote_relay"
  $env:CONTROL_API_HOST = $ListenHost
  $env:CONTROL_API_PORT = "$ListenPort"
  $env:REMOTE_RELAY_API_TOKEN = $ApiToken
  $env:REMOTE_RELAY_REQUEST_TIMEOUT_MS = "$RequestTimeoutMs"
  $env:REMOTE_RELAY_TOPOLOGY_HINT = "windows_browser_block_local"
  $env:SESSION_DB_PATH = (Join-Path $controlApiDataDir "session-routing.sqlite")
  $env:AUTO_START_HOST_WORKERS = "false"
  $env:WORKER_DEFINITIONS = $workerDefinitions

  if ($DefaultWorkerId -and $DefaultWorkerId.Trim().Length -gt 0) {
    $env:REMOTE_RELAY_DEFAULT_WORKER_ID = $DefaultWorkerId.Trim()
  } else {
    Remove-Item Env:REMOTE_RELAY_DEFAULT_WORKER_ID -ErrorAction SilentlyContinue
  }

  cmd /c npm.cmd run start
} finally {
  Pop-Location
}
