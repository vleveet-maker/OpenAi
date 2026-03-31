[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$WorkerId,
  [string]$HostName = "77.66.186.75",
  [int]$Port = 2222,
  [string]$User = "mi50",
  [string]$Password = "",
  [string]$RelayBaseUrl = "",
  [ValidateSet("RemoteLocal", "External")]
  [string]$RelayPathMode = "RemoteLocal",
  [string]$HostControllerBaseUrl = "http://127.0.0.1:4040",
  [string]$HostControllerToken = "local-host-controller-token",
  [string]$RequestedForLabel = "Remote relay worker smoke",
  [int]$TimeoutSeconds = 180,
  [switch]$KeepWorkerRunning,
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

if ([string]::IsNullOrWhiteSpace($RelayBaseUrl)) {
  $resolvedRelayBaseUrl = "http://$HostName"
} else {
  $resolvedRelayBaseUrl = $RelayBaseUrl.TrimEnd("/")
}

$workerPorts = @{
  "dad"      = @{ Agent = 4021; Remote = 14021 }
  "wife"     = @{ Agent = 4022; Remote = 14022 }
  "shared-1" = @{ Agent = 4023; Remote = 14023 }
  "shared-2" = @{ Agent = 4024; Remote = 14024 }
  "shared-3" = @{ Agent = 4025; Remote = 14025 }
  "shared-4" = @{ Agent = 4026; Remote = 14026 }
  "shared-5" = @{ Agent = 4027; Remote = 14027 }
}

if (-not $workerPorts.ContainsKey($WorkerId)) {
  throw "Unsupported workerId '$WorkerId'."
}

$portSpec = $workerPorts[$WorkerId]
$env:OWMCGP_REMOTE_SMOKE_HOST = $HostName
$env:OWMCGP_REMOTE_SMOKE_PORT = "$Port"
$env:OWMCGP_REMOTE_SMOKE_USER = $User
$env:OWMCGP_REMOTE_SMOKE_PASSWORD = $Password
$env:OWMCGP_REMOTE_SMOKE_WORKER_ID = $WorkerId
$env:OWMCGP_REMOTE_SMOKE_LOCAL_AGENT_PORT = "$($portSpec.Agent)"
$env:OWMCGP_REMOTE_SMOKE_REMOTE_PORT = "$($portSpec.Remote)"
$env:OWMCGP_REMOTE_SMOKE_RELAY_BASE = $resolvedRelayBaseUrl
$env:OWMCGP_REMOTE_SMOKE_RELAY_MODE = $RelayPathMode
$env:OWMCGP_REMOTE_SMOKE_HOST_CONTROLLER = $HostControllerBaseUrl.TrimEnd("/")
$env:OWMCGP_REMOTE_SMOKE_HOST_TOKEN = $HostControllerToken
$env:OWMCGP_REMOTE_SMOKE_TIMEOUT = "$TimeoutSeconds"
$env:OWMCGP_REMOTE_SMOKE_LABEL = $RequestedForLabel
$env:OWMCGP_REMOTE_SMOKE_KEEP = $(if ($KeepWorkerRunning) { "1" } else { "0" })

$resultJson = @'
import json
import os
import socket
import threading
import time
import urllib.error
import urllib.request

import paramiko

host = os.environ["OWMCGP_REMOTE_SMOKE_HOST"]
port = int(os.environ["OWMCGP_REMOTE_SMOKE_PORT"])
user = os.environ["OWMCGP_REMOTE_SMOKE_USER"]
password = os.environ["OWMCGP_REMOTE_SMOKE_PASSWORD"]
worker_id = os.environ["OWMCGP_REMOTE_SMOKE_WORKER_ID"]
local_agent_port = int(os.environ["OWMCGP_REMOTE_SMOKE_LOCAL_AGENT_PORT"])
remote_port = int(os.environ["OWMCGP_REMOTE_SMOKE_REMOTE_PORT"])
relay_base = os.environ["OWMCGP_REMOTE_SMOKE_RELAY_BASE"].rstrip("/")
relay_mode = os.environ["OWMCGP_REMOTE_SMOKE_RELAY_MODE"]
host_controller_base = os.environ["OWMCGP_REMOTE_SMOKE_HOST_CONTROLLER"].rstrip("/")
host_controller_token = os.environ["OWMCGP_REMOTE_SMOKE_HOST_TOKEN"]
timeout_seconds = int(os.environ["OWMCGP_REMOTE_SMOKE_TIMEOUT"])
requested_for_label = os.environ["OWMCGP_REMOTE_SMOKE_LABEL"]
keep_worker_running = os.environ["OWMCGP_REMOTE_SMOKE_KEEP"] == "1"
expected_reply = f"{worker_id}-remote-ok"

def request_json(method, url, headers=None, body=None, timeout=30):
    payload = None
    local_headers = dict(headers or {})
    if body is not None:
        payload = json.dumps(body).encode("utf-8")
        local_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=payload, headers=local_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8", "replace")
        detail = raw
        try:
            detail = json.loads(raw)
        except Exception:
            pass
        raise RuntimeError(json.dumps({
            "status": error.code,
            "detail": detail
        }, ensure_ascii=False))

def wait_until(description, predicate):
    deadline = time.time() + timeout_seconds
    last_error = None
    while time.time() < deadline:
        try:
            result = predicate()
            if result:
                return result
        except Exception as error:
            last_error = error
        time.sleep(1.0)
    if last_error is not None:
        raise RuntimeError(f"Timed out waiting for {description}: {last_error}")
    raise RuntimeError(f"Timed out waiting for {description}")

def run_remote(client, command, timeout=40):
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace").strip()
    err = stderr.read().decode("utf-8", "replace").strip()
    exit_status = stdout.channel.recv_exit_status()
    return exit_status, out, err

def request_remote_relay(client, method, path, token, body=None, timeout=60):
    payload_expression = (
        "None"
        if body is None
        else "json.loads({0})".format(json.dumps(json.dumps(body)))
    )
    command = (
        "python3 - <<'PY'\n"
        + "import json\n"
        + "import urllib.error\n"
        + "import urllib.request\n"
        + f"method = {json.dumps(method)}\n"
        + f"url = {json.dumps('http://127.0.0.1:4010' + path)}\n"
        + f"token = {json.dumps(token)}\n"
        + f"payload = {payload_expression}\n"
        + "data = None if payload is None else json.dumps(payload).encode('utf-8')\n"
        + "headers = {'Authorization': 'Bearer ' + token}\n"
        + "if payload is not None:\n"
        + "    headers['Content-Type'] = 'application/json'\n"
        + "request = urllib.request.Request(url, data=data, headers=headers, method=method)\n"
        + "try:\n"
        + "    with urllib.request.urlopen(request, timeout="
        + str(timeout)
        + ") as response:\n"
        + "        print(json.dumps({'ok': True, 'status': response.status, 'body': json.loads(response.read().decode())}))\n"
        + "except urllib.error.HTTPError as error:\n"
        + "    raw = error.read().decode('utf-8', 'replace')\n"
        + "    detail = raw\n"
        + "    try:\n"
        + "        detail = json.loads(raw)\n"
        + "    except Exception:\n"
        + "        pass\n"
        + "    print(json.dumps({'ok': False, 'status': error.code, 'detail': detail}))\n"
        + "except Exception as error:\n"
        + "    print(json.dumps({'ok': False, 'status': None, 'detail': str(error)}))\n"
        + "PY"
    )
    status, out, err = run_remote(client, command, timeout=max(timeout, 90))
    if status != 0:
        raise RuntimeError(err or out or "remote relay request failed")
    payload = json.loads(out)
    if not payload.get("ok"):
        raise RuntimeError(json.dumps({
            "status": payload.get("status"),
            "detail": payload.get("detail")
        }, ensure_ascii=False))
    return payload["status"], payload["body"]

def socket_bridge(channel, local_host, local_port):
    target = socket.create_connection((local_host, local_port))
    try:
        channel.settimeout(1.0)
        target.settimeout(1.0)
        while True:
            try:
                data = channel.recv(65535)
                if data:
                    target.sendall(data)
                elif channel.closed:
                    break
            except socket.timeout:
                pass

            try:
                data = target.recv(65535)
                if data:
                    channel.sendall(data)
                else:
                    break
            except socket.timeout:
                pass

            if channel.closed:
                break
    finally:
        try:
            channel.close()
        except Exception:
            pass
        try:
            target.close()
        except Exception:
            pass

def start_reverse_tunnel(transport, remote_port_number, local_port_number):
    stop_event = threading.Event()
    transport.request_port_forward("127.0.0.1", remote_port_number)
    threads = []

    def loop():
        while not stop_event.is_set():
            channel = transport.accept(1000)
            if channel is None:
                continue
            thread = threading.Thread(
                target=socket_bridge,
                args=(channel, "127.0.0.1", local_port_number),
                daemon=True
            )
            thread.start()
            threads.append(thread)

    thread = threading.Thread(target=loop, daemon=True)
    thread.start()
    return stop_event, thread, threads

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=15)
sudo_prefix = "echo '{0}' | sudo -S -p '' ".format(password.replace("'", "'\"'\"'"))

token_status, token_out, token_err = run_remote(
    client,
    sudo_prefix + "sed -n '1,120p' /etc/owmcgp/remote-relay.env"
)
if token_status != 0 or not token_out:
    raise RuntimeError(f"Failed to read remote relay token: {token_err or token_out}")
api_token = ""
for line in token_out.splitlines():
    if line.startswith("REMOTE_RELAY_API_TOKEN="):
        api_token = line.split("=", 1)[1].strip()
        break

if not api_token:
    raise RuntimeError("Failed to parse remote relay token from /etc/owmcgp/remote-relay.env")

transport = client.get_transport()
stop_event = None
loop_thread = None
forward_threads = []
session_id = None

result = {
    "workerId": worker_id,
    "classification": "relay_failed",
    "failureCode": "uninitialized",
    "detail": None
}

try:
    request_json(
        "POST",
        f"{host_controller_base}/workers/{worker_id}/start",
        headers={"x-host-controller-token": host_controller_token},
        body={
            "runtimeMode": "visible_auth",
            "profileStrategy": "durable",
            "browserWindowMode": "CompactCorner"
        },
        timeout=30
    )

    wait_until(
        "worker reachability",
        lambda: next(
            (
                worker
                for worker in request_json(
                    "GET",
                    f"{host_controller_base}/health",
                    headers={"x-host-controller-token": host_controller_token},
                    timeout=10
                )[1]["workers"]
                if worker["workerId"] == worker_id
                and worker["agentListening"]
                and worker["browserListening"]
            ),
            None
        )
    )

    stop_event, loop_thread, forward_threads = start_reverse_tunnel(
        transport,
        remote_port,
        local_agent_port
    )

    if relay_mode == "RemoteLocal":
        request_remote_relay(client, "GET", "/api/relay/health", api_token, timeout=20)
        status, ask_response = request_remote_relay(
            client,
            "POST",
            "/api/relay/ask",
            api_token,
            body={
                "requestedForLabel": requested_for_label,
                "workerId": worker_id,
                "newDialog": True,
                "messageText": f"Please reply with exactly: {expected_reply}",
                "timeoutMs": timeout_seconds * 1000
            },
            timeout=timeout_seconds + 15
        )
    else:
        health_headers = {"Authorization": f"Bearer {api_token}"}
        request_json("GET", f"{relay_base}/api/relay/health", headers=health_headers, timeout=20)
        status, ask_response = request_json(
            "POST",
            f"{relay_base}/api/relay/ask",
            headers=health_headers,
            body={
                "requestedForLabel": requested_for_label,
                "workerId": worker_id,
                "newDialog": True,
                "messageText": f"Please reply with exactly: {expected_reply}",
                "timeoutMs": timeout_seconds * 1000
            },
            timeout=timeout_seconds + 15
        )
    session_id = ask_response.get("dialogId")

    if ask_response.get("assistantReplyText") != expected_reply:
        raise RuntimeError(
            f"Unexpected assistant reply: {ask_response.get('assistantReplyText')!r}"
        )

    result = {
        "workerId": worker_id,
        "classification": "usable",
        "failureCode": None,
        "detail": None,
        "dialogId": session_id,
        "assistantReplyText": ask_response.get("assistantReplyText"),
        "conversationMode": ask_response.get("conversationMode"),
        "modelLabel": ask_response.get("modelLabel"),
        "relayResult": ask_response.get("relayResult"),
        "relayBaseUrl": relay_base,
        "relayPathMode": relay_mode
    }
except Exception as error:
    detail = str(error)
    classification = "relay_failed"
    failure_code = "relay_failed"
    if "chat_bootstrap_failed" in detail:
      classification = "bootstrap_failed"
      failure_code = "chat_bootstrap_failed"
      if "bootstrap_auth_required" in detail:
          classification = "auth_required"
          failure_code = "bootstrap_auth_required"
      elif "bootstrap_navigation_failed" in detail:
          failure_code = "bootstrap_navigation_failed"
    elif "dialog_activation_timeout" in detail:
      classification = "bootstrap_failed"
      failure_code = "dialog_activation_timeout"
    result = {
        "workerId": worker_id,
        "classification": classification,
        "failureCode": failure_code,
        "detail": detail,
        "relayBaseUrl": relay_base,
        "relayPathMode": relay_mode
    }
finally:
    if session_id:
        try:
            if relay_mode == "RemoteLocal":
                request_remote_relay(
                    client,
                    "POST",
                    f"/api/relay/dialogs/{session_id}/end",
                    api_token,
                    timeout=20
                )
            else:
                request_json(
                    "POST",
                    f"{relay_base}/api/relay/dialogs/{session_id}/end",
                    headers={"Authorization": f"Bearer {api_token}"},
                    timeout=20
                )
        except Exception:
            pass

    if stop_event is not None:
        stop_event.set()
    try:
        transport.cancel_port_forward("127.0.0.1", remote_port)
    except Exception:
        pass
    if loop_thread is not None:
        loop_thread.join(timeout=2)
    for thread in forward_threads:
        thread.join(timeout=1)

    if not keep_worker_running:
        try:
            request_json(
                "POST",
                f"{host_controller_base}/workers/{worker_id}/stop",
                headers={"x-host-controller-token": host_controller_token},
                body={},
                timeout=20
            )
        except Exception:
            pass

    client.close()

print(json.dumps(result))
'@ | python -

if ($LASTEXITCODE -ne 0) {
  throw "test-remote-relay-worker Python helper failed."
}

if ($ReturnJson) {
  return ($resultJson | ConvertFrom-Json)
}

$resultJson
