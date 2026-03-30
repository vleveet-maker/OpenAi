param(
  [switch]$SkipInstall,
  [string]$ProxyServer = "",
  [ValidateSet("VisibleAuth", "HiddenRuntime", "AlternateDesktop")]
  [string]$RuntimeMode = "VisibleAuth",
  [ValidateSet("CurrentExecutable", "ChannelMsedge")]
  [string]$HiddenLaunchVariant = "CurrentExecutable",
  [ValidateSet("Durable", "DiagnosticFresh")]
  [string]$ProfileStrategy = "Durable",
  [string]$ProfilePath = "",
  [ValidateSet("Normal", "Minimized", "CompactCorner")]
  [string]$BrowserWindowMode = "CompactCorner",
  [switch]$LaunchBrowserOnly,
  [switch]$DetachAgent
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
$resolvedProfilePath =
  if ($ProfilePath -and $ProfilePath.Trim().Length -gt 0) {
    $ProfilePath
  } else {
    Join-Path $repoRoot "infra\\data\\host-profiles\\wife"
  }

& (Join-Path $PSScriptRoot "start-host-native-worker.ps1") `
  -WorkerId "wife" `
  -DisplayName "Wife" `
  -AgentPort 4022 `
  -CdpPort 9223 `
  -ProfilePath $resolvedProfilePath `
  -ProfileStrategy $ProfileStrategy `
  -ProxyServer $ProxyServer `
  -RuntimeMode $RuntimeMode `
  -HiddenLaunchVariant $HiddenLaunchVariant `
  -BrowserWindowMode $BrowserWindowMode `
  -RepoRoot $repoRoot `
  -LaunchBrowserOnly:$LaunchBrowserOnly `
  -DetachAgent:$DetachAgent `
  -SkipInstall:$SkipInstall
