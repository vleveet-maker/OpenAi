param(
  [string[]]$CandidateWorkerIds = @("dad", "wife", "shared-1", "shared-2", "shared-3", "shared-4", "shared-5"),
  [string]$IsolationArtifactPath = "",
  [string]$PublicBaseUrl = "http://77.66.186.75",
  [string]$ApiToken = "",
  [string]$ApiTokenEnvVar = "OWMCGP_REMOTE_RELAY_API_TOKEN",
  [string]$RemoteHost = "95.78.126.163",
  [int]$RemotePort = 2222,
  [string]$RemoteUser = "mi50",
  [string]$SshKeyPath = "",
  [string]$SshPassword = "",
  [int]$AgentReadyTimeoutSeconds = 45,
  [int]$TunnelReadyTimeoutSeconds = 20,
  [int]$PollIntervalMilliseconds = 1500,
  [switch]$KeepAgentsRunning,
  [switch]$KeepReverseTunnelsRunning,
  [string]$LatestJsonPath = "",
  [string]$OutputJsonPath = "",
  [string]$OutputMarkdownPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Net.Http

$scriptCompatibilityVersion = "phase34-isolated-external-chat-proof-v1"

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Ensure-ParentDirectory {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return
  }

  $parent = Split-Path -Parent $Path

  if (-not [string]::IsNullOrWhiteSpace($parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
}

function ConvertFrom-JsonSafe {
  param([string]$Raw)

  if ([string]::IsNullOrWhiteSpace($Raw)) {
    return $null
  }

  try {
    return $Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Get-ObjectPropertyValue {
  param(
    [object]$InputObject,
    [string]$PropertyName,
    [object]$DefaultValue = $null
  )

  if ($null -eq $InputObject -or [string]::IsNullOrWhiteSpace($PropertyName)) {
    return $DefaultValue
  }

  $property = $InputObject.PSObject.Properties[$PropertyName]

  if ($null -eq $property -or $null -eq $property.Value) {
    return $DefaultValue
  }

  return $property.Value
}

function Normalize-WorkerIdList {
  param([string[]]$WorkerIds)

  $normalized = New-Object System.Collections.Generic.List[string]
  $seen = @{}

  foreach ($workerId in @($WorkerIds)) {
    if ([string]::IsNullOrWhiteSpace([string]$workerId)) {
      continue
    }

    $trimmed = ([string]$workerId).Trim()

    if ($seen.ContainsKey($trimmed)) {
      continue
    }

    $seen[$trimmed] = $true
    $normalized.Add($trimmed)
  }

  return @($normalized.ToArray())
}

function Resolve-DisplayName {
  param([string]$WorkerId)

  switch ($WorkerId) {
    "dad" { return "Dad" }
    "wife" { return "Wife" }
    "shared-1" { return "Shared 1" }
    "shared-2" { return "Shared 2" }
    "shared-3" { return "Shared 3" }
    "shared-4" { return "Shared 4" }
    "shared-5" { return "Shared 5" }
    default { return $WorkerId }
  }
}

function Resolve-AgentPort {
  param([string]$WorkerId)

  switch -Regex ($WorkerId) {
    '^dad$' { return 4021 }
    '^wife$' { return 4022 }
    '^shared-(\d+)$' { return 4022 + [int]$Matches[1] }
    default { throw "Unsupported workerId: $WorkerId" }
  }
}

function Resolve-TunnelPort {
  param([int]$AgentPort)

  return 10000 + $AgentPort
}

function Resolve-SshExecutable {
  $candidate = Get-Command "ssh.exe" -ErrorAction SilentlyContinue

  if ($candidate) {
    return $candidate.Source
  }

  $knownPath = "C:\Windows\System32\OpenSSH\ssh.exe"

  if (Test-Path $knownPath) {
    return $knownPath
  }

  throw "ssh.exe was not found on this host."
}

function Resolve-PythonExecutable {
  foreach ($commandName in @("python.exe", "python", "py.exe", "py")) {
    $candidate = Get-Command $commandName -ErrorAction SilentlyContinue

    if ($candidate) {
      return $candidate.Source
    }
  }

  throw "python was not found on this host."
}

function Resolve-SshPassword {
  if (-not [string]::IsNullOrWhiteSpace($SshPassword)) {
    return $SshPassword.Trim()
  }

  $envValue = [Environment]::GetEnvironmentVariable("OWMCGP_REMOTE_SSH_PASSWORD")

  if (-not [string]::IsNullOrWhiteSpace($envValue)) {
    return $envValue.Trim()
  }

  return ""
}

function Invoke-SshCommandSafe {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [string]$SshExecutable = ""
  )

  $resolvedSshExecutable =
    if ([string]::IsNullOrWhiteSpace($SshExecutable)) {
      Resolve-SshExecutable
    } else {
      $SshExecutable
    }
  $resolvedPassword = Resolve-SshPassword

  if (
    -not [string]::IsNullOrWhiteSpace($resolvedPassword) -and
    [string]::IsNullOrWhiteSpace($SshKeyPath)
  ) {
    try {
      $pythonExecutable = Resolve-PythonExecutable
      $env:OWMCGP_INLINE_SSH_HOST = $RemoteHost
      $env:OWMCGP_INLINE_SSH_PORT = "$RemotePort"
      $env:OWMCGP_INLINE_SSH_USER = $RemoteUser
      $env:OWMCGP_INLINE_SSH_PASSWORD = $resolvedPassword
      $env:OWMCGP_INLINE_SSH_COMMAND = $Command

      $pythonOutput = @'
import json
import os
import paramiko

host = os.environ["OWMCGP_INLINE_SSH_HOST"]
port = int(os.environ["OWMCGP_INLINE_SSH_PORT"])
user = os.environ["OWMCGP_INLINE_SSH_USER"]
password = os.environ["OWMCGP_INLINE_SSH_PASSWORD"]
command = os.environ["OWMCGP_INLINE_SSH_COMMAND"]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, port=port, username=user, password=password, timeout=20, banner_timeout=20, auth_timeout=20)
    stdin, stdout, stderr = client.exec_command(command, timeout=120)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    print(json.dumps({
        "ok": code == 0,
        "exitCode": code,
        "lines": out.splitlines() + err.splitlines(),
        "error": None if code == 0 else (err or out or f"ssh exit {code}")
    }))
finally:
    client.close()
'@ | & $pythonExecutable -
      $parsed = ConvertFrom-JsonSafe -Raw ($pythonOutput -join "`n")

      if ($null -ne $parsed) {
        return [pscustomobject]@{
          ok = [bool]$parsed.ok
          exitCode = [int]$parsed.exitCode
          lines = @($parsed.lines | ForEach-Object { "$_" })
          error = $parsed.error
        }
      }
    } catch {
      return [pscustomobject]@{
        ok = $false
        exitCode = -1
        lines = @("$($_)")
        error = "$_"
      }
    } finally {
      Remove-Item Env:OWMCGP_INLINE_SSH_HOST -ErrorAction SilentlyContinue
      Remove-Item Env:OWMCGP_INLINE_SSH_PORT -ErrorAction SilentlyContinue
      Remove-Item Env:OWMCGP_INLINE_SSH_USER -ErrorAction SilentlyContinue
      Remove-Item Env:OWMCGP_INLINE_SSH_PASSWORD -ErrorAction SilentlyContinue
      Remove-Item Env:OWMCGP_INLINE_SSH_COMMAND -ErrorAction SilentlyContinue
    }
  }

  $arguments = New-Object System.Collections.Generic.List[string]
  $arguments.Add("-p")
  $arguments.Add("$RemotePort")
  $arguments.Add("-o")
  $arguments.Add("BatchMode=yes")
  $arguments.Add("-o")
  $arguments.Add("ConnectTimeout=10")

  if ($SshKeyPath -and $SshKeyPath.Trim().Length -gt 0) {
    $arguments.Add("-i")
    $arguments.Add($SshKeyPath)
  }

  $arguments.Add("$RemoteUser@$RemoteHost")
  $arguments.Add($Command)

  try {
    $output = & $resolvedSshExecutable @arguments 2>&1
    $exitCode = $LASTEXITCODE
  } catch {
    return [pscustomobject]@{
      ok = $false
      exitCode = -1
      lines = @("$($_)")
      error = "$_"
    }
  }

  return [pscustomobject]@{
    ok = $exitCode -eq 0
    exitCode = $exitCode
    lines = @($output | ForEach-Object { "$_" })
    error =
      if ($exitCode -eq 0) {
        $null
      } else {
        @($output | ForEach-Object { "$_" }) -join "`n"
      }
  }
}

function Invoke-SshSudoCommandSafe {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command
  )

  $resolvedPassword = Resolve-SshPassword

  if ([string]::IsNullOrWhiteSpace($resolvedPassword)) {
    return [pscustomobject]@{
      ok = $false
      exitCode = -1
      lines = @()
      error = "SSH password was not available for sudo command."
    }
  }

  try {
    $pythonExecutable = Resolve-PythonExecutable
    $env:OWMCGP_INLINE_SSH_HOST = $RemoteHost
    $env:OWMCGP_INLINE_SSH_PORT = "$RemotePort"
    $env:OWMCGP_INLINE_SSH_USER = $RemoteUser
    $env:OWMCGP_INLINE_SSH_PASSWORD = $resolvedPassword
    $env:OWMCGP_INLINE_SSH_SUDO_COMMAND = $Command

    $pythonOutput = @'
import json
import os
import paramiko

host = os.environ["OWMCGP_INLINE_SSH_HOST"]
port = int(os.environ["OWMCGP_INLINE_SSH_PORT"])
user = os.environ["OWMCGP_INLINE_SSH_USER"]
password = os.environ["OWMCGP_INLINE_SSH_PASSWORD"]
command = os.environ["OWMCGP_INLINE_SSH_SUDO_COMMAND"]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, port=port, username=user, password=password, timeout=20, banner_timeout=20, auth_timeout=20)
    stdin, stdout, stderr = client.exec_command(f"sudo -S bash -lc {json.dumps(command)}", timeout=120)
    stdin.write(password + "\n")
    stdin.flush()
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    lines = [line for line in (out.splitlines() + err.splitlines()) if "[sudo] password" not in line.lower()]
    print(json.dumps({
        "ok": code == 0,
        "exitCode": code,
        "lines": lines,
        "error": None if code == 0 else (err or out or f"ssh exit {code}")
    }))
finally:
    client.close()
'@ | & $pythonExecutable -
    $parsed = ConvertFrom-JsonSafe -Raw ($pythonOutput -join "`n")

    if ($null -ne $parsed) {
      return [pscustomobject]@{
        ok = [bool]$parsed.ok
        exitCode = [int]$parsed.exitCode
        lines = @($parsed.lines | ForEach-Object { "$_" })
        error = $parsed.error
      }
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      exitCode = -1
      lines = @("$($_)")
      error = "$_"
    }
  } finally {
    Remove-Item Env:OWMCGP_INLINE_SSH_HOST -ErrorAction SilentlyContinue
    Remove-Item Env:OWMCGP_INLINE_SSH_PORT -ErrorAction SilentlyContinue
    Remove-Item Env:OWMCGP_INLINE_SSH_USER -ErrorAction SilentlyContinue
    Remove-Item Env:OWMCGP_INLINE_SSH_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:OWMCGP_INLINE_SSH_SUDO_COMMAND -ErrorAction SilentlyContinue
  }

  return [pscustomobject]@{
    ok = $false
    exitCode = -1
    lines = @()
    error = "Unable to execute sudo SSH command."
  }
}

function Resolve-ApiTokenValue {
  if (-not [string]::IsNullOrWhiteSpace($ApiToken)) {
    return [pscustomobject]@{
      value = $ApiToken.Trim()
      source = "parameter"
    }
  }

  foreach ($envVarName in @($ApiTokenEnvVar, "OWMCGP_REMOTE_RELAY_API_TOKEN", "REMOTE_RELAY_API_TOKEN")) {
    if ([string]::IsNullOrWhiteSpace($envVarName)) {
      continue
    }

    $envValue = [Environment]::GetEnvironmentVariable($envVarName)

    if (-not [string]::IsNullOrWhiteSpace($envValue)) {
      return [pscustomobject]@{
        value = $envValue.Trim()
        source = "env:$envVarName"
      }
    }
  }

  $localSettingsPath = Join-Path $repoRoot "infra\data\control-api\remote-relay.local.json"

  if (Test-Path -LiteralPath $localSettingsPath) {
    $localSettings = ConvertFrom-JsonSafe -Raw (Get-Content -LiteralPath $localSettingsPath -Raw)
    $localSettingsToken = Get-ObjectPropertyValue -InputObject $localSettings -PropertyName "apiToken" -DefaultValue ""

    if (-not [string]::IsNullOrWhiteSpace([string]$localSettingsToken)) {
      return [pscustomobject]@{
        value = ([string]$localSettingsToken).Trim()
        source = "file:infra/data/control-api/remote-relay.local.json"
      }
    }
  }

  try {
    $sshResult = Invoke-SshCommandSafe -Command "bash -lc 'for name in OWMCGP_REMOTE_RELAY_API_TOKEN REMOTE_RELAY_API_TOKEN; do value=\$(printenv \"\$name\"); if [ -n \"\$value\" ]; then printf \"%s\n%s\" \"\$name\" \"\$value\"; exit 0; fi; done; exit 3'"

    if ($sshResult.ok -and @($sshResult.lines).Count -ge 2) {
      $resolvedEnvName = [string]$sshResult.lines[0]
      $resolvedToken = (@($sshResult.lines)[1..(@($sshResult.lines).Count - 1)] -join "`n").Trim()

      if (-not [string]::IsNullOrWhiteSpace($resolvedToken)) {
        return [pscustomobject]@{
          value = $resolvedToken
          source = "ssh:$RemoteHost:env:$resolvedEnvName"
        }
      }
    }
  } catch {
  }

  try {
    $remoteEnvResult = Invoke-SshSudoCommandSafe -Command "cat /etc/owmcgp/remote-relay.env"

    if ($remoteEnvResult.ok) {
      foreach ($line in @($remoteEnvResult.lines)) {
        $normalizedLine = ([string]$line).Replace("`r", "").Trim()

        if ($normalizedLine -match "REMOTE_RELAY_API_TOKEN=(.+)$") {
          $remoteEnvToken = $Matches[1].Trim()

          if (-not [string]::IsNullOrWhiteSpace($remoteEnvToken)) {
            return [pscustomobject]@{
              value = $remoteEnvToken
              source = "ssh:$RemoteHost:sudo:/etc/owmcgp/remote-relay.env"
            }
          }
        }
      }
    }
  } catch {
  }

  return [pscustomobject]@{
    value = ""
    source = "missing"
  }
}

function Invoke-HttpRequestSafe {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [string]$Method = "GET",
    [hashtable]$Headers = @{},
    [string]$Body = "",
    [int]$TimeoutSeconds = 30
  )

  $handler = $null
  $client = $null
  $request = $null

  try {
    $handler = [System.Net.Http.HttpClientHandler]::new()
    $client = [System.Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds($TimeoutSeconds)
    $request = [System.Net.Http.HttpRequestMessage]::new(
      [System.Net.Http.HttpMethod]::new($Method.ToUpperInvariant()),
      $Url
    )

    if (-not [string]::IsNullOrWhiteSpace($Body)) {
      $request.Content = [System.Net.Http.StringContent]::new(
        $Body,
        [System.Text.Encoding]::UTF8,
        "application/json"
      )
    }

    foreach ($headerName in $Headers.Keys) {
      $headerValue = [string]$Headers[$headerName]

      if ([string]::IsNullOrWhiteSpace($headerValue)) {
        continue
      }

      $null = $request.Headers.TryAddWithoutValidation($headerName, $headerValue)
    }

    $response = $client.SendAsync($request).GetAwaiter().GetResult()
    $responseBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $statusCode = [int]$response.StatusCode

    return [pscustomobject]@{
      ok = $statusCode -ge 200 -and $statusCode -lt 400
      statusCode = $statusCode
      body = $responseBody
      errorKind =
        if ($statusCode -ge 200 -and $statusCode -lt 400) {
          $null
        } else {
          "http_error"
        }
      error =
        if ($statusCode -ge 200 -and $statusCode -lt 400) {
          $null
        } else {
          "HTTP $statusCode"
        }
      requestUrl = $Url
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      statusCode = $null
      body = ""
      errorKind = "transport_error"
      error = "$_"
      requestUrl = $Url
    }
  } finally {
    if ($null -ne $request) {
      $request.Dispose()
    }

    if ($null -ne $client) {
      $client.Dispose()
    }

    if ($null -ne $handler) {
      $handler.Dispose()
    }
  }
}

function Resolve-IsolatedWorkersById {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
    throw "Isolation artifact was not found: $Path"
  }

  $artifact = ConvertFrom-JsonSafe -Raw (Get-Content -LiteralPath $Path -Raw)

  if ($null -eq $artifact) {
    throw "Isolation artifact is not valid JSON: $Path"
  }

  $map = @{}

  foreach ($worker in @($artifact.workers)) {
    $workerId = [string](Get-ObjectPropertyValue -InputObject $worker -PropertyName "workerId" -DefaultValue "")

    if ([string]::IsNullOrWhiteSpace($workerId)) {
      continue
    }

    $agentPort = Resolve-AgentPort -WorkerId $workerId

    $map[$workerId] = [pscustomobject]@{
      workerId = $workerId
      displayName = Resolve-DisplayName -WorkerId $workerId
      agentPort = $agentPort
      tunnelPort = Resolve-TunnelPort -AgentPort $agentPort
      browserExecutablePath = [string](Get-ObjectPropertyValue -InputObject $worker -PropertyName "browserExecutablePath" -DefaultValue "")
      browserDataPath = [string](Get-ObjectPropertyValue -InputObject $worker -PropertyName "browserDataPath" -DefaultValue "")
      browserRootPath = [string](Get-ObjectPropertyValue -InputObject $worker -PropertyName "browserRootPath" -DefaultValue "")
      remoteDebuggingPort = [int](Get-ObjectPropertyValue -InputObject $worker -PropertyName "remoteDebuggingPort" -DefaultValue 0)
      launchResult = [string](Get-ObjectPropertyValue -InputObject $worker -PropertyName "launchResult" -DefaultValue "")
      windowKeptOpen = [bool](Get-ObjectPropertyValue -InputObject $worker -PropertyName "windowKeptOpen" -DefaultValue $false)
    }
  }

  return $map
}

function Invoke-CdpSurfaceProbe {
  param(
    [Parameter(Mandatory = $true)]
    [object]$WorkerInfo
  )

  $nodeScript = @'
const path = require("node:path");

async function main() {
  const [repoRoot, workerId, cdpPortRaw] = process.argv.slice(2);
  const cdpPort = Number.parseInt(cdpPortRaw, 10);
  const { chromium } = require(path.join(repoRoot, "workers", "agent", "node_modules", "playwright"));
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${cdpPort}`);

  try {
    let page = null;
    for (const context of browser.contexts()) {
      for (const candidate of context.pages()) {
        page = candidate;
        break;
      }
      if (page) {
        break;
      }
    }

    if (!page) {
      throw new Error("no_page_targets");
    }

    try {
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
    } catch {}

    await page.waitForTimeout(1000);

    const payload = await page.evaluate((currentWorkerId) => {
      const bodyText = document.body ? document.body.innerText.replace(/\s+/g, " ").trim() : "";
      const preview = bodyText.length <= 320 ? bodyText : `${bodyText.slice(0, 320)}...`;
      const hasComposer = Boolean(
        document.querySelector("textarea") ||
        document.querySelector('[contenteditable="true"]')
      );
      const normalized = `${document.title || ""} ${window.location.href || ""} ${bodyText}`.toLowerCase();
      const markers = [];

      if (hasComposer) {
        markers.push("composer_visible");
      }
      if ((window.location.href || "").startsWith("chrome-error://")) {
        markers.push("chrome_error");
      }
      if (
        normalized.includes("choose an account") ||
        normalized.includes("continue as") ||
        normalized.includes("is this you")
      ) {
        markers.push("manual_confirm_required");
      }
      if (
        normalized.includes("log in") ||
        normalized.includes("sign in") ||
        normalized.includes("login") ||
        normalized.includes("sign up")
      ) {
        markers.push("login_required");
      }

      let classification = "surface_unusable";
      if (markers.includes("chrome_error")) {
        classification = "broken_surface";
      } else if (markers.includes("manual_confirm_required")) {
        classification = "needs_manual_confirm";
      } else if (markers.includes("login_required")) {
        classification = "needs_login";
      } else if ((window.location.href || "").startsWith("https://chatgpt.com") && hasComposer) {
        classification = "ready";
      }

      return {
        success: true,
        workerId: currentWorkerId,
        pageTitle: document.title || "",
        pageUrl: window.location.href || "",
        readyState: document.readyState || "",
        hasComposer,
        textPreview: preview,
        surfaceMarkers: markers,
        classification
      };
    }, workerId);

    console.log(JSON.stringify(payload));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.log(JSON.stringify({
    success: false,
    errorCode: "cdp_probe_failed",
    error: error instanceof Error ? error.message : String(error),
    classification: "runtime_blocked",
    surfaceMarkers: ["cdp_probe_failed"]
  }));
  process.exitCode = 1;
});
'@

  $output = $nodeScript | node - $repoRoot $WorkerInfo.workerId $WorkerInfo.remoteDebuggingPort 2>&1
  $payload = ConvertFrom-JsonSafe -Raw ($output -join "`n")

  if ($null -eq $payload) {
    return [pscustomobject]@{
      success = $false
      workerId = $WorkerInfo.workerId
      pageTitle = ""
      pageUrl = ""
      readyState = ""
      hasComposer = $false
      textPreview = (@($output) -join "`n")
      surfaceMarkers = @("cdp_probe_failed")
      classification = "runtime_blocked"
      errorCode = "cdp_probe_output_not_json"
      error = (@($output) -join "`n")
    }
  }

  return $payload
}

function Stop-WorkerAgentOnly {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorkerId,
    [Parameter(Mandatory = $true)]
    [int]$AgentPort
  )

  $processIds = New-Object System.Collections.Generic.HashSet[int]

  foreach ($connection in @(Get-NetTCPConnection -LocalPort $AgentPort -ErrorAction SilentlyContinue)) {
    if ($connection.OwningProcess -gt 0) {
      $null = $processIds.Add([int]$connection.OwningProcess)
    }
  }

  foreach ($process in @(
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object {
        (
          $_.Name -eq "node.exe" -or
          $_.Name -eq "powershell.exe" -or
          $_.Name -eq "pwsh.exe" -or
          $_.Name -eq "cmd.exe"
        ) -and
        $_.CommandLine -match [regex]::Escape($WorkerId) -and
        $_.CommandLine -match "start-host-worker-agent\.ps1|tsx|workers\\agent\\src\\server\.ts"
      }
  )) {
    $null = $processIds.Add([int]$process.ProcessId)
  }

  foreach ($processId in @($processIds)) {
    if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
  }
}

function Invoke-WorkerAgentHealth {
  param([int]$AgentPort)

  return Invoke-HttpRequestSafe -Url "http://127.0.0.1:$AgentPort/health" -TimeoutSeconds 5
}

function Wait-ForWorkerAgentReady {
  param(
    [Parameter(Mandatory = $true)]
    [object]$WorkerInfo
  )

  $deadline = (Get-Date).AddSeconds([Math]::Max($AgentReadyTimeoutSeconds, 5))
  $lastPayload = $null
  $lastProbe = $null

  while ((Get-Date) -lt $deadline) {
    $probe = Invoke-WorkerAgentHealth -AgentPort $WorkerInfo.agentPort
    $payload = ConvertFrom-JsonSafe -Raw ([string](Get-ObjectPropertyValue -InputObject $probe -PropertyName "body" -DefaultValue ""))

    if ($probe.ok -and $null -ne $payload) {
      $lastPayload = $payload
      $lastProbe = $probe

      $browserContextReady = [bool](Get-ObjectPropertyValue -InputObject $payload -PropertyName "browserContextReady" -DefaultValue $false)
      $runtimeStatus = [string](Get-ObjectPropertyValue -InputObject $payload -PropertyName "runtimeStatus" -DefaultValue "")

      if ($browserContextReady -or $runtimeStatus -eq "ready" -or $runtimeStatus -eq "reauth_required") {
        return [pscustomobject]@{
          ok = $true
          probe = $probe
          payload = $payload
        }
      }
    }

    Start-Sleep -Milliseconds $PollIntervalMilliseconds
  }

  return [pscustomobject]@{
    ok = $false
    probe = $lastProbe
    payload = $lastPayload
  }
}

function Start-IsolatedWorkerAgent {
  param(
    [Parameter(Mandatory = $true)]
    [object]$WorkerInfo
  )

  $scriptPath = Join-Path $repoRoot "infra\host-worker\start-host-native-worker.ps1"

  Stop-WorkerAgentOnly -WorkerId $WorkerInfo.workerId -AgentPort $WorkerInfo.agentPort
  Start-Sleep -Milliseconds 500

  try {
    & $scriptPath `
      -WorkerId $WorkerInfo.workerId `
      -DisplayName $WorkerInfo.displayName `
      -AgentPort $WorkerInfo.agentPort `
      -CdpPort $WorkerInfo.remoteDebuggingPort `
      -BrowserExecutablePath $WorkerInfo.browserExecutablePath `
      -ProfilePath $WorkerInfo.browserDataPath `
      -StartUrl "https://chatgpt.com/" `
      -RuntimeMode "VisibleAuth" `
      -BrowserWindowMode "Normal" `
      -RepoRoot $repoRoot `
      -DetachAgent `
      -SkipInstall

    $waitResult = Wait-ForWorkerAgentReady -WorkerInfo $WorkerInfo

    return [pscustomobject]@{
      ok = $waitResult.ok
      launchMode = "attach_existing_isolated_browser"
      agentPort = $WorkerInfo.agentPort
      cdpPort = $WorkerInfo.remoteDebuggingPort
      payload = $waitResult.payload
      healthProbe = $waitResult.probe
      error =
        if ($waitResult.ok) {
          $null
        } else {
          "worker_agent_not_ready_in_time"
        }
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      launchMode = "attach_existing_isolated_browser"
      agentPort = $WorkerInfo.agentPort
      cdpPort = $WorkerInfo.remoteDebuggingPort
      payload = $null
      healthProbe = $null
      error = "$_"
    }
  }
}

function Get-RemoteTunnelListenerSnapshot {
  param(
    [Parameter(Mandatory = $true)]
    [int[]]$Ports
  )

  $sshResult = Invoke-SshCommandSafe -Command "bash -lc 'ss -ltnH'"
  $listeners = @{}

  foreach ($port in $Ports) {
    $listeners["$port"] = [pscustomobject]@{
      port = $port
      listening = $false
    }
  }

  if (-not $sshResult.ok) {
    return [pscustomobject]@{
      sshReachable = $false
      error = $sshResult.error
      listeners = $listeners
      allListening = $false
      classification = "ssh_unreachable"
    }
  }

  $normalizedLines = @($sshResult.lines | ForEach-Object { ([string]$_).Trim() })

  foreach ($port in $Ports) {
    $portPattern = ":$port\b"
    $listening = $normalizedLines | Where-Object { $_ -match $portPattern } | Select-Object -First 1
    $listeners["$port"] = [pscustomobject]@{
      port = $port
      listening = $null -ne $listening
    }
  }

  $allListening = @($listeners.Values | Where-Object { -not $_.listening }).Count -eq 0

  return [pscustomobject]@{
    sshReachable = $true
    error = $null
    listeners = $listeners
    allListening = $allListening
    classification =
      if ($allListening) {
        "all_listening"
      } else {
        "missing_listeners"
      }
  }
}

function Wait-ForRemoteTunnelListeners {
  param(
    [Parameter(Mandatory = $true)]
    [int[]]$Ports
  )

  $deadline = (Get-Date).AddSeconds([Math]::Max($TunnelReadyTimeoutSeconds, 5))
  $lastSnapshot = $null

  while ((Get-Date) -lt $deadline) {
    $snapshot = Get-RemoteTunnelListenerSnapshot -Ports $Ports
    $lastSnapshot = $snapshot

    if ($snapshot.allListening) {
      return $snapshot
    }

    Start-Sleep -Milliseconds $PollIntervalMilliseconds
  }

  return $lastSnapshot
}

function Start-TemporaryReverseTunnels {
  $scriptPath = Join-Path $repoRoot "infra\windows-block\start-reverse-tunnels.ps1"
  $params = @{
    RemoteHost = $RemoteHost
    RemotePort = $RemotePort
    RemoteUser = $RemoteUser
    IncludeHostController = $true
  }

  if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) {
    $params.SshKeyPath = $SshKeyPath
  }

  if (-not [string]::IsNullOrWhiteSpace($SshPassword)) {
    $params.SshPassword = $SshPassword
  }

  try {
    $output = & $scriptPath @params 2>&1
    return [pscustomobject]@{
      ok = $true
      output = @($output | ForEach-Object { "$_" })
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      output = @("$($_)")
      error = "$_"
    }
  }
}

function Stop-TemporaryReverseTunnels {
  $scriptPath = Join-Path $repoRoot "infra\windows-block\stop-reverse-tunnels.ps1"

  try {
    $output = & $scriptPath -RemoteHost $RemoteHost 2>&1
    return [pscustomobject]@{
      ok = $true
      output = @($output | ForEach-Object { "$_" })
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      output = @("$($_)")
      error = "$_"
    }
  }
}

function Test-ProbeSuccess {
  param([object]$Probe)

  return (
    $null -ne $Probe -and
    $Probe.success -eq $true -and
    $null -ne $Probe.statusCode -and
    [int]$Probe.statusCode -ge 200 -and
    [int]$Probe.statusCode -lt 400
  )
}

function Convert-PublicProbeResult {
  param(
    [Parameter(Mandatory = $true)]
    [object]$ProbePayload,
    [Parameter(Mandatory = $true)]
    [string]$FallbackWorkerId,
    [Parameter(Mandatory = $true)]
    [string]$TokenSource
  )

  $healthProbe = Get-ObjectPropertyValue -InputObject $ProbePayload -PropertyName "healthz"
  $modelsProbe = Get-ObjectPropertyValue -InputObject $ProbePayload -PropertyName "models"
  $chatProbe = Get-ObjectPropertyValue -InputObject $ProbePayload -PropertyName "chatCompletions"

  if ($null -eq $chatProbe) {
    $chatProbe = Get-ObjectPropertyValue -InputObject $ProbePayload -PropertyName "chat"
  }

  $chatPayload =
    if ($null -ne $chatProbe) {
      ConvertFrom-JsonSafe -Raw ([string](Get-ObjectPropertyValue -InputObject $chatProbe -PropertyName "body" -DefaultValue ""))
    } else {
      $null
    }
  $choices = @(Get-ObjectPropertyValue -InputObject $chatPayload -PropertyName "choices" -DefaultValue @())
  $message = Get-ObjectPropertyValue -InputObject ($choices | Select-Object -First 1) -PropertyName "message"
  $replyText = Get-ObjectPropertyValue -InputObject $message -PropertyName "content"
  $workerId = Get-ObjectPropertyValue -InputObject $chatPayload -PropertyName "worker_id" -DefaultValue $FallbackWorkerId
  $model = Get-ObjectPropertyValue -InputObject $chatPayload -PropertyName "model"
  $errorEnvelope = Get-ObjectPropertyValue -InputObject $chatPayload -PropertyName "error"
  $errorCode = Get-ObjectPropertyValue -InputObject $errorEnvelope -PropertyName "code"
  $errorType = Get-ObjectPropertyValue -InputObject $errorEnvelope -PropertyName "type"
  $errorMessage = Get-ObjectPropertyValue -InputObject $errorEnvelope -PropertyName "message"

  return [pscustomobject][ordered]@{
    tokenAvailable = $true
    tokenSource = $TokenSource
    executionHost = [System.Net.Dns]::GetHostName()
    blockedReason = $null
    healthz = [pscustomobject]@{
      ok = Test-ProbeSuccess -Probe $healthProbe
      statusCode = Get-ObjectPropertyValue -InputObject $healthProbe -PropertyName "statusCode"
      errorKind = Get-ObjectPropertyValue -InputObject $healthProbe -PropertyName "errorKind"
      requestUrl = Get-ObjectPropertyValue -InputObject $healthProbe -PropertyName "requestUrl"
    }
    models = [pscustomobject]@{
      ok = Test-ProbeSuccess -Probe $modelsProbe
      statusCode = Get-ObjectPropertyValue -InputObject $modelsProbe -PropertyName "statusCode"
      errorKind = Get-ObjectPropertyValue -InputObject $modelsProbe -PropertyName "errorKind"
      requestUrl = Get-ObjectPropertyValue -InputObject $modelsProbe -PropertyName "requestUrl"
    }
    chat = [pscustomobject]@{
      ok = (Test-ProbeSuccess -Probe $chatProbe) -and $replyText -eq "probe-ok"
      statusCode = Get-ObjectPropertyValue -InputObject $chatProbe -PropertyName "statusCode"
      errorKind =
        if ((Test-ProbeSuccess -Probe $chatProbe) -and $replyText -ne "probe-ok") {
          "unexpected_reply"
        } else {
          Get-ObjectPropertyValue -InputObject $chatProbe -PropertyName "errorKind"
        }
      errorCode = $errorCode
      errorType = $errorType
      errorMessage = $errorMessage
      requestUrl = Get-ObjectPropertyValue -InputObject $chatProbe -PropertyName "requestUrl"
      assistantReplyText = $replyText
      workerId = $workerId
      model = $model
      bodyPreview = Get-ObjectPropertyValue -InputObject $chatProbe -PropertyName "bodyPreview" -DefaultValue ""
    }
  }
}

function New-BlockedExternalSmoke {
  param(
    [string]$Reason,
    [string]$TokenSource,
    [object]$HealthzStatus,
    [bool]$TokenAvailable = $false,
    [string]$FallbackWorkerId = ""
  )

  $modelsErrorKind =
    if ($Reason -eq "missing_bearer_token") {
      "missing_bearer_token"
    } else {
      $Reason
    }

  return [pscustomobject][ordered]@{
    tokenAvailable = $TokenAvailable
    tokenSource = $TokenSource
    executionHost = [System.Net.Dns]::GetHostName()
    blockedReason = $Reason
    healthz = $HealthzStatus
    models = [pscustomobject]@{
      ok = $false
      statusCode = $null
      errorKind = $modelsErrorKind
      requestUrl = "$($PublicBaseUrl.TrimEnd('/'))/v1/models"
    }
    chat = [pscustomobject]@{
      ok = $false
      statusCode = $null
      errorKind = $Reason
      errorCode = $null
      errorType = $null
      errorMessage = $null
      requestUrl = "$($PublicBaseUrl.TrimEnd('/'))/v1/chat/completions"
      assistantReplyText = $null
      workerId = $FallbackWorkerId
      model = $null
    }
  }
}

$repoRoot = Resolve-RepoRoot
$phaseDir = Join-Path $repoRoot ".planning\phases\34-preserve-first-external-chat-proof-on-isolated-per-account-browser-roots"
$probeScriptPath = Join-Path $repoRoot "infra\windows-block\probe-public-api.ps1"

if ([string]::IsNullOrWhiteSpace($IsolationArtifactPath)) {
  $IsolationArtifactPath = Join-Path $repoRoot "infra\data\post-phase33-account-browser-isolation\latest.json"
}

if ([string]::IsNullOrWhiteSpace($LatestJsonPath)) {
  $LatestJsonPath = Join-Path $repoRoot "infra\data\post-phase33-isolated-external-chat-proof\latest.json"
}

if ([string]::IsNullOrWhiteSpace($OutputJsonPath)) {
  $OutputJsonPath = Join-Path $phaseDir "34-ISOLATED-EXTERNAL-CHAT-PROOF-SUMMARY.json"
}

if ([string]::IsNullOrWhiteSpace($OutputMarkdownPath)) {
  $OutputMarkdownPath = Join-Path $phaseDir "34-ISOLATED-EXTERNAL-CHAT-PROOF-SUMMARY.md"
}

Ensure-ParentDirectory -Path $LatestJsonPath
Ensure-ParentDirectory -Path $OutputJsonPath
Ensure-ParentDirectory -Path $OutputMarkdownPath

$isolatedWorkersById = Resolve-IsolatedWorkersById -Path $IsolationArtifactPath
$accountOrder = Normalize-WorkerIdList -WorkerIds $CandidateWorkerIds
$preflightAccounts = New-Object System.Collections.Generic.List[object]

foreach ($workerId in $accountOrder) {
  $workerInfo = $isolatedWorkersById[$workerId]

  if ($null -eq $workerInfo) {
    $preflightAccounts.Add(
      [pscustomobject]@{
        workerId = $workerId
        displayName = Resolve-DisplayName -WorkerId $workerId
        classification = "missing_isolated_root"
        pageTitle = ""
        pageUrl = ""
        readyState = ""
        hasComposer = $false
        textPreview = ""
        surfaceMarkers = @("missing_isolated_root")
        remoteDebuggingPort = $null
        browserDataPath = $null
        browserExecutablePath = $null
      }
    )
    continue
  }

  $preflight = Invoke-CdpSurfaceProbe -WorkerInfo $workerInfo
  $preflightAccounts.Add(
    [pscustomobject]@{
      workerId = $workerInfo.workerId
      displayName = $workerInfo.displayName
      classification = [string](Get-ObjectPropertyValue -InputObject $preflight -PropertyName "classification" -DefaultValue "runtime_blocked")
      pageTitle = [string](Get-ObjectPropertyValue -InputObject $preflight -PropertyName "pageTitle" -DefaultValue "")
      pageUrl = [string](Get-ObjectPropertyValue -InputObject $preflight -PropertyName "pageUrl" -DefaultValue "")
      readyState = [string](Get-ObjectPropertyValue -InputObject $preflight -PropertyName "readyState" -DefaultValue "")
      hasComposer = [bool](Get-ObjectPropertyValue -InputObject $preflight -PropertyName "hasComposer" -DefaultValue $false)
      textPreview = [string](Get-ObjectPropertyValue -InputObject $preflight -PropertyName "textPreview" -DefaultValue "")
      surfaceMarkers = @(
        Get-ObjectPropertyValue -InputObject $preflight -PropertyName "surfaceMarkers" -DefaultValue @()
      )
      remoteDebuggingPort = $workerInfo.remoteDebuggingPort
      browserDataPath = $workerInfo.browserDataPath
      browserExecutablePath = $workerInfo.browserExecutablePath
    }
  )
}

$apiTokenResolution = Resolve-ApiTokenValue
$attempts = New-Object System.Collections.Generic.List[object]
$successfulWorkerId = $null
$commonBlocker = $null
$exhaustionReason = $null
$startedTunnelsByWrapper = $false
$tunnelStartResult = $null
$tunnelStopResult = $null
$externalHealthStatus = Invoke-HttpRequestSafe -Url "$($PublicBaseUrl.TrimEnd('/'))/healthz"

foreach ($preflight in @($preflightAccounts.ToArray())) {
  $workerId = [string]$preflight.workerId
  $workerInfo = $isolatedWorkersById[$workerId]
  $classification = [string]$preflight.classification

  if ($classification -ne "ready" -or $null -eq $workerInfo) {
    $attempts.Add(
      [pscustomobject]@{
        workerId = $workerId
        displayName = Resolve-DisplayName -WorkerId $workerId
        skipped = $true
        skipReason =
          if ($null -eq $workerInfo) {
            "missing_isolated_root"
          } else {
            "preflight_$classification"
          }
        preflight = $preflight
        workerStartResult = $null
        reverseTunnelStatus = $null
        externalSmoke = $null
        attemptVerdict = "skipped"
      }
    )
    continue
  }

  $workerStartResult = Start-IsolatedWorkerAgent -WorkerInfo $workerInfo

  if (-not $startedTunnelsByWrapper) {
    $existingTunnelSnapshot = Wait-ForRemoteTunnelListeners -Ports @($workerInfo.tunnelPort, 14040)

    if ($existingTunnelSnapshot.allListening) {
      $tunnelStartResult = [pscustomobject]@{
        ok = $true
        reusedExistingTunnels = $true
      }
    } else {
      $tunnelStartResult = Start-TemporaryReverseTunnels
      $startedTunnelsByWrapper = [bool]$tunnelStartResult.ok
      Start-Sleep -Seconds 2
    }
  }

  $reverseTunnelStatus = Wait-ForRemoteTunnelListeners -Ports @($workerInfo.tunnelPort, 14040)

  $externalSmoke =
    if (-not $workerStartResult.ok) {
      New-BlockedExternalSmoke -Reason "worker_agent_not_ready" -TokenSource $apiTokenResolution.source -HealthzStatus $externalHealthStatus -TokenAvailable (-not [string]::IsNullOrWhiteSpace($apiTokenResolution.value)) -FallbackWorkerId $workerId
    } elseif (-not $reverseTunnelStatus.allListening) {
      New-BlockedExternalSmoke -Reason "reverse_tunnels_missing" -TokenSource $apiTokenResolution.source -HealthzStatus $externalHealthStatus -TokenAvailable (-not [string]::IsNullOrWhiteSpace($apiTokenResolution.value)) -FallbackWorkerId $workerId
    } elseif ([string]::IsNullOrWhiteSpace($apiTokenResolution.value)) {
      New-BlockedExternalSmoke -Reason "missing_bearer_token" -TokenSource $apiTokenResolution.source -HealthzStatus $externalHealthStatus -TokenAvailable $false -FallbackWorkerId $workerId
    } else {
      try {
        $probeRaw = & $probeScriptPath -BaseUrl $PublicBaseUrl -ApiToken $apiTokenResolution.value -WorkerId $workerId -IncludeChatProbe
        $probePayload = ConvertFrom-JsonSafe -Raw ($probeRaw -join "`n")

        if ($null -eq $probePayload) {
          New-BlockedExternalSmoke -Reason "probe_output_not_json" -TokenSource $apiTokenResolution.source -HealthzStatus $externalHealthStatus -TokenAvailable $true -FallbackWorkerId $workerId
        } else {
          Convert-PublicProbeResult -ProbePayload $probePayload -FallbackWorkerId $workerId -TokenSource $apiTokenResolution.source
        }
      } catch {
        [pscustomobject][ordered]@{
          tokenAvailable = $true
          tokenSource = $apiTokenResolution.source
          executionHost = [System.Net.Dns]::GetHostName()
          blockedReason = "probe_invocation_failed"
          healthz = $externalHealthStatus
          models = [pscustomobject]@{
            ok = $false
            statusCode = $null
            errorKind = "probe_invocation_failed"
            requestUrl = "$($PublicBaseUrl.TrimEnd('/'))/v1/models"
          }
          chat = [pscustomobject]@{
            ok = $false
            statusCode = $null
            errorKind = "probe_invocation_failed"
            errorCode = $null
            errorType = $null
            errorMessage = "$_"
            requestUrl = "$($PublicBaseUrl.TrimEnd('/'))/v1/chat/completions"
            assistantReplyText = $null
            workerId = $workerId
            model = $null
          }
        }
      }
    }

  $attemptVerdict =
    if (
      [bool]$externalSmoke.healthz.ok -and
      [bool]$externalSmoke.models.ok -and
      [bool]$externalSmoke.chat.ok
    ) {
      "externally_ready"
    } else {
      "hold_rollout"
    }

  $attempts.Add(
    [pscustomobject]@{
      workerId = $workerInfo.workerId
      displayName = $workerInfo.displayName
      skipped = $false
      skipReason = $null
      preflight = $preflight
      workerInfo = [pscustomobject]@{
        agentPort = $workerInfo.agentPort
        tunnelPort = $workerInfo.tunnelPort
        remoteDebuggingPort = $workerInfo.remoteDebuggingPort
        browserExecutablePath = $workerInfo.browserExecutablePath
        browserDataPath = $workerInfo.browserDataPath
      }
      workerStartResult = $workerStartResult
      reverseTunnelStatus = $reverseTunnelStatus
      externalSmoke = $externalSmoke
      attemptVerdict = $attemptVerdict
    }
  )

  if (-not $KeepAgentsRunning) {
    Stop-WorkerAgentOnly -WorkerId $workerInfo.workerId -AgentPort $workerInfo.agentPort
    Start-Sleep -Milliseconds 500
  }

  if ($attemptVerdict -eq "externally_ready") {
    $successfulWorkerId = $workerInfo.workerId
    break
  }
}

if ($startedTunnelsByWrapper -and -not $KeepReverseTunnelsRunning) {
  $tunnelStopResult = Stop-TemporaryReverseTunnels
  Start-Sleep -Seconds 2
}

$attemptArray = @($attempts.ToArray())
$failedAttempts = @($attemptArray | Where-Object { -not $_.skipped -and $_.attemptVerdict -ne "externally_ready" })
$blockerCandidates = New-Object System.Collections.Generic.List[string]

foreach ($attempt in $failedAttempts) {
  $externalSmoke = $attempt.externalSmoke
  $chat = Get-ObjectPropertyValue -InputObject $externalSmoke -PropertyName "chat"
  $blockedReason = [string](Get-ObjectPropertyValue -InputObject $externalSmoke -PropertyName "blockedReason" -DefaultValue "")
  $chatErrorCode = [string](Get-ObjectPropertyValue -InputObject $chat -PropertyName "errorCode" -DefaultValue "")
  $chatErrorType = [string](Get-ObjectPropertyValue -InputObject $chat -PropertyName "errorType" -DefaultValue "")
  $chatErrorKind = [string](Get-ObjectPropertyValue -InputObject $chat -PropertyName "errorKind" -DefaultValue "")

  foreach ($candidate in @($blockedReason, $chatErrorCode, $chatErrorType, $chatErrorKind, [string]$attempt.preflight.classification)) {
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
      $blockerCandidates.Add($candidate.Trim())
      break
    }
  }
}

if ($null -ne $successfulWorkerId) {
  $commonBlocker = $null
  $exhaustionReason = $null
} else {
  $commonBlocker =
    @(
      $blockerCandidates.ToArray() |
        Group-Object |
        Sort-Object `
          @{ Expression = "Count"; Descending = $true }, `
          @{ Expression = "Name"; Descending = $false } |
        Select-Object -First 1 |
        Select-Object -ExpandProperty Name
    ) | Select-Object -First 1

  if (@($attemptArray | Where-Object { -not $_.skipped }).Count -eq 0) {
    $exhaustionReason = "no_ready_isolated_accounts"
  } elseif ($failedAttempts.Count -eq @($attemptArray | Where-Object { -not $_.skipped }).Count) {
    $exhaustionReason = "all_ready_accounts_failed_external_chat"
  } else {
    $exhaustionReason = "exhausted_without_success"
  }
}

$verdict =
  if ($null -ne $successfulWorkerId) {
    "externally_ready"
  } else {
    "hold_rollout"
  }

$summary =
  if ($verdict -eq "externally_ready") {
    "External chat proof passed on isolated account root $successfulWorkerId."
  } else {
    "Hold rollout: no isolated account reached real outside chat success; commonBlocker=$commonBlocker, exhaustionReason=$exhaustionReason."
  }

$result = [pscustomobject][ordered]@{
  generatedAt = (Get-Date).ToString("o")
  scriptCompatibilityVersion = $scriptCompatibilityVersion
  isolationArtifactPath = $IsolationArtifactPath
  publicBaseUrl = $PublicBaseUrl
  accountOrder = $accountOrder
  preflightAccounts = @($preflightAccounts.ToArray())
  attempts = $attemptArray
  successfulWorkerId = $successfulWorkerId
  tokenSource = $apiTokenResolution.source
  commonBlocker = $commonBlocker
  exhaustionReason = $exhaustionReason
  verdict = $verdict
  summary = $summary
  preserveFirst = [pscustomobject][ordered]@{
    machineScope = "current_local_windows_only"
    transferredToWindowsServer = $false
    profilesDeleted = $false
    cookiesCleared = $false
    localStorageCleared = $false
    massReloginPerformed = $false
    oldSharedChromeRootsReused = $false
    isolatedPerAccountBrowserRoots = $true
    browsersClosedByWrapper = $false
  }
  reverseTunnelLifecycle = [pscustomobject]@{
    startedByWrapper = $startedTunnelsByWrapper
    startResult = $tunnelStartResult
    stopResult = $tunnelStopResult
  }
}

$jsonOutput = $result | ConvertTo-Json -Depth 12
$jsonOutput | Set-Content -LiteralPath $LatestJsonPath -Encoding UTF8
$jsonOutput | Set-Content -LiteralPath $OutputJsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Phase 34 Isolated External Chat Proof Summary")
$markdown.Add("")
$markdown.Add("- Generated: $($result.generatedAt)")
$markdown.Add("- Script compatibility version: $($result.scriptCompatibilityVersion)")
$markdown.Add("- Verdict: $($result.verdict)")
$markdown.Add("- Summary: $($result.summary)")
$markdown.Add("- successfulWorkerId: $(if ($result.successfulWorkerId) { $result.successfulWorkerId } else { 'none' })")
$markdown.Add("- tokenSource: $($result.tokenSource)")
$markdown.Add("- commonBlocker: $(if ($result.commonBlocker) { $result.commonBlocker } else { 'none' })")
$markdown.Add("- exhaustionReason: $(if ($result.exhaustionReason) { $result.exhaustionReason } else { 'none' })")
$markdown.Add("")
$markdown.Add("## Preflight")
$markdown.Add("")

foreach ($preflight in @($result.preflightAccounts)) {
  $markdown.Add("- $($preflight.workerId): classification=$($preflight.classification), hasComposer=$($preflight.hasComposer), pageUrl=$(if ($preflight.pageUrl) { $preflight.pageUrl } else { 'none' })")
}

$markdown.Add("")
$markdown.Add("## Attempts")
$markdown.Add("")

foreach ($attempt in @($result.attempts)) {
  $markdown.Add("### $($attempt.workerId)")
  $markdown.Add("")
  $markdown.Add("- skipped: $($attempt.skipped)")
  $markdown.Add("- skipReason: $(if ($attempt.skipReason) { $attempt.skipReason } else { 'none' })")
  $markdown.Add("- preflight classification: $($attempt.preflight.classification)")

  if (-not $attempt.skipped) {
    $chat = $attempt.externalSmoke.chat
    $markdown.Add("- workerStart ok: $($attempt.workerStartResult.ok)")
    $markdown.Add("- reverseTunnelStatus: $($attempt.reverseTunnelStatus.classification)")
    $markdown.Add("- healthz: status=$($attempt.externalSmoke.healthz.statusCode) ok=$($attempt.externalSmoke.healthz.ok)")
    $markdown.Add("- models: status=$($attempt.externalSmoke.models.statusCode) ok=$($attempt.externalSmoke.models.ok)")
    $markdown.Add("- chat: status=$($chat.statusCode) ok=$($chat.ok)")
    $markdown.Add("- chat errorCode: $(if ($chat.errorCode) { $chat.errorCode } else { 'none' })")
    $markdown.Add("- chat errorType: $(if ($chat.errorType) { $chat.errorType } else { 'none' })")
    $markdown.Add("- chat errorMessage: $(if ($chat.errorMessage) { $chat.errorMessage } else { 'none' })")
    $markdown.Add("- chat workerId: $(if ($chat.workerId) { $chat.workerId } else { 'none' })")
    $markdown.Add("- assistant reply: $(if ($chat.assistantReplyText) { $chat.assistantReplyText } else { 'none' })")
    $markdown.Add("- attemptVerdict: $($attempt.attemptVerdict)")
  }

  $markdown.Add("")
}

$markdown | Set-Content -LiteralPath $OutputMarkdownPath -Encoding UTF8
$jsonOutput
