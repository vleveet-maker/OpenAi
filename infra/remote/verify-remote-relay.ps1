[CmdletBinding()]
param(
  [string]$HostName = "77.66.186.75",
  [int]$Port = 2222,
  [string]$User = "mi50",
  [string]$Password = "",
  [string]$ServiceName = "owmcgp-remote-relay",
  [string]$RemoteEnvPath = "/etc/owmcgp/remote-relay.env",
  [string]$RawRelayBaseUrl = "",
  [string]$PublicRelayBaseUrl = "",
  [switch]$ReturnJson
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Password)) {
  $Password = [Environment]::GetEnvironmentVariable("OWMCGP_REMOTE_SSH_PASSWORD")
}

if ([string]::IsNullOrWhiteSpace($Password)) {
  throw "Password is required. Pass -Password or set OWMCGP_REMOTE_SSH_PASSWORD."
}

if ([string]::IsNullOrWhiteSpace($RawRelayBaseUrl)) {
  $resolvedRawRelayBaseUrl = "http://${HostName}:4010"
} else {
  $resolvedRawRelayBaseUrl = $RawRelayBaseUrl.TrimEnd("/")
}

if ([string]::IsNullOrWhiteSpace($PublicRelayBaseUrl)) {
  $resolvedPublicRelayBaseUrl = "http://$HostName"
} else {
  $resolvedPublicRelayBaseUrl = $PublicRelayBaseUrl.TrimEnd("/")
}

$env:OWMCGP_REMOTE_VERIFY_HOST = $HostName
$env:OWMCGP_REMOTE_VERIFY_PORT = "$Port"
$env:OWMCGP_REMOTE_VERIFY_USER = $User
$env:OWMCGP_REMOTE_VERIFY_PASSWORD = $Password
$env:OWMCGP_REMOTE_VERIFY_SERVICE = $ServiceName
$env:OWMCGP_REMOTE_VERIFY_ENV = $RemoteEnvPath

$remoteSnapshotJson = @'
import json
import os
import paramiko

host = os.environ["OWMCGP_REMOTE_VERIFY_HOST"]
port = int(os.environ["OWMCGP_REMOTE_VERIFY_PORT"])
user = os.environ["OWMCGP_REMOTE_VERIFY_USER"]
password = os.environ["OWMCGP_REMOTE_VERIFY_PASSWORD"]
service = os.environ["OWMCGP_REMOTE_VERIFY_SERVICE"]
env_path = os.environ["OWMCGP_REMOTE_VERIFY_ENV"]

def run(client, command, timeout=40):
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    return {
        "stdout": stdout.read().decode("utf-8", "replace").strip(),
        "stderr": stderr.read().decode("utf-8", "replace").strip()
    }

sudo_prefix = "echo '{0}' | sudo -S -p '' ".format(password.replace("'", "'\"'\"'"))
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=15)

env_lines = run(client, sudo_prefix + f"sed -n '1,120p' {env_path}")["stdout"].splitlines()
token = ""
topology = ""
for line in env_lines:
    if line.startswith("REMOTE_RELAY_API_TOKEN="):
        token = line.split("=", 1)[1]
    if line.startswith("REMOTE_RELAY_TOPOLOGY_HINT="):
        topology = line.split("=", 1)[1]

result = {
    "host": host,
    "serviceName": service,
    "systemd": {
        "enabled": run(client, f"systemctl is-enabled {service} || true")["stdout"],
        "active": run(client, f"systemctl is-active {service} || true")["stdout"],
        "show": run(client, f"systemctl show -p Id -p ActiveState -p SubState -p UnitFileState -p ExecMainPID {service} || true")["stdout"]
    },
    "relayListen": run(client, "ss -ltnp | egrep '(:4010|:80|:443)' || true")["stdout"],
    "nginx": {
        "version": run(client, "nginx -v 2>&1 || true")["stdout"],
        "active": run(client, "systemctl is-active nginx || true")["stdout"],
        "enabled": run(client, "systemctl is-enabled nginx || true")["stdout"],
        "configTest": run(client, sudo_prefix + "nginx -t 2>&1 || true")["stdout"]
    },
    "topologyHint": topology or "missing",
    "_apiToken": token,
    "remoteLocalHealth": run(
        client,
        "python3 - <<'PY'\nimport json\nimport urllib.request\n"
        + f"token = {json.dumps(token)}\n"
        + "req = urllib.request.Request('http://127.0.0.1:4010/api/relay/health', headers={'Authorization': 'Bearer ' + token})\n"
        + "try:\n"
        + "    with urllib.request.urlopen(req, timeout=10) as response:\n"
        + "        body = response.read().decode()\n"
        + "        print(json.dumps({'ok': True, 'status': response.status, 'body': body}))\n"
        + "except Exception as error:\n"
        + "    print(json.dumps({'ok': False, 'detail': str(error)}))\n"
        + "PY"
    )["stdout"]
}

client.close()
print(json.dumps(result))
'@ | python -

if ($LASTEXITCODE -ne 0) {
  throw "verify-remote-relay Python helper failed."
}

$remoteSnapshot = $remoteSnapshotJson | ConvertFrom-Json
$apiToken = [string]$remoteSnapshot._apiToken
$remoteSnapshot.PSObject.Properties.Remove("_apiToken")

function Invoke-RelayHealthProbe {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest `
      -UseBasicParsing `
      -Uri $Url `
      -Headers @{ Authorization = "Bearer $apiToken" } `
      -TimeoutSec 20

    return [pscustomobject]@{
      ok = $true
      statusCode = [int]$response.StatusCode
      body = $response.Content
    }
  } catch {
    $httpStatus = $null

    if (
      $_.Exception -and
      $_.Exception.PSObject.Properties.Name -contains "Response" -and
      $_.Exception.Response
    ) {
      $httpStatus = [int]$_.Exception.Response.StatusCode
    }

    return [pscustomobject]@{
      ok = $false
      statusCode = $httpStatus
      detail = "$_"
    }
  }
}

$remoteLocalHealth =
  if ($remoteSnapshot.remoteLocalHealth) {
    $remoteSnapshot.remoteLocalHealth | ConvertFrom-Json
  } else {
    [pscustomobject]@{
      ok = $false
      detail = "missing_remote_local_health"
    }
  }

$result = [pscustomobject]@{
  checkedAt = (Get-Date).ToString("o")
  host = $HostName
  serviceName = $ServiceName
  topologyHint = $remoteSnapshot.topologyHint
  systemd = $remoteSnapshot.systemd
  relayListen = $remoteSnapshot.relayListen
  nginx = $remoteSnapshot.nginx
  remoteLocalHealth = $remoteLocalHealth
  externalRawRelayHealth = Invoke-RelayHealthProbe -Url "$resolvedRawRelayBaseUrl/api/relay/health"
  externalPublicIngressHealth = Invoke-RelayHealthProbe -Url "$resolvedPublicRelayBaseUrl/api/relay/health"
}

if ($ReturnJson) {
  return $result
}

$result | ConvertTo-Json -Depth 8
