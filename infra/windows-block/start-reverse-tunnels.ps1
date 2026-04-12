param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteHost,
  [int]$RemotePort = 2222,
  [Parameter(Mandatory = $true)]
  [string]$RemoteUser,
  [string]$SshKeyPath = "",
  [switch]$IncludeHostController,
  [switch]$Foreground
)

$ErrorActionPreference = "Stop"
$scriptCompatibilityVersion = "phase26-ubuntu-sync-recovery-v1"

function Resolve-SshExecutable {
  $candidate = Get-Command "ssh.exe" -ErrorAction SilentlyContinue

  if ($candidate) {
    return $candidate.Source
  }

  $knownPath = "C:\\Windows\\System32\\OpenSSH\\ssh.exe"

  if (Test-Path $knownPath) {
    return $knownPath
  }

  throw "ssh.exe was not found on this host."
}

$sshExe = Resolve-SshExecutable

$forwards = @(
  "127.0.0.1:14021:127.0.0.1:4021",
  "127.0.0.1:14022:127.0.0.1:4022",
  "127.0.0.1:14023:127.0.0.1:4023",
  "127.0.0.1:14024:127.0.0.1:4024",
  "127.0.0.1:14025:127.0.0.1:4025",
  "127.0.0.1:14026:127.0.0.1:4026",
  "127.0.0.1:14027:127.0.0.1:4027"
)

if ($IncludeHostController) {
  $forwards += "127.0.0.1:14040:127.0.0.1:4040"
}

$arguments = New-Object System.Collections.Generic.List[string]
$arguments.Add("-NT")
$arguments.Add("-p")
$arguments.Add("$RemotePort")
$arguments.Add("-o")
$arguments.Add("ExitOnForwardFailure=yes")
$arguments.Add("-o")
$arguments.Add("ServerAliveInterval=30")
$arguments.Add("-o")
$arguments.Add("ServerAliveCountMax=3")

if ($SshKeyPath -and $SshKeyPath.Trim().Length -gt 0) {
  $arguments.Add("-i")
  $arguments.Add($SshKeyPath)
}

foreach ($forward in $forwards) {
  $arguments.Add("-R")
  $arguments.Add($forward)
}

$arguments.Add("$RemoteUser@$RemoteHost")

if ($Foreground) {
  Write-Host "[windows-block] reverse tunnels running in foreground ($scriptCompatibilityVersion)"
  & $sshExe @arguments

  if ($LASTEXITCODE -ne 0) {
    throw "reverse tunnel foreground process exited with code $LASTEXITCODE"
  }

  return
}

Start-Process `
  -FilePath $sshExe `
  -ArgumentList $arguments `
  -WindowStyle Hidden | Out-Null

Write-Host "[windows-block] reverse tunnel start requested ($scriptCompatibilityVersion)"
