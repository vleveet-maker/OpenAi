[CmdletBinding()]
param(
  [string]$HostName = "77.66.186.75",
  [int]$Port = 2222,
  [string]$User = "mi50",
  [string]$RemoteAppDir = "/opt/owmcgp-remote-relay",
  [string]$RemoteEnvPath = "/etc/owmcgp/remote-relay.env",
  [string]$RemoteDataDir = "/srv/owmcgp-remote-relay",
  [string]$ServiceName = "owmcgp-remote-relay",
  [string]$ControlApiHost = "127.0.0.1",
  [string]$LinuxBundlePath,
  [string]$RemoteRelayApiToken,
  [string]$WorkerDefinitionsJson,
  [string]$TopologyHint = "separate_host_runtime_via_reverse_tunnel",
  [switch]$EnableService,
  [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
$controlApiDir = Join-Path $repoRoot "services\\control-api"
$serviceFile = Join-Path $repoRoot "infra\\remote\\systemd\\owmcgp-remote-relay.service"
$probeScript = Join-Path $repoRoot "infra\\remote\\probe-remote-host.sh"
$remoteTarget = "{0}@{1}" -f $User, $HostName
$remoteControlApiDir = "$RemoteAppDir/services/control-api"
$remoteServicesDirTarget = "${remoteTarget}:$RemoteAppDir/services"
$remoteServiceFileTarget = "${remoteTarget}:$ServiceName.service"
$remoteProbeTarget = "${remoteTarget}:probe-remote-host.sh"
$remoteBundleTarget = "${remoteTarget}:control-api-remote-relay-linux.tar.gz"
$remoteEnvTarget = "${remoteTarget}:remote-relay.env"

function Invoke-RemoteCommand {
  param([string]$Command)

  & ssh -p $Port $remoteTarget $Command
}

function New-RemoteRelayEnvFile {
  param([string]$Path)

  if (-not $RemoteRelayApiToken) {
    throw "RemoteRelayApiToken is required when generating the env file"
  }

  $lines = @(
    "CONTROL_API_NAME=$ServiceName"
    "CONTROL_API_MODE=remote_relay"
    "CONTROL_API_HOST=$ControlApiHost"
    "CONTROL_API_PORT=4010"
    "REMOTE_RELAY_API_TOKEN=$RemoteRelayApiToken"
    "REMOTE_RELAY_REQUEST_TIMEOUT_MS=180000"
    "REMOTE_RELAY_TOPOLOGY_HINT=$TopologyHint"
    "SESSION_DB_PATH=$RemoteDataDir/session-routing.sqlite"
    "AUTO_START_HOST_WORKERS=false"
  )

  if ($WorkerDefinitionsJson) {
    $lines += "WORKER_DEFINITIONS=$WorkerDefinitionsJson"
  }

  Set-Content -Path $Path -Value ($lines -join [Environment]::NewLine) -Encoding utf8
}

if (-not $LinuxBundlePath -and -not $SkipBuild) {
  Push-Location $controlApiDir
  try {
    & cmd /c npm.cmd run build
  } finally {
    Pop-Location
  }
}

Write-Host "Preparing remote directories on $remoteTarget"
Invoke-RemoteCommand "mkdir -p '$RemoteAppDir/services' '$RemoteDataDir' '/etc/owmcgp' '/etc/systemd/system'"

if ($LinuxBundlePath) {
  $resolvedBundle = (Resolve-Path $LinuxBundlePath).Path
  Write-Host "Copying prebuilt Linux bundle from $resolvedBundle"
  & scp -P $Port $resolvedBundle $remoteBundleTarget | Out-Null
  Invoke-RemoteCommand "rm -rf '$remoteControlApiDir'; mkdir -p '$remoteControlApiDir'; tar -xzf 'control-api-remote-relay-linux.tar.gz' -C '$remoteControlApiDir'"
} else {
  Write-Host "Copying control-api source bundle"
  & scp -P $Port -r $controlApiDir $remoteServicesDirTarget | Out-Null
}

Write-Host "Copying systemd unit and host probe"
& scp -P $Port $serviceFile $remoteServiceFileTarget | Out-Null
& scp -P $Port $probeScript $remoteProbeTarget | Out-Null

Write-Host "Installing service unit"
Invoke-RemoteCommand "sudo mv '$ServiceName.service' '/etc/systemd/system/$ServiceName.service'; sudo chmod 644 '/etc/systemd/system/$ServiceName.service'"

if ($RemoteRelayApiToken) {
  $temporaryEnvFile = Join-Path ([System.IO.Path]::GetTempPath()) "$ServiceName.env"
  New-RemoteRelayEnvFile -Path $temporaryEnvFile

  try {
    Write-Host "Copying env file"
    & scp -P $Port $temporaryEnvFile $remoteEnvTarget | Out-Null
    Invoke-RemoteCommand "sudo mv 'remote-relay.env' '$RemoteEnvPath'; sudo chmod 600 '$RemoteEnvPath'; sudo chown root:root '$RemoteEnvPath'"
  } finally {
    Remove-Item $temporaryEnvFile -Force -ErrorAction SilentlyContinue
  }
} else {
  Write-Host "Remote relay files copied. Before enabling the service, create the env file manually:"
  Write-Host "  $RemoteEnvPath"
}

Invoke-RemoteCommand "chmod +x 'probe-remote-host.sh'"

if ($EnableService) {
  Write-Host "Reloading systemd and enabling the service"
  Invoke-RemoteCommand "sudo systemctl daemon-reload; sudo systemctl enable --now '$ServiceName'; systemctl is-enabled '$ServiceName'; systemctl is-active '$ServiceName'; systemctl --no-pager --full status '$ServiceName' | head -n 40"
} else {
  Write-Host "Service files copied. To enable manually on the host run:"
  Write-Host "  sudo systemctl daemon-reload"
  Write-Host "  sudo systemctl enable --now $ServiceName"
  Write-Host "  sudo systemctl status $ServiceName"
  Write-Host "  sudo journalctl -u $ServiceName -n 100 --no-pager"
}

Write-Host
Write-Host "Remote control-api directory:"
Write-Host "  $remoteControlApiDir"
Write-Host "Remote data directory:"
Write-Host "  $RemoteDataDir"
Write-Host "Topology hint:"
Write-Host "  $TopologyHint"
