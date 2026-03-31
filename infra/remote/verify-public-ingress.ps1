[CmdletBinding()]
param(
  [string]$HostName = "77.66.186.75",
  [int]$Port = 2222,
  [string]$User = "mi50",
  [string]$Password = "",
  [string]$RemoteEnvPath = "/etc/owmcgp/remote-relay.env",
  [string]$PublicBaseUrl = "http://77.66.186.75",
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

$publicBaseUrl = $PublicBaseUrl.TrimEnd("/")

$env:OWMCGP_VERIFY_PUBLIC_HOST = $HostName
$env:OWMCGP_VERIFY_PUBLIC_PORT = "$Port"
$env:OWMCGP_VERIFY_PUBLIC_USER = $User
$env:OWMCGP_VERIFY_PUBLIC_PASSWORD = $Password
$env:OWMCGP_VERIFY_PUBLIC_ENV_PATH = $RemoteEnvPath
$env:OWMCGP_VERIFY_PUBLIC_BASE_URL = $publicBaseUrl

$verificationJson = @'
import json
import os
import paramiko

host = os.environ["OWMCGP_VERIFY_PUBLIC_HOST"]
port = int(os.environ["OWMCGP_VERIFY_PUBLIC_PORT"])
user = os.environ["OWMCGP_VERIFY_PUBLIC_USER"]
password = os.environ["OWMCGP_VERIFY_PUBLIC_PASSWORD"]
env_path = os.environ["OWMCGP_VERIFY_PUBLIC_ENV_PATH"]
public_base_url = os.environ["OWMCGP_VERIFY_PUBLIC_BASE_URL"]
sudo_prefix = "echo '{0}' | sudo -S -p '' ".format(password.replace("'", "'\"'\"'"))

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=20)

stdin, stdout, stderr = client.exec_command(
    sudo_prefix + "sed -n '1,120p' " + env_path,
    timeout=60,
)
env_lines = stdout.read().decode("utf-8", "replace").splitlines()
stderr_text = stderr.read().decode("utf-8", "replace")
exit_code = stdout.channel.recv_exit_status()
if exit_code != 0:
    client.close()
    raise RuntimeError(stderr_text or "failed to read remote relay env")

token = ""
for raw_line in env_lines:
    line = raw_line.strip()
    if line.startswith("REMOTE_RELAY_API_TOKEN="):
        token = line.split("=", 1)[1]

python_script = r"""
import json
import urllib.request

public_base_url = "__PUBLIC_BASE_URL__"
token = "__TOKEN__"

def fetch(url, bearer=None):
    request = urllib.request.Request(url)
    if bearer is not None:
        request.add_header("Authorization", "Bearer " + bearer)
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            body = response.read().decode("utf-8", "replace")
            return {
                "ok": True,
                "status": response.status,
                "headers": dict(response.headers),
                "body": body[:4000],
            }
    except Exception as error:
        status = None
        body = None
        headers = None
        if hasattr(error, "code"):
            status = error.code
        if hasattr(error, "headers") and error.headers is not None:
            headers = dict(error.headers)
        if hasattr(error, "read"):
            try:
                body = error.read().decode("utf-8", "replace")[:4000]
            except Exception:
                body = None
        return {
            "ok": False,
            "status": status,
            "headers": headers,
            "body": body,
            "detail": str(error),
        }

result = {
    "serverHealthz": fetch(public_base_url + "/healthz"),
    "serverRelayHealth": fetch(public_base_url + "/api/relay/health", bearer=token),
    "serverRelayHealthInvalid": fetch(public_base_url + "/api/relay/health", bearer="invalid"),
}

print(json.dumps(result))
"""
python_script = python_script.replace("__PUBLIC_BASE_URL__", public_base_url.replace("\\", "\\\\").replace('"', '\\"'))
python_script = python_script.replace("__TOKEN__", token.replace("\\", "\\\\").replace('"', '\\"'))
stdin, stdout, stderr = client.exec_command(
    "python3 - <<'PY'\n" + python_script + "\nPY",
    timeout=180,
)
payload = stdout.read().decode("utf-8", "replace")
errors = stderr.read().decode("utf-8", "replace")
exit_code = stdout.channel.recv_exit_status()
client.close()

if exit_code != 0:
    raise RuntimeError(errors or payload or "remote public verification failed")

print(payload)
'@ | python -

if ($LASTEXITCODE -ne 0) {
  throw "verify-public-ingress Python helper failed."
}

$serverResult = $verificationJson | ConvertFrom-Json

function Invoke-PublicProbe {
  param(
    [string]$Url,
    [string]$Token = ""
  )

  $headers = @{}

  if (-not [string]::IsNullOrWhiteSpace($Token)) {
    $headers["Authorization"] = "Bearer $Token"
  }

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Headers $headers -TimeoutSec 20

    return [pscustomobject]@{
      ok = $true
      status = [int]$response.StatusCode
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
      status = $httpStatus
      detail = "$_"
    }
  }
}

$result = [pscustomobject]@{
  checkedAt = (Get-Date).ToString("o")
  publicBaseUrl = $publicBaseUrl
  operatorHealthz = Invoke-PublicProbe -Url "$publicBaseUrl/healthz"
  operatorRelayHealthInvalid = Invoke-PublicProbe -Url "$publicBaseUrl/api/relay/health" -Token "invalid"
  serverPerspective = $serverResult
}

if ($ReturnJson) {
  return $result
}

$result | ConvertTo-Json -Depth 12
