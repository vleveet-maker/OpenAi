param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteHost,
  [int]$RemotePort = 2222,
  [Parameter(Mandatory = $true)]
  [string]$RemoteUser,
  [string]$SshKeyPath = "",
  [string]$RunAsUser = $env:USERNAME,
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
$scriptCompatibilityVersion = "phase25-live-fix-backport-v1"

function Resolve-RepoRoot {
  param([string]$Candidate)

  if ($Candidate -and (Test-Path $Candidate)) {
    return (Resolve-Path $Candidate).Path
  }

  return (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot
$powershellExe = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
$startBlockScript = Join-Path $PSScriptRoot "start-browser-block.ps1"
$startTunnelScript = Join-Path $PSScriptRoot "start-reverse-tunnels.ps1"

$hostControllerAction = New-ScheduledTaskAction `
  -Execute $powershellExe `
  -Argument "-ExecutionPolicy Bypass -File `"$startBlockScript`" -RepoRoot `"$resolvedRepoRoot`""

$tunnelArguments = "-ExecutionPolicy Bypass -File `"$startTunnelScript`" -RemoteHost `"$RemoteHost`" -RemotePort $RemotePort -RemoteUser `"$RemoteUser`" -IncludeHostController -Foreground"

if ($SshKeyPath -and $SshKeyPath.Trim().Length -gt 0) {
  $tunnelArguments += " -SshKeyPath `"$SshKeyPath`""
}

$tunnelAction = New-ScheduledTaskAction `
  -Execute $powershellExe `
  -Argument $tunnelArguments

$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $RunAsUser -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName "OWMCGP Browser Block - Host Controller" `
  -Action $hostControllerAction `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Force | Out-Null

Register-ScheduledTask `
  -TaskName "OWMCGP Browser Block - Reverse Tunnels" `
  -Action $tunnelAction `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Force | Out-Null

Write-Host "[windows-block] scheduled tasks registered for $RunAsUser ($scriptCompatibilityVersion)"
