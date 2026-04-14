# Remote Relay Server

## Current Live Truth

`phase27-ubuntu-ssh-recovery-v1`

The remote relay host is Ubuntu. The relay/API process is local-only and the public edge is owned by Ubuntu `nginx`.

Canonical path:

`internet -> MikroTik -> Ubuntu nginx -> 127.0.0.1:4010`

The Windows browser block is still separate-host runtime. Ubuntu reaches those workers through reverse SSH tunnels.

## Active Ownership

- relay/API bind: `127.0.0.1:4010`
- public ingress owner: Ubuntu `nginx`
- public routes: `/healthz`, `/api/relay/*`, `/v1/*`
- browser runtime owner: Windows browser-block host
- tunnel listener set on Ubuntu: `127.0.0.1:14021..14027` and `127.0.0.1:14040`

Windows `Caddy` is not part of the active public path.

## Required Environment

The relay service still runs with the usual `remote_relay` mode:

```env
CONTROL_API_NAME=owmcgp-remote-relay
CONTROL_API_MODE=remote_relay
CONTROL_API_HOST=127.0.0.1
CONTROL_API_PORT=4010
REMOTE_RELAY_API_TOKEN=<secret>
REMOTE_RELAY_REQUEST_TIMEOUT_MS=180000
REMOTE_RELAY_TOPOLOGY_HINT=separate_host_runtime_via_reverse_tunnel
```

## Current Public Expectations

- `http://77.66.186.75/healthz` should return `200`
- `http://77.66.186.75/v1/models` should return `401` without a bearer token
- authenticated `GET /v1/models` should return live model ids such as:
  - `owmcgp-browser`
  - `gpt-5.4-thinking`
  - `chatgpt-browser-gpt-5.4-thinking`
- authenticated `POST /v1/chat/completions` with `model=owmcgp-browser` should return `200` when tunnels are healthy

## Server Checks

Run these checks on Ubuntu:

```bash
curl -i http://127.0.0.1:4010/healthz
curl -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:4010/v1/models
sudo nginx -T | egrep -n 'server_name|listen|proxy_pass|4010|192\.168\.88\.250'
ss -ltnH | egrep '14021|14022|14023|14024|14025|14026|14027|14040'
```

Healthy truth means:

- `proxy_pass http://127.0.0.1:4010` is present for `80/443/8080`
- stale `proxy_pass http://192.168.88.250` is absent
- tunnel listeners are present on Ubuntu loopback

## Why Chat Can Fail While Models Work

If `/v1/models` is green but chat fails, the likely issue is not `nginx`.

The critical dependency for chat is:

- Windows workers alive
- reverse tunnels alive
- relay able to reach `127.0.0.1:14021..14027`

This is why tunnel health now matters as much as API health.

## Windows Recovery Path

The Windows host should supervise reverse tunnels through the scheduled task:

- `OWMCGP Browser Block - Reverse Tunnels`

The underlying runner now supports foreground mode:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-reverse-tunnels.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50 `
  -IncludeHostController `
  -Foreground
```

## GitHub-First Handoff

Cross-host handoff is GitHub-first.

- sync Ubuntu and Windows from branch `windows-browser-block-api-20260331`
- use repo-backed files as the only source of truth
- do not treat local-only zip archives as the authoritative deployment source

## Phase 35 Server Revalidation

Local proof is already green on the isolated per-account browser-root model, so server revalidation should reuse that same shape instead of reopening the retired shared-root model.

Canonical Windows-side wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\revalidate-server-isolated-external-chat-proof.ps1
```

That wrapper is expected to record:

- exact Windows repo path and commit
- exact Ubuntu repo path and commit
- server account inventory
- isolated transfer results per account
- preflight and attempt truth
- final verdict `externally_ready` or `hold_rollout`

## External Readiness Contract

Before claiming the public API is externally ready, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\recover-ubuntu-ssh-reverse-tunnels-and-authenticated-smoke.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50
```

That artifact captures:

- Ubuntu SSH truth and failure kind
- exact Ubuntu repo path/hash truth
- canonical public upstream truth
- reverse-tunnel task truth
- Ubuntu tunnel-listener truth
- ready-worker truth
- verdict: `externally_ready` or `hold_rollout`

Final authenticated smoke may run from whichever host actually has the bearer token, as long as it still targets `77.66.186.75`.

## Phase 36 Token, SSH, And Listener Gate

Phase 36 is the narrow gate after server isolated-browser transfer proof stayed on hold.

Canonical wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\recover-server-token-ssh-listeners-and-external-chat.ps1 `
  -RemoteHosts 77.66.186.75,95.78.126.163 `
  -RemotePort 2222 `
  -RemoteUser mi50 `
  -PublicBaseUrl http://77.66.186.75 `
  -WorkerId wife `
  -AttemptTunnelRecovery
```

The wrapper records only redacted token source labels. It must not write bearer-token values or SSH passwords to artifacts. External chat revalidation is attempted only after token source and Ubuntu listener truth are green.
