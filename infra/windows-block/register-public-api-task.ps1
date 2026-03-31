param(
  [string]$RunAsUser = $env:USERNAME,
  [string]$RepoRoot = "",
  [string]$ListenHost = "127.0.0.1",
  [int]$ListenPort = 4010,
  [string[]]$AllowedWorkerIds = @()
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-RepoRoot {
  param([string]$Candidate)

  if ($Candidate -and (Test-Path $Candidate)) {
    return (Resolve-Path $Candidate).Path
  }

  return (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot
$powershellExe = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
$startApiScript = Join-Path $PSScriptRoot "start-public-api.ps1"

$apiAction = New-ScheduledTaskAction `
  -Execute $powershellExe `
  -Argument "-ExecutionPolicy Bypass -File `"$startApiScript`" -RepoRoot `"$resolvedRepoRoot`" -ListenHost `"$ListenHost`" -ListenPort $ListenPort"

if ($AllowedWorkerIds -and $AllowedWorkerIds.Count -gt 0) {
  $apiAction = New-ScheduledTaskAction `
    -Execute $powershellExe `
    -Argument "-ExecutionPolicy Bypass -File `"$startApiScript`" -RepoRoot `"$resolvedRepoRoot`" -ListenHost `"$ListenHost`" -ListenPort $ListenPort -AllowedWorkerIds `"$($AllowedWorkerIds -join ',')`""
}

$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $RunAsUser -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask `
  -TaskName "OWMCGP Browser Block - Public API" `
  -Action $apiAction `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Force | Out-Null

Write-Host "[windows-block] public API scheduled task registered for $RunAsUser"
