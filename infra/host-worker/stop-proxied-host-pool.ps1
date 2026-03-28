param(
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  param([string]$Candidate)

  if ($Candidate -and (Test-Path $Candidate)) {
    return (Resolve-Path $Candidate).Path
  }

  return (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot

& (Join-Path $PSScriptRoot "stop-host-native-worker.ps1") -WorkerId "dad" -AgentPort 4021 -CdpPort 9222 -ProfilePath (Join-Path $resolvedRepoRoot "infra\\data\\host-profiles\\dad")
& (Join-Path $PSScriptRoot "stop-host-native-worker.ps1") -WorkerId "wife" -AgentPort 4022 -CdpPort 9223 -ProfilePath (Join-Path $resolvedRepoRoot "infra\\data\\host-profiles\\wife")
& (Join-Path $PSScriptRoot "stop-host-native-worker.ps1") -WorkerId "shared-1" -AgentPort 4023 -CdpPort 9224 -ProfilePath (Join-Path $resolvedRepoRoot "infra\\data\\host-profiles\\shared-1")

Get-NetTCPConnection -LocalPort 7897 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object {
    if ($_ -gt 0 -and (Get-Process -Id $_ -ErrorAction SilentlyContinue)) {
      Stop-Process -Id $_ -Force
    }
  }
