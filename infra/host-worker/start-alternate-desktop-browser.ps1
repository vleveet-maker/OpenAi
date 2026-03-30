param(
  [Parameter(Mandatory = $true)]
  [string]$WorkerId,
  [Parameter(Mandatory = $true)]
  [int]$CdpPort,
  [Parameter(Mandatory = $true)]
  [string]$BrowserExecutablePath,
  [Parameter(Mandatory = $true)]
  [string]$ProfilePath,
  [string]$StartUrl = "https://chatgpt.com/",
  [string]$ProxyServer = "",
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

function Test-CdpEndpoint {
  param([int]$Port)

  try {
    Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/json/version" -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Update-JsonTextSetting {
  param(
    [string]$FilePath
  )

  if (-not (Test-Path -LiteralPath $FilePath)) {
    return
  }

  $content = Get-Content -LiteralPath $FilePath -Raw -ErrorAction SilentlyContinue

  if (-not $content) {
    return
  }

  $updated = $content `
    -replace '"exit_type"\s*:\s*"Crashed"', '"exit_type":"Normal"' `
    -replace '"exited_cleanly"\s*:\s*false', '"exited_cleanly":true' `
    -replace '"session_restore_prompt"\s*:\s*\{\s*"ignored"\s*:\s*false\s*\}', '"session_restore_prompt":{"ignored":true}'

  if ($updated -ne $content) {
    Set-Content -LiteralPath $FilePath -Value $updated -Encoding utf8
  }
}

function Clear-SessionRestoreArtifacts {
  param(
    [string]$CurrentProfilePath
  )

  $defaultProfilePath = Join-Path $CurrentProfilePath "Default"

  foreach ($path in @(
    (Join-Path $CurrentProfilePath "Local State"),
    (Join-Path $defaultProfilePath "Preferences")
  )) {
    Update-JsonTextSetting -FilePath $path
  }

  foreach ($filePath in @(
    (Join-Path $defaultProfilePath "Last Session"),
    (Join-Path $defaultProfilePath "Last Tabs"),
    (Join-Path $defaultProfilePath "Current Session"),
    (Join-Path $defaultProfilePath "Current Tabs")
  )) {
    if (Test-Path -LiteralPath $filePath) {
      Remove-Item -LiteralPath $filePath -Force -ErrorAction SilentlyContinue
    }
  }

  $sessionsDirectory = Join-Path $defaultProfilePath "Sessions"

  if (Test-Path -LiteralPath $sessionsDirectory) {
    Get-ChildItem -Force -LiteralPath $sessionsDirectory -ErrorAction SilentlyContinue |
      Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Get-WorkerStatePath {
  param(
    [string]$RepoRootPath,
    [string]$CurrentWorkerId
  )

  return Join-Path $RepoRootPath "infra\\data\\host-worker-state\\$CurrentWorkerId.json"
}

function ConvertTo-CommandLine {
  param(
    [string]$ExecutablePath,
    [string[]]$ArgumentList
  )

  $quotedExecutable = '"' + $ExecutablePath.Replace('"', '\"') + '"'
  $quotedArguments = $ArgumentList | ForEach-Object {
    if ($_ -match '\s' -or $_ -match '"') {
      '"' + $_.Replace('"', '\"') + '"'
    } else {
      $_
    }
  }

  return ((@($quotedExecutable) + $quotedArguments) -join " ")
}

function Ensure-AlternateDesktopInterop {
  if (([System.Management.Automation.PSTypeName]"Owmcgp.HostWorker.AlternateDesktopInterop").Type) {
    return
  }

  Add-Type -TypeDefinition @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

namespace Owmcgp.HostWorker
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct STARTUPINFOW
    {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION
    {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }

    public sealed class LaunchResult
    {
        public string DesktopName { get; set; }
        public string FullDesktopName { get; set; }
        public int ProcessId { get; set; }
    }

    public static class AlternateDesktopInterop
    {
        private const uint DESKTOP_ALL_ACCESS = 0x000F01FF;

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern IntPtr OpenDesktop(
            string lpszDesktop,
            uint dwFlags,
            bool fInherit,
            uint dwDesiredAccess
        );

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern IntPtr CreateDesktopW(
            string lpszDesktop,
            IntPtr lpszDevice,
            IntPtr pDevmode,
            int dwFlags,
            uint dwDesiredAccess,
            IntPtr lpsa
        );

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool CloseDesktop(IntPtr hDesktop);

        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool CreateProcessW(
            string lpApplicationName,
            string lpCommandLine,
            IntPtr lpProcessAttributes,
            IntPtr lpThreadAttributes,
            bool bInheritHandles,
            uint dwCreationFlags,
            IntPtr lpEnvironment,
            string lpCurrentDirectory,
            ref STARTUPINFOW lpStartupInfo,
            out PROCESS_INFORMATION lpProcessInformation
        );

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr handle);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint WaitForInputIdle(IntPtr hProcess, uint dwMilliseconds);

        public static LaunchResult Launch(
            string desktopName,
            string applicationPath,
            string commandLine,
            string workingDirectory,
            int waitForInputIdleMs
        )
        {
            IntPtr desktopHandle = OpenDesktop(desktopName, 0, false, DESKTOP_ALL_ACCESS);

            if (desktopHandle == IntPtr.Zero)
            {
                desktopHandle = CreateDesktopW(desktopName, IntPtr.Zero, IntPtr.Zero, 0, DESKTOP_ALL_ACCESS, IntPtr.Zero);
            }

            if (desktopHandle == IntPtr.Zero)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "Unable to open or create alternate desktop.");
            }

            try
            {
                var startupInfo = new STARTUPINFOW();
                startupInfo.cb = Marshal.SizeOf<STARTUPINFOW>();
                startupInfo.lpDesktop = "WinSta0\\" + desktopName;

                PROCESS_INFORMATION processInfo;
                var success = CreateProcessW(
                    applicationPath,
                    commandLine,
                    IntPtr.Zero,
                    IntPtr.Zero,
                    false,
                    0,
                    IntPtr.Zero,
                    workingDirectory,
                    ref startupInfo,
                    out processInfo
                );

                if (!success)
                {
                    throw new Win32Exception(Marshal.GetLastWin32Error(), "Unable to launch browser on alternate desktop.");
                }

                try
                {
                    if (waitForInputIdleMs > 0)
                    {
                        WaitForInputIdle(processInfo.hProcess, (uint)waitForInputIdleMs);
                    }
                }
                finally
                {
                    if (processInfo.hThread != IntPtr.Zero)
                    {
                        CloseHandle(processInfo.hThread);
                    }

                    if (processInfo.hProcess != IntPtr.Zero)
                    {
                        CloseHandle(processInfo.hProcess);
                    }
                }

                return new LaunchResult
                {
                    DesktopName = desktopName,
                    FullDesktopName = "WinSta0\\" + desktopName,
                    ProcessId = processInfo.dwProcessId
                };
            }
            finally
            {
                CloseDesktop(desktopHandle);
            }
        }
    }
}
"@
}

$resolvedRepoRoot = Resolve-RepoRoot -Candidate $RepoRoot
$statePath = Get-WorkerStatePath -RepoRootPath $resolvedRepoRoot -CurrentWorkerId $WorkerId
$stateDirectory = Split-Path -Parent $statePath
$null = New-Item -ItemType Directory -Force -Path $stateDirectory

$desktopName = "OWMCGPT-$WorkerId"
$workingDirectory = Split-Path -Parent $BrowserExecutablePath
Clear-SessionRestoreArtifacts -CurrentProfilePath $ProfilePath
$browserArguments = @(
  "--hide-crash-restore-bubble",
  "--disable-session-crashed-bubble",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-debugging-port=$CdpPort",
  "--user-data-dir=$ProfilePath",
  "--new-window",
  $StartUrl
)

if ($ProxyServer -and $ProxyServer.Trim().Length -gt 0) {
  $browserArguments = @(
    "--proxy-server=$ProxyServer"
  ) + $browserArguments
}

$commandLine = ConvertTo-CommandLine -ExecutablePath $BrowserExecutablePath -ArgumentList $browserArguments

Ensure-AlternateDesktopInterop

$launchResult = [Owmcgp.HostWorker.AlternateDesktopInterop]::Launch(
  $desktopName,
  $BrowserExecutablePath,
  $commandLine,
  $workingDirectory,
  10000
)

$deadline = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $deadline) {
  if (Test-CdpEndpoint -Port $CdpPort) {
    break
  }

  Start-Sleep -Milliseconds 500
}

if (-not (Test-CdpEndpoint -Port $CdpPort)) {
  throw "alternate_desktop_cdp_not_ready:${WorkerId}:$CdpPort"
}

$metadata = [ordered]@{
  workerId = $WorkerId
  runtimeClass = "host_alternate_desktop"
  runtimeMode = "alternate_desktop"
  desktopName = $launchResult.DesktopName
  fullDesktopName = $launchResult.FullDesktopName
  browserPid = $launchResult.ProcessId
  cdpPort = $CdpPort
  profilePath = $ProfilePath
  launchedAt = (Get-Date).ToString("o")
}

$metadata | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $statePath -Encoding utf8

$metadata
