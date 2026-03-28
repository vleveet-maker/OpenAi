param(
  [string]$WorkerId = "dad",
  [int]$AgentPort = 4021,
  [int]$CdpPort = 9222,
  [string]$ProfilePath = "",
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
$resolvedProfilePath =
  if ($ProfilePath -and $ProfilePath.Trim().Length -gt 0) {
    $ProfilePath
  } else {
    Join-Path $resolvedRepoRoot "infra\\data\\host-profiles\\$WorkerId"
  }

$portOwners = @()

foreach ($port in @($AgentPort, $CdpPort)) {
  $ownedByPort = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

  if ($ownedByPort) {
    $portOwners += $ownedByPort
  }
}

$matchingProcesses = Get-CimInstance Win32_Process |
  Where-Object {
    ($_.Name -eq "msedge.exe" -or $_.Name -eq "chrome.exe" -or $_.Name -eq "node.exe") -and (
      $_.CommandLine -match "remote-debugging-port=$CdpPort" -or
      $_.CommandLine -match [regex]::Escape($resolvedProfilePath) -or
      $_.CommandLine -match "WORKER_ID=$WorkerId"
    )
  } |
  Select-Object -ExpandProperty ProcessId

$processIds = @($portOwners + $matchingProcesses) | Where-Object { $_ } | Sort-Object -Unique

foreach ($processId in $processIds) {
  if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
    Stop-Process -Id $processId -Force
  }
}
