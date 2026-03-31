param(
  [int]$ListenPort = 4010
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$connections = Get-NetTCPConnection -LocalPort $ListenPort -ErrorAction SilentlyContinue

if (-not $connections) {
  Write-Host "[windows-block] public API is not listening on $ListenPort"
  return
}

$processIds =
  $connections |
  Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $processIds) {
  try {
    Stop-Process -Id $processId -Force -ErrorAction Stop
    Write-Host "[windows-block] stopped public API process $processId"
  } catch {
    Write-Warning "[windows-block] failed to stop process ${processId}: $_"
  }
}
