param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteHost
)

$ErrorActionPreference = "Stop"

$processes = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "ssh.exe" -and
    $_.CommandLine -match [regex]::Escape($RemoteHost) -and
    $_.CommandLine -match "14021"
  }

foreach ($process in $processes) {
  try {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
  } catch {
    Write-Warning "Failed to stop tunnel process $($process.ProcessId): $_"
  }
}

Write-Host "[windows-block] reverse tunnel stop requested"
