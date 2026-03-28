param(
  [string]$RepoRoot = "",
  [switch]$ForceRestart
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
$mixedPort = 7897
$binaryPath = Join-Path $resolvedRepoRoot "infra\\tools\\sing-box\\current\\sing-box.exe"
$configPath = Join-Path $resolvedRepoRoot "infra\\data\\proxy\\sing-box\\config.json"

if ($ForceRestart) {
  Get-NetTCPConnection -LocalPort $mixedPort -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
      if (Get-Process -Id $_ -ErrorAction SilentlyContinue) {
        Stop-Process -Id $_ -Force
      }
    }
}

$existing = Get-NetTCPConnection -LocalPort $mixedPort -ErrorAction SilentlyContinue

if ($existing) {
  Write-Output "sing-box already listening on $mixedPort"
  return
}

& (Join-Path $PSScriptRoot "install-sing-box.ps1") -RepoRoot $resolvedRepoRoot | Out-Null
node (Join-Path $PSScriptRoot "build-sing-box-config.mjs") | Out-Null

Start-Process -FilePath $binaryPath -ArgumentList @("run", "-c", $configPath) -WindowStyle Hidden | Out-Null

for ($attempt = 0; $attempt -lt 10; $attempt += 1) {
  Start-Sleep -Milliseconds 500

  if (Get-NetTCPConnection -LocalPort $mixedPort -ErrorAction SilentlyContinue) {
    Write-Output "sing-box listening on $mixedPort"
    return
  }
}

throw "sing-box failed to start on port $mixedPort"
