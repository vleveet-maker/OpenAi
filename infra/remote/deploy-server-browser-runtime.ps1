[CmdletBinding()]
param(
  [string]$HostName = "77.66.186.75",
  [int]$Port = 2222,
  [string]$User = "mi50",
  [string]$RemoteAppDir = "/opt/owmcgp-remote-relay",
  [string]$RemoteRuntimeDir = "/srv/owmcgp-browser-runtime",
  [string]$RemoteConfigDir = "/etc/owmcgp",
  [string]$ShareLinksPath = "",
  [string]$TopologyHint = "server_local_compact_visible_via_vnc",
  [string]$VncDisplay = ":2",
  [string]$VncDesktopName = "tigervnc:2",
  [string]$VncUser = "Donat",
  [string]$PilotWorkerId = "wife",
  [switch]$SkipBuild,
  [switch]$SkipProxyInstall,
  [switch]$SkipBrowserInstall,
  [switch]$EnableAllWorkers
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
$workerAgentDir = Join-Path $repoRoot "workers\\agent"
$runtimeScriptDir = Join-Path $repoRoot "infra\\remote\\linux"
$systemdDir = Join-Path $repoRoot "infra\\remote\\systemd"
$inventoryPath = Join-Path $repoRoot "infra\\remote\\server-worker-inventory.json"
$buildConfigScript = Join-Path $repoRoot "infra\\proxy\\build-sing-box-config.mjs"
$bundleDir = Join-Path $repoRoot "infra\\remote\\cache\\worker-agent-linux-bundle"
$bundleTar = Join-Path $repoRoot "infra\\remote\\cache\\worker-agent-linux.tar.gz"
$remoteTarget = "{0}@{1}" -f $User, $HostName
$remoteWorkerDir = "$RemoteAppDir/services/worker-agent"
$remoteRuntimeScriptDir = "$RemoteAppDir/runtime"

function Invoke-RemoteCommand {
  param([string]$Command)

  & ssh -p $Port $remoteTarget $Command
}

function New-WorkerBundle {
  if (Test-Path $bundleDir) {
    Remove-Item -LiteralPath $bundleDir -Recurse -Force
  }

  if (Test-Path $bundleTar) {
    Remove-Item -LiteralPath $bundleTar -Force
  }

  $null = New-Item -ItemType Directory -Force -Path $bundleDir
  Copy-Item -LiteralPath (Join-Path $workerAgentDir "dist") -Destination (Join-Path $bundleDir "dist") -Recurse -Force
  Copy-Item -LiteralPath (Join-Path $workerAgentDir "package.json") -Destination (Join-Path $bundleDir "package.json") -Force
  Copy-Item -LiteralPath (Join-Path $workerAgentDir "package-lock.json") -Destination (Join-Path $bundleDir "package-lock.json") -Force
  & tar -czf $bundleTar -C $bundleDir .
}

function New-WorkerDefinitionsJson {
  $inventory = Get-Content $inventoryPath | ConvertFrom-Json
  $definitions = foreach ($worker in $inventory) {
    [ordered]@{
      workerId = $worker.workerId
      displayName = $worker.displayName
      containerName = "server-worker-$($worker.workerId)"
      profilePath = $worker.profilePath
      agentBaseUrl = "http://127.0.0.1:$($worker.agentPort)"
      runtimeType = "host"
      defaultStatus = "starting"
    }
  }

  return ($definitions | ConvertTo-Json -Compress)
}

function New-CommonEnvFile {
  param(
    [string]$Path,
    [string]$ProxyServer
  )

  $lines = @(
    "DISPLAY=$VncDisplay"
    "XAUTHORITY=/home/$VncUser/.Xauthority"
    "HOME=/home/$VncUser"
    "PLAYWRIGHT_BROWSERS_PATH=$RemoteRuntimeDir/playwright-browsers"
    "WORKER_AGENT_DIR=$remoteWorkerDir"
    "WORKER_NODE_BIN=/usr/local/bin/node"
    "WORKER_AGENT_HOST=127.0.0.1"
    "WORKER_RUNTIME_MODE=visible_auth"
    "WORKER_RUNTIME_CLASS=host_visible_compact"
    "WORKER_RUNTIME_DESKTOP_NAME=$VncDesktopName"
    "WORKER_HEADLESS=false"
    "WORKER_START_URL=https://chatgpt.com/"
    'WORKER_PREFERRED_REASONING_MODEL_LABELS=["GPT-5.4 Thinking","GPT-5.4"]'
  )

  if ($ProxyServer) {
    $lines += "WORKER_PROXY_SERVER=$ProxyServer"
  }

  Set-Content -Path $Path -Value ($lines -join [Environment]::NewLine) -Encoding utf8
}

function New-WorkerEnvFile {
  param(
    [string]$Path,
    [object]$Worker
  )

  $lines = @(
    "WORKER_ID=$($Worker.workerId)"
    "WORKER_DISPLAY_NAME=$($Worker.displayName)"
    "WORKER_CONTAINER_NAME=server-worker-$($Worker.workerId)"
    "WORKER_AGENT_PORT=$($Worker.agentPort)"
    "WORKER_PROFILE_PATH=$($Worker.profilePath)"
  )

  Set-Content -Path $Path -Value ($lines -join [Environment]::NewLine) -Encoding utf8
}

if (-not $SkipBuild) {
  Push-Location $workerAgentDir
  try {
    & cmd /c npm.cmd run build
  } finally {
    Pop-Location
  }
}

New-WorkerBundle
$workerDefinitionsJson = New-WorkerDefinitionsJson
$inventory = Get-Content $inventoryPath | ConvertFrom-Json

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("owmcgp-server-runtime-" + [guid]::NewGuid().ToString("N"))
$tempConfigDir = Join-Path $tempRoot "config"
$tempWorkersDir = Join-Path $tempConfigDir "workers"
$null = New-Item -ItemType Directory -Force -Path $tempWorkersDir

$proxyConfigPath = Join-Path $tempConfigDir "browser-proxy-config.json"
$resolvedProxyConfigPath = $null
if (-not $SkipProxyInstall -and -not [string]::IsNullOrWhiteSpace($ShareLinksPath)) {
  $currentConfigPath = $env:HOST_PROXY_CONFIG_PATH
  $currentShareLinksPath = $env:HOST_PROXY_SHARE_LINKS_PATH

  try {
    $env:HOST_PROXY_SHARE_LINKS_PATH = (Resolve-Path $ShareLinksPath).Path
    $env:HOST_PROXY_CONFIG_PATH = $proxyConfigPath
    & node $buildConfigScript | Out-Null
    $resolvedProxyConfigPath = $proxyConfigPath
  } finally {
    $env:HOST_PROXY_CONFIG_PATH = $currentConfigPath
    $env:HOST_PROXY_SHARE_LINKS_PATH = $currentShareLinksPath
  }
}

$proxyServer = if ($resolvedProxyConfigPath) { "http://127.0.0.1:7897" } else { "" }
$commonEnvPath = Join-Path $tempConfigDir "browser-workers.common.env"
New-CommonEnvFile -Path $commonEnvPath -ProxyServer $proxyServer

foreach ($worker in $inventory) {
  New-WorkerEnvFile -Path (Join-Path $tempWorkersDir "$($worker.workerId).env") -Worker $worker
}

try {
  Invoke-RemoteCommand "mkdir -p '$RemoteAppDir/services' '$remoteRuntimeScriptDir' '$RemoteRuntimeDir/profiles' '$RemoteRuntimeDir/playwright-browsers' '$RemoteConfigDir/workers' '/etc/systemd/system'"

  & scp -P $Port $bundleTar "${remoteTarget}`:worker-agent-linux.tar.gz" | Out-Null
  & scp -P $Port (Join-Path $runtimeScriptDir "start-browser-worker.sh") "${remoteTarget}`:start-browser-worker.sh" | Out-Null
  & scp -P $Port (Join-Path $runtimeScriptDir "install-sing-box-linux.sh") "${remoteTarget}`:install-sing-box-linux.sh" | Out-Null
  & scp -P $Port (Join-Path $systemdDir "owmcgp-browser-worker@.service") "${remoteTarget}`:owmcgp-browser-worker@.service" | Out-Null

  if ($resolvedProxyConfigPath) {
    & scp -P $Port (Join-Path $systemdDir "owmcgp-browser-proxy.service") "${remoteTarget}`:owmcgp-browser-proxy.service" | Out-Null
    & scp -P $Port $resolvedProxyConfigPath "${remoteTarget}`:browser-proxy-config.json" | Out-Null
  }

  & scp -P $Port $commonEnvPath "${remoteTarget}`:browser-workers.common.env" | Out-Null
  & scp -P $Port -r $tempWorkersDir "${remoteTarget}`:workers-env" | Out-Null

  Invoke-RemoteCommand "rm -rf '$remoteWorkerDir'; mkdir -p '$remoteWorkerDir'; tar -xzf 'worker-agent-linux.tar.gz' -C '$remoteWorkerDir'"
  Invoke-RemoteCommand "sudo mv 'start-browser-worker.sh' '$remoteRuntimeScriptDir/start-browser-worker.sh'; sudo chmod 755 '$remoteRuntimeScriptDir/start-browser-worker.sh'"
  Invoke-RemoteCommand "sudo mv 'install-sing-box-linux.sh' '$remoteRuntimeScriptDir/install-sing-box-linux.sh'; sudo chmod 755 '$remoteRuntimeScriptDir/install-sing-box-linux.sh'"
  Invoke-RemoteCommand "sudo mv 'owmcgp-browser-worker@.service' '/etc/systemd/system/owmcgp-browser-worker@.service'; sudo chmod 644 '/etc/systemd/system/owmcgp-browser-worker@.service'"
  Invoke-RemoteCommand "sudo mv 'browser-workers.common.env' '$RemoteConfigDir/browser-workers.common.env'; sudo chmod 640 '$RemoteConfigDir/browser-workers.common.env'"
  Invoke-RemoteCommand "sudo rm -rf '$RemoteConfigDir/workers'; sudo mv 'workers-env' '$RemoteConfigDir/workers'; sudo find '$RemoteConfigDir/workers' -type f -name '*.env' -exec chmod 640 {} \\;"

  if ($resolvedProxyConfigPath) {
    Invoke-RemoteCommand "sudo mv 'owmcgp-browser-proxy.service' '/etc/systemd/system/owmcgp-browser-proxy.service'; sudo chmod 644 '/etc/systemd/system/owmcgp-browser-proxy.service'"
    Invoke-RemoteCommand "sudo mv 'browser-proxy-config.json' '$RemoteConfigDir/browser-proxy-config.json'; sudo chmod 600 '$RemoteConfigDir/browser-proxy-config.json'"
    Invoke-RemoteCommand "sudo '$remoteRuntimeScriptDir/install-sing-box-linux.sh'"
  }

  Invoke-RemoteCommand "cd '$remoteWorkerDir' && npm ci --omit=dev"

  if (-not $SkipBrowserInstall) {
    Invoke-RemoteCommand "cd '$remoteWorkerDir' && sudo npx playwright install-deps chromium"
    Invoke-RemoteCommand "sudo chown -R $($VncUser):$($VncUser) '$RemoteRuntimeDir'"
    Invoke-RemoteCommand "cd '$remoteWorkerDir' && sudo -u '$VncUser' env PLAYWRIGHT_BROWSERS_PATH='$RemoteRuntimeDir/playwright-browsers' HOME='/home/$VncUser' npx playwright install chromium"
  }

  Invoke-RemoteCommand "sudo systemctl daemon-reload"

  if ($resolvedProxyConfigPath) {
    Invoke-RemoteCommand "sudo systemctl enable --now owmcgp-browser-proxy.service"
  }

  foreach ($worker in $inventory) {
    Invoke-RemoteCommand "sudo systemctl enable 'owmcgp-browser-worker@$($worker.workerId)'"
  }

  if ($EnableAllWorkers) {
    foreach ($worker in $inventory) {
      Invoke-RemoteCommand "sudo systemctl restart 'owmcgp-browser-worker@$($worker.workerId)'"
    }
  } else {
    Invoke-RemoteCommand "sudo systemctl restart 'owmcgp-browser-worker@$PilotWorkerId'"
  }

} finally {
  if (Test-Path $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}

Write-Host "Server-local browser runtime deployed."
Write-Host "Pilot worker: $PilotWorkerId"
Write-Host "Topology hint: $TopologyHint"
