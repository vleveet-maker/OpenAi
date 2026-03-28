param(
  [switch]$SkipInstall,
  [string]$ProxyServer = "",
  [ValidateSet("VisibleAuth", "HiddenRuntime")]
  [string]$RuntimeMode = "HiddenRuntime",
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
  -RuntimeMode $RuntimeMode `
  -BrowserWindowMode $BrowserWindowMode `
  -RepoRoot $repoRoot `
  -DetachAgent:$DetachAgent `
  -SkipInstall:$SkipInstall
