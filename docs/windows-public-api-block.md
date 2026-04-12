# Windows Public API Block

## Current Live Truth

`phase27-ubuntu-ssh-recovery-v1`

This file keeps the public API story honest.

The live public path is now:

`internet -> MikroTik -> Ubuntu nginx -> 127.0.0.1:4010`

That means:

- Ubuntu `nginx` is the canonical public owner for `77.66.186.75`
- the relay/API process stays local to Ubuntu on `127.0.0.1:4010`
- reverse SSH tunnels from the Windows browser block are now the critical dependency for external chat
- Windows `Caddy` is not the active public edge in the current deployment shape

## What External Success Looks Like

- `http://77.66.186.75/healthz` returns `200`
- `http://77.66.186.75/v1/models` returns `401` without a bearer token and `200` with a valid bearer token
- `http://77.66.186.75/v1/chat/completions` returns `200` with model `owmcgp-browser` when the reverse tunnels are healthy

If `/v1/models` works but chat fails with worker-bootstrap errors, check reverse tunnels before touching `nginx` or MikroTik.

## What Is No Longer True

Do not use these assumptions as the active architecture:

- Ubuntu `nginx -> 192.168.88.250:80`
- Windows `Caddy` on `80/443` as the preserved public edge
- "no reverse SSH tunnels" as the critical-path story

Those paths are retired for the current live deployment.

## Current Verification

On Ubuntu:

```bash
curl -i http://127.0.0.1:4010/healthz
curl -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:4010/v1/models
sudo nginx -T | egrep -n 'listen|server_name|proxy_pass|4010'
```

Expected truth:

- public `80/443/8080` proxy to `127.0.0.1:4010`
- no active `proxy_pass http://192.168.88.250`

On Windows:

```powershell
Get-NetTCPConnection -State Listen |
  Where-Object LocalPort -in 4040,8081 |
  Sort-Object LocalPort |
  Format-Table -AutoSize

Get-Service *caddy*
Get-Process caddy -ErrorAction SilentlyContinue
```

Expected truth:

- `4040` and `8081` listen only on `127.0.0.1`
- no live `Caddy` service or process

## GitHub-First Handoff

When files need to move between hosts, use GitHub branch `windows-browser-block-api-20260331` as the source of truth.

- update existing tracked files in place
- sync from GitHub on Ubuntu and Windows
- do not rely on local-only archives as the canonical handoff

## Reverse Tunnel Dependency

Reverse tunnels are rollout-critical because Ubuntu reaches the Windows workers through:

- `127.0.0.1:14021..14027`
- `127.0.0.1:14040`

The durable recovery path on Windows is:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\register-browser-block-tasks.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50
```

The tunnel runner now supports foreground supervision:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-reverse-tunnels.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50 `
  -IncludeHostController `
  -Foreground
```

## Phase 27 External Readiness

Before claiming the public API is externally ready, capture one preserve-first artifact:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\recover-ubuntu-ssh-reverse-tunnels-and-authenticated-smoke.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50
```

That artifact must prove:

- Ubuntu SSH is reachable or precisely classified
- exact Ubuntu repo path/hash are explicit
- canonical public upstream is still `Ubuntu nginx -> 127.0.0.1:4010`
- the reverse-tunnel scheduled task is healthy
- Ubuntu still exposes the forwarded listener set
- at least one ready worker exists before external smoke

## Final External Smoke

Use the live model, not `gpt-4.1`. Run the authenticated smoke from the host that actually has the bearer token while still targeting `77.66.186.75`:

```bash
curl -i -H "Authorization: Bearer <TOKEN>" http://77.66.186.75/v1/models

curl -i \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"owmcgp-browser\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with exactly: ping-ok\"}]}" \
  http://77.66.186.75/v1/chat/completions
```
