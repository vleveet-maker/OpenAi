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
  [string]$RouterLanCidr = "192.168.88.0/24",
  [string]$RelayTargetIp = "192.168.88.2",
  [int]$RelayTargetPort = 80,
  [int]$PublicRelayPort = 80,
  [string]$NatComment = "owmcgp-public-relay-http",
  [switch]$ReturnJson,
  [switch]$WhatIf
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

$env:OWMCGP_APPLY_REMOTE_HOST = $HostName
$env:OWMCGP_APPLY_REMOTE_PORT = "$Port"
$env:OWMCGP_APPLY_REMOTE_USER = $User
$env:OWMCGP_APPLY_REMOTE_PASSWORD = $Password
$env:OWMCGP_APPLY_ROUTER_PUBLIC_IP = $RouterPublicIp
$env:OWMCGP_APPLY_ROUTER_LAN_IP = $RouterLanIp
$env:OWMCGP_APPLY_ROUTER_USER = $RouterUser
$env:OWMCGP_APPLY_ROUTER_PASSWORD = $RouterPassword
$env:OWMCGP_APPLY_ROUTER_LAN_CIDR = $RouterLanCidr
$env:OWMCGP_APPLY_RELAY_TARGET_IP = $RelayTargetIp
$env:OWMCGP_APPLY_RELAY_TARGET_PORT = "$RelayTargetPort"
$env:OWMCGP_APPLY_PUBLIC_RELAY_PORT = "$PublicRelayPort"
$env:OWMCGP_APPLY_NAT_COMMENT = $NatComment
$env:OWMCGP_APPLY_WHATIF = ($(if ($WhatIf) { "true" } else { "false" }))

$applyJson = @'
import json
import os
import paramiko

host = os.environ["OWMCGP_APPLY_REMOTE_HOST"]
port = int(os.environ["OWMCGP_APPLY_REMOTE_PORT"])
user = os.environ["OWMCGP_APPLY_REMOTE_USER"]
password = os.environ["OWMCGP_APPLY_REMOTE_PASSWORD"]
router_public_ip = os.environ["OWMCGP_APPLY_ROUTER_PUBLIC_IP"]
router_lan_ip = os.environ["OWMCGP_APPLY_ROUTER_LAN_IP"]
router_user = os.environ["OWMCGP_APPLY_ROUTER_USER"]
router_password = os.environ["OWMCGP_APPLY_ROUTER_PASSWORD"]
router_lan_cidr = os.environ["OWMCGP_APPLY_ROUTER_LAN_CIDR"]
relay_target_ip = os.environ["OWMCGP_APPLY_RELAY_TARGET_IP"]
relay_target_port = os.environ["OWMCGP_APPLY_RELAY_TARGET_PORT"]
public_relay_port = os.environ["OWMCGP_APPLY_PUBLIC_RELAY_PORT"]
nat_comment = os.environ["OWMCGP_APPLY_NAT_COMMENT"]
what_if = os.environ["OWMCGP_APPLY_WHATIF"].lower() == "true"

python_script = r"""
import json
import requests

router_public_ip = "__ROUTER_PUBLIC_IP__"
router_lan_ip = "__ROUTER_LAN_IP__"
router_user = "__ROUTER_USER__"
router_password = "__ROUTER_PASSWORD__"
router_lan_cidr = "__ROUTER_LAN_CIDR__"
relay_target_ip = "__RELAY_TARGET_IP__"
relay_target_port = "__RELAY_TARGET_PORT__"
public_relay_port = "__PUBLIC_RELAY_PORT__"
nat_comment = "__NAT_COMMENT__"
what_if = __WHAT_IF__

services_to_harden = ["ftp", "telnet", "ssh", "www", "winbox", "api", "api-ssl"]
session = requests.Session()
session.trust_env = False
base = None
auth = (router_user, router_password)
rest_candidates = [f"http://{router_public_ip}/rest", f"http://{router_lan_ip}/rest"]

def pick_rest_base():
    for candidate in rest_candidates:
        try:
            response = session.get(candidate + "/system/resource", auth=auth, timeout=10)
            if response.status_code == 200:
                return candidate
        except Exception:
            continue
    raise RuntimeError("no_working_rest_base")

base = pick_rest_base()

def request_json(method, path, payload=None):
    global base
    ordered = [base] + [candidate for candidate in rest_candidates if candidate != base]
    last_error = None
    for candidate in ordered:
        try:
            response = session.request(method, candidate + path, auth=auth, json=payload, timeout=20)
            response.raise_for_status()
            base = candidate
            return response.json() if response.text else {}
        except Exception as error:
            last_error = error
            continue
    raise last_error

def get_json(path):
    return request_json("GET", path)

def patch(path, payload):
    return request_json("PATCH", path, payload)

def put(path, payload):
    return request_json("PUT", path, payload)

services_before = get_json("/ip/service")
nat_before = get_json("/ip/firewall/nat")

actions = []

service_updates = []
for item in services_before:
    if item.get("dynamic") == "true":
        continue
    if item.get("name") not in services_to_harden:
        continue
    current_address = item.get("address", "")
    if current_address == router_lan_cidr:
        continue
    service_updates.append({
        "id": item[".id"],
        "name": item["name"],
        "before": current_address,
        "after": router_lan_cidr,
    })

nat_rule = None
for item in nat_before:
    if item.get("comment") == nat_comment:
        nat_rule = item
        break

target_nat_payload = {
    "chain": "dstnat",
    "action": "dst-nat",
    "protocol": "tcp",
    "in-interface-list": "WAN",
    "dst-port": str(public_relay_port),
    "to-addresses": relay_target_ip,
    "to-ports": str(relay_target_port),
    "comment": nat_comment,
    "disabled": "false",
}

if nat_rule is None:
    actions.append({
        "type": "create_nat",
        "payload": target_nat_payload,
    })
    if not what_if:
        nat_rule = put("/ip/firewall/nat", target_nat_payload)
else:
    patch_payload = {}
    for key, value in target_nat_payload.items():
        current_value = nat_rule.get(key)
        if str(current_value) != str(value):
            patch_payload[key] = value
    if patch_payload:
        actions.append({
            "type": "patch_nat",
            "id": nat_rule[".id"],
            "payload": patch_payload,
        })
        if not what_if:
            nat_rule = patch(f"/ip/firewall/nat/{nat_rule['.id']}", patch_payload)

for update in service_updates:
    actions.append({
        "type": "patch_service",
        "id": update["id"],
        "name": update["name"],
        "payload": {"address": router_lan_cidr},
    })
    if not what_if:
        patch(f"/ip/service/{update['id']}", {"address": router_lan_cidr})

services_after = get_json("/ip/service")
nat_after = get_json("/ip/firewall/nat")

print(json.dumps({
    "whatIf": what_if,
    "routerLanIp": router_lan_ip,
    "routerPublicIp": router_public_ip,
    "selectedRestBase": base,
    "routerLanCidr": router_lan_cidr,
    "relayTargetIp": relay_target_ip,
    "relayTargetPort": relay_target_port,
    "publicRelayPort": public_relay_port,
    "actions": actions,
    "servicesBefore": services_before,
    "servicesAfter": services_after,
    "natBefore": nat_before,
    "natAfter": nat_after,
}))
"""
python_script = python_script.replace("__ROUTER_PUBLIC_IP__", router_public_ip.replace("\\", "\\\\").replace('"', '\\"'))
python_script = python_script.replace("__ROUTER_LAN_IP__", router_lan_ip.replace("\\", "\\\\").replace('"', '\\"'))
python_script = python_script.replace("__ROUTER_USER__", router_user.replace("\\", "\\\\").replace('"', '\\"'))
python_script = python_script.replace("__ROUTER_PASSWORD__", router_password.replace("\\", "\\\\").replace('"', '\\"'))
python_script = python_script.replace("__ROUTER_LAN_CIDR__", router_lan_cidr.replace("\\", "\\\\").replace('"', '\\"'))
python_script = python_script.replace("__RELAY_TARGET_IP__", relay_target_ip.replace("\\", "\\\\").replace('"', '\\"'))
python_script = python_script.replace("__RELAY_TARGET_PORT__", relay_target_port)
python_script = python_script.replace("__PUBLIC_RELAY_PORT__", public_relay_port)
python_script = python_script.replace("__NAT_COMMENT__", nat_comment.replace("\\", "\\\\").replace('"', '\\"'))
python_script = python_script.replace("__WHAT_IF__", "True" if what_if else "False")

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
    raise RuntimeError(errors or payload or "remote MikroTik apply failed")

print(payload)
'@ | python -

if ($LASTEXITCODE -ne 0) {
  throw "apply-mikrotik-public-ingress Python helper failed."
}

$result = $applyJson | ConvertFrom-Json

if ($ReturnJson) {
  return $result
}

$result | ConvertTo-Json -Depth 12
