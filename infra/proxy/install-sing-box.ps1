param(
  [string]$RepoRoot = "",
  [string]$Version = ""
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
$installRoot = Join-Path $resolvedRepoRoot "infra\\tools\\sing-box"
$currentRoot = Join-Path $installRoot "current"
$null = New-Item -ItemType Directory -Force -Path $installRoot

$headers = @{
  "User-Agent" = "Codex"
}

if (-not $Version -or $Version.Trim().Length -eq 0) {
  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/SagerNet/sing-box/releases/latest" -Headers $headers
  $resolvedVersion = $release.tag_name.TrimStart("v")
} else {
  $resolvedVersion = $Version
}

$zipName = "sing-box-$resolvedVersion-windows-amd64.zip"
$downloadUrl = "https://github.com/SagerNet/sing-box/releases/download/v$resolvedVersion/$zipName"
$versionRoot = Join-Path $installRoot $resolvedVersion
$zipPath = Join-Path $installRoot $zipName
$binaryPath = Join-Path $versionRoot "sing-box.exe"
$extractRoot = Join-Path $installRoot "_extract-$resolvedVersion"

if (-not (Test-Path $binaryPath)) {
  Invoke-WebRequest -Uri $downloadUrl -Headers $headers -OutFile $zipPath

  if (Test-Path $versionRoot) {
    Remove-Item -LiteralPath $versionRoot -Recurse -Force
  }

  if (Test-Path $extractRoot) {
    Remove-Item -LiteralPath $extractRoot -Recurse -Force
  }

  $null = New-Item -ItemType Directory -Force -Path $extractRoot
  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractRoot -Force

  $extractedBinary = Get-ChildItem -Path $extractRoot -Recurse -Filter "sing-box.exe" |
    Select-Object -First 1

  if (-not $extractedBinary) {
    throw "sing-box.exe was not found in the downloaded archive."
  }

  $null = New-Item -ItemType Directory -Force -Path $versionRoot
  Copy-Item -LiteralPath $extractedBinary.Directory.FullName -Destination $versionRoot -Recurse -Force
  $copiedBinary = Get-ChildItem -Path $versionRoot -Recurse -Filter "sing-box.exe" |
    Select-Object -First 1

  if (-not $copiedBinary) {
    throw "sing-box.exe was not copied into the version directory."
  }

  Move-Item -LiteralPath $copiedBinary.FullName -Destination $binaryPath -Force
  Get-ChildItem -Path $versionRoot -Recurse |
    Where-Object { $_.PSIsContainer -and $_.FullName -ne $versionRoot } |
    Sort-Object FullName -Descending |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $zipPath -Force
  Remove-Item -LiteralPath $extractRoot -Recurse -Force
}

if (Test-Path $currentRoot) {
  Remove-Item -LiteralPath $currentRoot -Recurse -Force
}

Copy-Item -LiteralPath $versionRoot -Destination $currentRoot -Recurse -Force
Write-Output (Join-Path $currentRoot "sing-box.exe")
