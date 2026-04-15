param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteHost,
  [int]$RemotePort = 2222,
  [Parameter(Mandatory = $true)]
  [string]$RemoteUser,
  [string]$SshKeyPath = "",
  [string]$SshPassword = "",
  [switch]$IncludeHostController,
  [switch]$Foreground
)

$ErrorActionPreference = "Stop"
$scriptCompatibilityVersion = "phase37-reverse-tunnel-chat-smoke-v1"

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

function Resolve-PythonExecutable {
  $candidate = Get-Command "python.exe" -ErrorAction SilentlyContinue

  if ($candidate) {
    return $candidate.Source
  }

  $knownPath = "C:\\Users\\Ultra\\AppData\\Local\\Programs\\Python\\Python313\\python.exe"

  if (Test-Path $knownPath) {
    return $knownPath
  }

  throw "python.exe was not found on this host."
}

function Resolve-SshPassword {
  if ($SshPassword -and $SshPassword.Trim().Length -gt 0) {
    return $SshPassword.Trim()
  }

  if ($env:OWMCGP_REMOTE_SSH_PASSWORD -and $env:OWMCGP_REMOTE_SSH_PASSWORD.Trim().Length -gt 0) {
    return $env:OWMCGP_REMOTE_SSH_PASSWORD.Trim()
  }

  return ""
}

$resolvedSshPassword = Resolve-SshPassword
$usePasswordRunner = -not [string]::IsNullOrWhiteSpace($resolvedSshPassword) -and [string]::IsNullOrWhiteSpace($SshKeyPath)

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

if ($usePasswordRunner) {
  $pythonExe = Resolve-PythonExecutable
  $pythonScript = Join-Path $PSScriptRoot "start-reverse-tunnels.py"
  $arguments = New-Object System.Collections.Generic.List[string]
  $arguments.Add($pythonScript)
  $arguments.Add("--remote-host")
  $arguments.Add($RemoteHost)
  $arguments.Add("--remote-port")
  $arguments.Add("$RemotePort")
  $arguments.Add("--remote-user")
  $arguments.Add($RemoteUser)

  if ($IncludeHostController) {
    $arguments.Add("--include-host-controller")
  }

  $runnerPath = $pythonExe
} else {
  $sshExe = Resolve-SshExecutable
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
  $runnerPath = $sshExe
}

if ($Foreground) {
  Write-Host "[windows-block] reverse tunnels running in foreground ($scriptCompatibilityVersion)"
  $previousPassword = $env:OWMCGP_REMOTE_SSH_PASSWORD
  if ($usePasswordRunner) {
    $env:OWMCGP_REMOTE_SSH_PASSWORD = $resolvedSshPassword
  }

  try {
    & $runnerPath @arguments
  } finally {
    if ($null -eq $previousPassword) {
      Remove-Item Env:OWMCGP_REMOTE_SSH_PASSWORD -ErrorAction SilentlyContinue
    } else {
      $env:OWMCGP_REMOTE_SSH_PASSWORD = $previousPassword
    }
  }

  if ($LASTEXITCODE -ne 0) {
    throw "reverse tunnel foreground process exited with code $LASTEXITCODE"
  }

  return
}

$previousPassword = $env:OWMCGP_REMOTE_SSH_PASSWORD
if ($usePasswordRunner) {
  $env:OWMCGP_REMOTE_SSH_PASSWORD = $resolvedSshPassword
}

try {
  Start-Process `
    -FilePath $runnerPath `
    -ArgumentList $arguments `
    -WindowStyle Hidden | Out-Null
} finally {
  if ($null -eq $previousPassword) {
    Remove-Item Env:OWMCGP_REMOTE_SSH_PASSWORD -ErrorAction SilentlyContinue
  } else {
    $env:OWMCGP_REMOTE_SSH_PASSWORD = $previousPassword
  }
}

Write-Host "[windows-block] reverse tunnel start requested ($scriptCompatibilityVersion)"
