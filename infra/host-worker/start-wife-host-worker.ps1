param(
  [switch]$SkipInstall,
  [string]$ProxyServer = "",
  [ValidateSet("VisibleAuth", "HiddenRuntime", "AlternateDesktop")]
  [string]$RuntimeMode = "VisibleAuth",
  [ValidateSet("CurrentExecutable", "ChannelMsedge")]
  [string]$HiddenLaunchVariant = "CurrentExecutable",
  [ValidateSet("Normal", "Minimized", "CompactCorner")]
  [string]$BrowserWindowMode = "CompactCorner",
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
  -RuntimeMode $RuntimeMode `
  -HiddenLaunchVariant $HiddenLaunchVariant `
  -BrowserWindowMode $BrowserWindowMode `
  -RepoRoot $repoRoot `
  -DetachAgent:$DetachAgent `
  -SkipInstall:$SkipInstall
