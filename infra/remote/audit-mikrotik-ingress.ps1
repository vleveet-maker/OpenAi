[CmdletBinding()]
param(
  [string]$HostName = "77.66.186.75",
  [int]$Port = 2222,
  [string]$User = "mi50",
  [string]$Password = "",
  [string]$RouterPublicIp = "77.66.186.75",
  [string]$RouterLanIp = "192.168.88.1",
  [string]$RouterUser = "admin",
  [string]$RouterPassword = "admin",
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

if ([string]::IsNullOrWhiteSpace($RouterPassword)) {
  $RouterPassword = [Environment]::GetEnvironmentVariable("OWMCGP_MIKROTIK_PASSWORD")
}

if ([string]::IsNullOrWhiteSpace($RouterPassword)) {
  throw "Router password is required. Pass -RouterPassword or set OWMCGP_MIKROTIK_PASSWORD."
}

$env:OWMCGP_AUDIT_REMOTE_HOST = $HostName
$env:OWMCGP_AUDIT_REMOTE_PORT = "$Port"
$env:OWMCGP_AUDIT_REMOTE_USER = $User
$env:OWMCGP_AUDIT_REMOTE_PASSWORD = $Password
$env:OWMCGP_AUDIT_ROUTER_PUBLIC_IP = $RouterPublicIp
$env:OWMCGP_AUDIT_ROUTER_LAN_IP = $RouterLanIp
$env:OWMCGP_AUDIT_ROUTER_USER = $RouterUser
$env:OWMCGP_AUDIT_ROUTER_PASSWORD = $RouterPassword

$auditJson = @'
import json
import os
import socket
import paramiko

host = os.environ["OWMCGP_AUDIT_REMOTE_HOST"]
port = int(os.environ["OWMCGP_AUDIT_REMOTE_PORT"])
user = os.environ["OWMCGP_AUDIT_REMOTE_USER"]
password = os.environ["OWMCGP_AUDIT_REMOTE_PASSWORD"]
router_public_ip = os.environ["OWMCGP_AUDIT_ROUTER_PUBLIC_IP"]
router_lan_ip = os.environ["OWMCGP_AUDIT_ROUTER_LAN_IP"]
router_user = os.environ["OWMCGP_AUDIT_ROUTER_USER"]
router_password = os.environ["OWMCGP_AUDIT_ROUTER_PASSWORD"]

python_script = r"""
import json
import requests
import socket
import subprocess

router_public_ip = "__ROUTER_PUBLIC_IP__"
router_lan_ip = "__ROUTER_LAN_IP__"
router_user = "__ROUTER_USER__"
router_password = "__ROUTER_PASSWORD__"

session = requests.Session()
session.trust_env = False
rest_base = None

def pick_rest_base():
    for candidate in [f"http://{router_public_ip}/rest", f"http://{router_lan_ip}/rest"]:
        try:
            response = session.get(candidate + "/system/resource", auth=(router_user, router_password), timeout=10)
            if response.status_code == 200:
                return candidate
        except Exception:
            continue
    return None

def run(command):
    completed = subprocess.run(command, shell=True, capture_output=True, text=True)
    return {
        "command": command,
        "exit": completed.returncode,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
    }

def http_get(url, auth=None, timeout=15):
    try:
        response = session.get(url, auth=auth, timeout=timeout)
        return {
            "ok": True,
            "status": response.status_code,
            "headers": dict(response.headers),
            "body": response.text[:4000],
        }
    except Exception as error:
        return {
            "ok": False,
            "detail": str(error),
        }

def tcp_probe(target, port):
    sock = socket.socket()
    sock.settimeout(3)
    try:
        sock.connect((target, port))
        return True
    except Exception:
        return False
    finally:
        sock.close()

router_ports = []
for probe_port in [22, 80, 443, 8291, 8728, 8729]:
    router_ports.append({"port": probe_port, "open": tcp_probe(router_lan_ip, probe_port)})

rest_base = pick_rest_base()
router_rest = {}
for path in ["/system/resource", "/system/identity", "/ip/service", "/ip/address", "/ip/firewall/nat", "/ip/firewall/filter"]:
    if rest_base is None:
        router_rest[path] = {"ok": False, "detail": "no_working_rest_base"}
    else:
        router_rest[path] = http_get(
            rest_base + path,
            auth=(router_user, router_password),
            timeout=20,
        )

public_root = http_get(f"http://{router_public_ip}/", timeout=15)
public_healthz = http_get(f"http://{router_public_ip}/healthz", timeout=15)
server_local_healthz = http_get("http://127.0.0.1/healthz", timeout=10)
server_nginx_8080_healthz = http_get("http://127.0.0.1:8080/healthz", timeout=10)
server_raw_relay = http_get(
    "http://127.0.0.1:4010/api/relay/health",
    auth=("invalid", "invalid"),
    timeout=10,
)

result = {
    "server": {
        "route_to_router": run(f"ip route get {router_lan_ip}"),
        "ping_router": run(f"ping -c 2 {router_lan_ip}"),
        "local_healthz": server_local_healthz,
        "local_nginx_8080_healthz": server_nginx_8080_healthz,
        "raw_relay_boundary": server_raw_relay,
        "public_healthz_from_server": public_healthz,
    },
    "router": {
        "router_lan_ip": router_lan_ip,
        "router_public_ip": router_public_ip,
        "selected_rest_base": rest_base,
        "router_ports": router_ports,
        "public_root": public_root,
        "rest": router_rest,
    },
}

print(json.dumps(result))
"""
python_script = python_script.replace("__ROUTER_PUBLIC_IP__", router_public_ip.replace("\\", "\\\\").replace('"', '\\"'))
python_script = python_script.replace("__ROUTER_LAN_IP__", router_lan_ip.replace("\\", "\\\\").replace('"', '\\"'))
python_script = python_script.replace("__ROUTER_USER__", router_user.replace("\\", "\\\\").replace('"', '\\"'))
python_script = python_script.replace("__ROUTER_PASSWORD__", router_password.replace("\\", "\\\\").replace('"', '\\"'))

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=20)
stdin, stdout, stderr = client.exec_command(
    "python3 - <<'PY'\n" + python_script + "\nPY",
    timeout=180,
)
payload = stdout.read().decode("utf-8", "replace")
errors = stderr.read().decode("utf-8", "replace")
exit_code = stdout.channel.recv_exit_status()
client.close()

if exit_code != 0:
    raise RuntimeError(errors or payload or "remote audit failed")

print(payload)
'@ | python -

if ($LASTEXITCODE -ne 0) {
  throw "audit-mikrotik-ingress Python helper failed."
}

$result = $auditJson | ConvertFrom-Json

if ($ReturnJson) {
  return $result
}

$result | ConvertTo-Json -Depth 12
