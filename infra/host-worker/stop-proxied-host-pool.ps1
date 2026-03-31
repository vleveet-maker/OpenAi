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
& (Join-Path $PSScriptRoot "stop-host-native-worker.ps1") -WorkerId "shared-2" -AgentPort 4024 -CdpPort 9225 -ProfilePath (Join-Path $resolvedRepoRoot "infra\\data\\host-profiles\\shared-2")
& (Join-Path $PSScriptRoot "stop-host-native-worker.ps1") -WorkerId "shared-3" -AgentPort 4025 -CdpPort 9226 -ProfilePath (Join-Path $resolvedRepoRoot "infra\\data\\host-profiles\\shared-3")
& (Join-Path $PSScriptRoot "stop-host-native-worker.ps1") -WorkerId "shared-4" -AgentPort 4026 -CdpPort 9227 -ProfilePath (Join-Path $resolvedRepoRoot "infra\\data\\host-profiles\\shared-4")
& (Join-Path $PSScriptRoot "stop-host-native-worker.ps1") -WorkerId "shared-5" -AgentPort 4027 -CdpPort 9228 -ProfilePath (Join-Path $resolvedRepoRoot "infra\\data\\host-profiles\\shared-5")

Get-NetTCPConnection -LocalPort 7897 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object {
    if ($_ -gt 0 -and (Get-Process -Id $_ -ErrorAction SilentlyContinue)) {
      Stop-Process -Id $_ -Force
    }
  }
