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
  -WorkerId "shared-1" `
  -DisplayName "Shared 1" `
  -AgentPort 4023 `
  -CdpPort 9224 `
  -ProfilePath (Join-Path $repoRoot "infra\\data\\host-profiles\\shared-1") `
  -ProxyServer $ProxyServer `
  -RuntimeMode $RuntimeMode `
  -BrowserWindowMode $BrowserWindowMode `
  -RepoRoot $repoRoot `
  -DetachAgent:$DetachAgent `
  -SkipInstall:$SkipInstall
