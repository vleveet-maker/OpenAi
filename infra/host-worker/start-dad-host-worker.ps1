param(
  [switch]$SkipInstall,
  [string]$ProxyServer = "",
  [ValidateSet("Normal", "Minimized")]
  [string]$BrowserWindowMode = "Minimized",
  [switch]$DetachAgent
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path

& (Join-Path $PSScriptRoot "start-host-native-worker.ps1") `
  -WorkerId "dad" `
  -DisplayName "Dad" `
  -AgentPort 4021 `
  -CdpPort 9222 `
  -ProfilePath (Join-Path $repoRoot "infra\\data\\host-profiles\\dad") `
  -ProxyServer $ProxyServer `
  -BrowserWindowMode $BrowserWindowMode `
  -RepoRoot $repoRoot `
  -DetachAgent:$DetachAgent `
  -SkipInstall:$SkipInstall
