# Remote Relay Server

## What This Is

`owmcgp-remote-relay` is the extracted relay/session/bootstrap orchestration service. It runs on the dedicated Linux host and exposes a narrow bearer-auth relay API. The proven browser runtime is still separate-host: compact-visible Windows workers are reached from the server through reverse SSH tunnels.

This is important:

- the Linux server already hosts the relay service
- the browser workers do not live on that Linux host
- outside-client API readiness is now primarily about keeping the deliberate public edge clean and documented, not about whether the relay code runs
- if the Windows worker host is powered off, public health routes can still answer but real chat completions cannot

## Current Proven Topology

Verified topology on `2026-03-29`:

1. `owmcgp-remote-relay` runs on `77.66.186.75`
2. the relay process itself listens only on `127.0.0.1:4010`
3. `nginx` fronts that local relay on the server
4. Windows workers such as `wife` or `shared-2` run in `compact visible`
5. the Linux server reaches those workers through server-local forwarded ports such as `127.0.0.1:14022`
6. those forwarded ports are provided by reverse SSH tunnels from the Windows worker host

Topology verdict:

- `same-host Linux browser runtime`: not proven
- `separate-host runtime via reverse tunnel`: proven
- `compact visible` is the current proven worker runtime baseline

## Server Migration Status

Server-hosted browser runtime migration is currently paused and reverted.

Current truth on 2026-03-30:

- the Linux host still runs only the relay/API layer
- server-local browser workers are not active
- server-side VNC and browser-viewer routes are not part of the live path
- the current runtime baseline is again the separate Windows browser block reached through reverse SSH tunnels

## Windows Block Runtime

The active browser runtime is a separate Windows block.

Current operational shape:

- the Linux relay reaches workers through `127.0.0.1:14021..14027`
- those forwarded ports are provided by reverse SSH tunnels from the Windows browser block
- browser login, recovery, and runtime proof happen on the Windows side, not on the Linux host

Windows block deployment and startup assets now live here:

- [windows-browser-block.md](d:/OpenAi/docs/windows-browser-block.md)
- [start-browser-block.ps1](d:/OpenAi/infra/windows-block/start-browser-block.ps1)
- [start-reverse-tunnels.ps1](d:/OpenAi/infra/windows-block/start-reverse-tunnels.ps1)
- [register-browser-block-tasks.ps1](d:/OpenAi/infra/windows-block/register-browser-block-tasks.ps1)

Current deployment truth:

- the Windows browser block is now packaged and handoff-ready for Windows Server
- a fresh direct local proof on 2026-03-30 reached `7/7 usable`
- the actual dedicated Windows Server cutover is still a separate infrastructure move and is not being faked in this document

## Manual Login

Manual login and reauthentication currently happen only on the Windows browser block.

Direct profile copy from the Windows host to Linux is still treated as unsupported because the current local profiles are Windows-encrypted browser profiles.

## Remote Layout

- service name: `owmcgp-remote-relay`
- app dir: `/opt/owmcgp-remote-relay`
- env file: `/etc/owmcgp/remote-relay.env`
- data dir: `/srv/owmcgp-remote-relay`
- systemd unit: `/etc/systemd/system/owmcgp-remote-relay.service`
- raw relay bind: `127.0.0.1:4010`

## Required Environment

At minimum:

```env
CONTROL_API_NAME=owmcgp-remote-relay
CONTROL_API_MODE=remote_relay
CONTROL_API_HOST=127.0.0.1
CONTROL_API_PORT=4010
REMOTE_RELAY_API_TOKEN=<secret>
REMOTE_RELAY_REQUEST_TIMEOUT_MS=180000
REMOTE_RELAY_TOPOLOGY_HINT=separate_host_runtime_via_reverse_tunnel
SESSION_DB_PATH=/srv/owmcgp-remote-relay/session-routing.sqlite
AUTO_START_HOST_WORKERS=false
WORKER_DEFINITIONS=<json array with server-local forwarded worker ports>
```

`REMOTE_RELAY_API_TOKEN` lives only in the server env file and must not be committed.

## Repeatable Server Verification

Use this known operator path instead of improvising ad-hoc SSH checks:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\remote\verify-remote-relay.ps1 -Password <ssh-password>
```

That script checks four different truths separately:

- systemd truth
- raw relay truth on the server
- nginx/edge truth on the server
- outside-caller ingress truth from the operator machine

This distinction matters. The relay service can be healthy while public ingress is still blocked.

## Deliberate Public Boundary

The public boundary is no longer the raw `:4010` process socket.

The deliberate front door is the server `nginx` config:

- config file: `infra/remote/nginx/owmcgp-remote-relay.conf`
- server-local health:
  - `http://127.0.0.1/healthz`
  - `http://127.0.0.1:8080/healthz`
- proxied relay routes:
  - `/api/relay/*`
  - `/v1/*`

The relay process stays behind that edge on `127.0.0.1:4010`.

## Public API

All outside-client relay routes require:

```http
Authorization: Bearer <REMOTE_RELAY_API_TOKEN>
```

Only these routes are public:

- `GET /api/relay/health`
- `POST /api/relay/ask`
- `POST /api/relay/dialogs/:dialogId/end`
- `GET /v1/models`
- `POST /v1/chat/completions`

These are not public API:

- internal admin routes
- internal worker routes
- runtime-control routes
- reverse-tunnel or worker-agent details

## OpenAI-Compatible API

For easier trials with third-party clients, the relay also exposes an OpenAI-compatible surface behind the same bearer token.

Base URL:

```text
http://77.66.186.75
```

Compatible routes:

- `GET /v1/models`
- `POST /v1/chat/completions`

Current behavior:

- by default a new `POST /v1/chat/completions` call is single-turn and closes its dialog after the reply
- this server may also pin fresh public requests to a configured default worker internally, so outside clients do not need to send `worker_id`
- fresh requests now retry across other reachable workers when the first worker fails during fresh-chat bootstrap or relay
- if you want to continue the same dialog later, send `keep_dialog_open: true` on the first call
- a follow-up call with `conversation_id` continues that same dialog
- only non-streaming text requests are supported right now
- image parts and streaming are not supported yet

### `GET /v1/models`

Example:

```http
GET /v1/models
Authorization: Bearer <REMOTE_RELAY_API_TOKEN>
```

Example response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "owmcgp-browser",
      "object": "model",
      "owned_by": "owmcgp"
    },
    {
      "id": "gpt-5.4-thinking",
      "object": "model",
      "owned_by": "owmcgp"
    }
  ]
}
```

### `POST /v1/chat/completions`

Fresh dialog:

```json
{
  "model": "owmcgp-browser",
  "messages": [
    {
      "role": "user",
      "content": "Please reply with exactly: api-ok"
    }
  ]
}
```

Example response:

```json
{
  "id": "chatcmpl_...",
  "object": "chat.completion",
  "model": "owmcgp-browser",
  "actual_model_label": "GPT-5.4 Thinking",
  "conversation_id": null,
  "dialog_closed": true,
  "worker_id": "wife",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "api-ok"
      },
      "finish_reason": "stop"
    }
  ]
}
```

Continue the same dialog:

```json
{
  "model": "owmcgp-browser",
  "keep_dialog_open": true,
  "conversation_id": "0d8b8c6f-7e8d-4bf8-bf55-ccf8d7d6f0b1",
  "messages": [
    {
      "role": "user",
      "content": "Please reply with exactly: second-ok"
    }
  ]
}
```

Optional extensions for operator/debug use:

- `keep_dialog_open`
- `worker_id`
- `timeout_ms`
- `user`

These are relay-specific extensions, not generic OpenAI fields.

### `GET /api/relay/health`

Example:

```http
GET /api/relay/health
Authorization: Bearer <REMOTE_RELAY_API_TOKEN>
```

Example response:

```json
{
  "ok": true,
  "service": "owmcgp-remote-relay",
  "mode": "remote_relay",
  "topology": "separate_host_runtime_via_reverse_tunnel",
  "workerCount": 6
}
```

### Fresh Dialog: `POST /api/relay/ask`

Example request:

```json
{
  "requestedForLabel": "outside-client",
  "dialogId": null,
  "newDialog": true,
  "messageText": "Please reply with exactly: api-ok",
  "timeoutMs": 180000
}
```

Example response:

```json
{
  "dialogId": "0d8b8c6f-7e8d-4bf8-bf55-ccf8d7d6f0b1",
  "sessionId": "0d8b8c6f-7e8d-4bf8-bf55-ccf8d7d6f0b1",
  "workerId": "wife",
  "conversationMode": "temporary",
  "modelLabel": "GPT-5.4 Thinking",
  "assistantReplyText": "api-ok",
  "relayResult": {
    "status": "completed",
    "attemptCount": 1,
    "lastFailureCode": null
  }
}
```

### Continue Existing Dialog: `POST /api/relay/ask`

Example request:

```json
{
  "dialogId": "0d8b8c6f-7e8d-4bf8-bf55-ccf8d7d6f0b1",
  "newDialog": false,
  "messageText": "Please reply with exactly: second-ok",
  "timeoutMs": 180000
}
```

### End Dialog: `POST /api/relay/dialogs/:dialogId/end`

Example request:

```http
POST /api/relay/dialogs/0d8b8c6f-7e8d-4bf8-bf55-ccf8d7d6f0b1/end
Authorization: Bearer <REMOTE_RELAY_API_TOKEN>
```

Example response:

```json
{
  "dialogId": "0d8b8c6f-7e8d-4bf8-bf55-ccf8d7d6f0b1",
  "sessionId": "0d8b8c6f-7e8d-4bf8-bf55-ccf8d7d6f0b1",
  "state": "ended",
  "endReason": "manual_end"
}
```

### Optional `workerId`

`POST /api/relay/ask` also accepts optional `workerId` on a fresh dialog:

```json
{
  "requestedForLabel": "operator-check",
  "workerId": "shared-2",
  "dialogId": null,
  "newDialog": true,
  "messageText": "Please reply with exactly: worker-ok"
}
```

This is intended for operator verification, targeted debugging, and worker-by-worker audits. Ordinary outside callers do not need it.

## Current Verified Worker Truth

Latest remote-relay matrix through the real remote topology:

- `usable`: `dad`, `wife`, `shared-1`, `shared-2`, `shared-3`, `shared-4`
- `relay_failed`: none in the latest rerun

That means the remote service itself is working and the latest worker rerun is currently `6/6 usable` on the already-authenticated pool.

`shared-5` is now provisioned locally as the seventh worker slot with planned server-local forwarded port `127.0.0.1:14027`, but it is not part of the proven remote matrix until it has its own manual login plus remote smoke.

## Current Public Ingress Truth

Here is the honest current state after MikroTik NAT hardening on `2026-03-29`:

- server-local `nginx` works
- server-local relay health works
- `nginx` fronts `/api/relay/*` to `127.0.0.1:4010`
- outside clients now reach the deliberate public edge on `http://77.66.186.75`
- invalid bearer on `GET /api/relay/health` now reaches the relay boundary and returns `403 remote_relay_forbidden`

Observed facts:

- operator-machine `GET http://77.66.186.75/healthz` -> `200`
- operator-machine `GET http://77.66.186.75/api/relay/health` with invalid bearer -> `403`
- remote verification with the real bearer token now reports `externalPublicIngressHealth -> 200`
- raw `http://77.66.186.75:4010/...` still times out, which is intentional

Important nuance:

- the Linux relay host itself lives on the MikroTik LAN as `192.168.88.2`
- a server-side self-call to `http://77.66.186.75/...` can still see RouterOS-local behavior
- because of that, server self-calls are no longer the authority for public-ingress truth
- the authority is an outside-client probe

Operational verdict:

- deliberate ingress now works for outside callers
- raw `:4010` remains private
- router management services are restricted to `192.168.88.0/24`

So today the service is:

- ready for server-local use
- ready for outside-client use through the deliberate port-`80` edge
- not exposing raw relay process sockets as the public contract

## Deployment Flow

Recommended flow now has three parts:

1. deploy or refresh the Linux relay service
2. deploy or refresh the deliberate `nginx` edge
3. provide runtime reachability from the Windows worker host

### 1. Deploy the Relay Service

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\remote\deploy-remote-relay.ps1 `
  -HostName 77.66.186.75 `
  -Port 2222 `
  -User mi50 `
  -LinuxBundlePath .\infra\remote\cache\control-api-remote-relay-linux.tar.gz `
  -RemoteRelayApiToken <secret> `
  -WorkerDefinitionsJson <json> `
  -TopologyHint separate_host_runtime_via_reverse_tunnel `
  -ControlApiHost 127.0.0.1 `
  -EnableService
```

### 2. Deploy the Edge

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\remote\deploy-public-ingress.ps1 -Password <ssh-password>
```

### 3. Audit One Worker Through the Real Remote Topology

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\remote\test-remote-relay-worker.ps1 -WorkerId wife -Password <ssh-password>
```

That path:

- opens only one worker locally as needed
- creates the reverse tunnel
- hits the real Linux relay
- closes the dialog
- closes the worker window again unless told otherwise
