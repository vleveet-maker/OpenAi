# Windows Public API Block

## Purpose

This mode runs both parts on the same Windows Server:

- the Windows browser block with local ChatGPT workers
- the public relay/API layer from `services/control-api`

This removes the Linux relay dependency and removes reverse SSH tunnels from the critical path.

Important live truth on `2026-03-31`:

- the preserve-first public-owner conflict is now resolved
- real public `77.66.186.75` is deliberately owned by Ubuntu `nginx`
- that Ubuntu public owner now proxies the API contract to the preserved Windows `Caddy` edge on `192.168.88.250`
- the Windows host remains the runtime/API owner behind that Ubuntu edge

Important preserve-first truth:

- on a deployed Windows Server with valuable live accounts, do not expose raw `:4010` directly to the network first
- prefer `Caddy` on `80/443` and keep the relay/API on loopback (`127.0.0.1:4011` for shadow, `127.0.0.1:4010` for promoted)
- treat `host-controller` (`4040`) and worker-agent ports as internal-only

## Recommended Topology

1. Windows Server hosts:
   - browser workers
   - `host-controller`
   - `control-api` in `remote_relay` mode
2. `control-api` listens on loopback only
3. Windows `Caddy` owns the preserved LAN-side edge and reverse-proxies to `127.0.0.1:4011` during shadow validation or `127.0.0.1:4010` after promotion
4. Ubuntu `nginx` owns public `77.66.186.75` and forwards the public API routes to the Windows edge over LAN HTTP with forced `Host: 77.66.186.75`
5. MikroTik forwards public `80/443` to the Ubuntu owner

## Local Ports

- browser block host-controller: `127.0.0.1:4040`
- worker agents: `127.0.0.1:4021..`
- shadow relay/API target: `127.0.0.1:4011`
- promoted relay/API target: `127.0.0.1:4010`
- preserved Windows edge owner: `Caddy` on `80/443`
- real public owner: Ubuntu `nginx` on `77.66.186.75`

## One-Time Bootstrap

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\bootstrap-browser-block.ps1
```

Create the local API settings file:

```text
infra\data\control-api\remote-relay.local.json
```

Use this template:

```json
{
  "apiToken": "replace-with-strong-random-token",
  "listenHost": "127.0.0.1",
  "listenPort": 4010,
  "defaultWorkerId": "",
  "allowedWorkerIds": [],
  "requestTimeoutMs": 180000
}
```

## Preserve-First Edge Freeze

Before any public API promotion on a live Windows Server, capture a backup and audit of the current edge:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\backup-public-edge-state.ps1
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\collect-public-edge-audit.ps1
```

These helpers store:

- listener ownership for `80`, `443`, `4010`, `4040`
- current `Caddy` service/config truth
- a backup copy of the active `Caddy` config when it can be found

## Start Order

1. Start the browser block:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-browser-block.ps1
```

2. Log in to the required ChatGPT accounts on that Windows Server
3. Start the public API on loopback:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-public-api.ps1 -ListenHost 127.0.0.1 -ListenPort 4010
```

4. Probe the API:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\probe-public-api.ps1 -BaseUrl http://127.0.0.1:4010
```

`probe-public-api.ps1` is also the preserve-first truth tool for the final public edge:

- it can be pointed at `http://...` or `https://...`
- it now returns structured `errorKind` values such as `tls_handshake_failed`, `http_error`, `connection_refused`, and `timeout`
- use it to record exact edge truth instead of treating every failed public probe as the same generic outage

## Preserve-First Shadow Cutover

If the server already has valuable logged-in workers, do not start with the final public port.

Start with a shadow port and an allowlisted canary worker:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-public-api.ps1 -ListenHost 127.0.0.1 -ListenPort 4011 -AllowedWorkerIds shared-6
```

Probe the shadow path:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\probe-public-api.ps1 -BaseUrl http://127.0.0.1:4011 -IncludeChatProbe -WorkerId shared-6 -EnsureWorkerStarted -StopWorkerWhenDone
```

Reconcile the Windows edge to the shadow path:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\activate-public-edge.ps1 -Mode shadow -Apply
```

Then widen to a subset only if the canary passes:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-public-api.ps1 -ListenHost 127.0.0.1 -ListenPort 4011 -AllowedWorkerIds shared-5,shared-6,shared-7
```

Only after that start the promoted loopback API and switch the edge to it:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-public-api.ps1 -ListenHost 127.0.0.1 -ListenPort 4010
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\activate-public-edge.ps1 -Mode promoted -Apply
```

If the promoted edge fails, roll back the edge config before touching more workers:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\rollback-public-edge.ps1 -BackupPath <BACKUP_PATH>
```

Important truth:

- `start-public-api.ps1` starts only the API layer
- `probe-public-api.ps1` is the safe canary entry when you want one allowlisted worker to be started, validated, and stopped again through `host-controller`
- `activate-public-edge.ps1` and `rollback-public-edge.ps1` only manage the Windows edge
- for a deployed server with valuable logged-in accounts, prefer this canary path over a blind full-pool start

## Public Ingress

Current preserve-first live shape:

- MikroTik `dst-nat` public `80/443` -> Ubuntu owner host
- Ubuntu `nginx` owns raw public `77.66.186.75`
- Ubuntu then proxies:
  - `/healthz`
  - `/api/relay/*`
  - `/v1/*`
  to the preserved Windows edge over `http://192.168.88.250`
- Ubuntu forces upstream `Host: 77.66.186.75` so the preserved Windows `Caddy` edge serves the correct contract without exposing raw Windows internals

Internal preserved shape on Windows:

- Windows `Caddy` -> `127.0.0.1:4011` during shadow validation
- Windows `Caddy` -> `127.0.0.1:4010` after promotion

Then outside clients can use:

```text
http://PUBLIC_IP/v1/models
http://PUBLIC_IP/v1/chat/completions
```

If the final contract is being reconciled toward HTTPS, probe that explicitly instead of assuming it:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\probe-public-api.ps1 -BaseUrl https://PUBLIC_IP
```

Important truth:

- if `https://PUBLIC_IP` fails certificate trust on a normal client, that is now certificate debt, not owner-path ambiguity
- the current live preserve-first HTTPS shape works functionally, but still uses a non-consumer-trusted certificate path

## What This Avoids

- no Linux browser runtime
- no reverse SSH tunnels
- no dependency on another machine staying online
- no raw public exposure of `4040` or worker-agent ports
- no blind overwrite of a live Windows edge without rollback

## What Still Requires Manual Work

- ChatGPT login on the Windows Server browser profiles
- browser/runtime drift handling when ChatGPT UI changes
- staged preserve-first rollout discipline when the server already contains live accounts
- one direct Windows admin session to run the backup/audit/activate/rollback steps on that host

## Phase 11 Rollout Smoke

The canonical Phase 11 smoke on the live public-owner path is now:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\test-rollout-smoke.ps1 `
  -PublicBaseUrl http://77.66.186.75 `
  -InternalBaseUrl http://127.0.0.1:8081 `
  -HostControllerBaseUrl http://127.0.0.1:4040 `
  -CanaryWorkerId shared-6 `
  -OutputJsonPath .\.planning\phases\11-rollout-smoke-confidence\11-SMOKE-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\11-rollout-smoke-confidence\11-SMOKE-SUMMARY.md
```

What this smoke checks:

- current host-pool readiness through the internal operator routes
- public `GET /healthz`
- public `GET /v1/models`
- one canary `POST /v1/chat/completions` on `shared-6`

What this smoke does not prove:

- it does not widen the public worker set beyond the canary by itself
- it does not replace consumer-trusted HTTPS certificate hardening
- it does not reopen public-owner reconciliation work that was already closed
