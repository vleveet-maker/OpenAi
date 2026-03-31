param(
  [Parameter(Mandatory = $true)]
  [string]$WorkerId,
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$HostControllerToken = "local-host-controller-token",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
$matrixScriptPath = Join-Path $repoRoot "infra\\host-worker\\test-windows-browser-block-matrix.ps1"

& $matrixScriptPath `
  -WorkerIds @($WorkerId) `
  -HostControllerBaseUrl $HostControllerBaseUrl `
  -HostControllerToken $HostControllerToken `
  -OutputJsonPath $OutputJsonPath `
  -OutputMarkdownPath $OutputMarkdownPath
