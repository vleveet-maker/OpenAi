param(
  [switch]$SkipInstall,
  [string]$ProxyServer = "",
  [ValidateSet("Normal", "Minimized")]
  [string]$BrowserWindowMode = "Minimized",
  [switch]$DetachAgent
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path

& (Join-Path $PSScriptRoot "start-host-native-worker.ps1") `
  -WorkerId "wife" `
  -DisplayName "Wife" `
  -AgentPort 4022 `
  -CdpPort 9223 `
  -ProfilePath (Join-Path $repoRoot "infra\\data\\host-profiles\\wife") `
  -ProxyServer $ProxyServer `
  -BrowserWindowMode $BrowserWindowMode `
  -RepoRoot $repoRoot `
  -DetachAgent:$DetachAgent `
  -SkipInstall:$SkipInstall
