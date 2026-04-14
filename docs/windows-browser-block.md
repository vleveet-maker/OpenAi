# Windows Browser Block

## Current Live Truth

`phase27-ubuntu-ssh-recovery-v1`

The Windows browser block is the browser-runtime side of the system. It is not the active public edge.

Current topology:

`internet -> MikroTik -> Ubuntu nginx -> 127.0.0.1:4010 -> reverse SSH tunnels -> Windows workers`

That means:

- Windows keeps the browser workers and local control surface
- Ubuntu owns public ingress
- reverse SSH tunnels are rollout-critical for external chat
- Windows `Caddy` is not the active public edge in the current live deployment

## Windows Responsibilities

The Windows host owns:

- `host-controller` on `127.0.0.1:4040`
- `control-api` internal/operator surface on `127.0.0.1:8081`
- worker agents on local worker ports
- durable browser profiles
- reverse SSH tunnel origin back to Ubuntu

The Windows host should not expose `4040` or `8081` publicly.

## GitHub-First Handoff

When a deployed host needs new files, sync branch `windows-browser-block-api-20260331` from GitHub on both Windows and Ubuntu.

- prefer `git fetch`, `git checkout`, and `git pull --ff-only`
- replace stale tracked files in place through GitHub-backed repo state
- do not treat a local-only archive as the source of truth

## Isolated Per-Account Browser Roots

The old shared desktop-browser root is now retired for rollout proof and server transfer.

Current canonical browser shape is:

- one account = one dedicated desktop Chrome root
- one account = one dedicated browser-data root
- no cross-account reuse of browser root or browser-data paths

The canonical helper for preparing this layout is:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\prepare-isolated-account-browser-roots.ps1
```

For server transfer or server revalidation, the same helper is reused with explicit source browser-data mapping so the server path keeps the same isolation contract instead of falling back to the retired shared-root layout.

## Reverse Tunnels

Ubuntu expects these listeners to exist when the block is healthy:

- `127.0.0.1:14021..14027`
- `127.0.0.1:14040`

Foreground tunnel run:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-reverse-tunnels.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50 `
  -IncludeHostController `
  -Foreground
```

Foreground mode is important because it keeps `ssh.exe` under direct supervision and surfaces failures immediately.

## Durable Task Registration

Use the scheduled task for durable recovery:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\register-browser-block-tasks.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50
```

Expected truth:

- task name: `OWMCGP Browser Block - Reverse Tunnels`
- action includes `-Foreground`
- task uses `StartWhenAvailable`
- task has restart policy so tunnel supervision survives drift or reboots

## Preserve-First Rules

- do not delete profiles
- do not clear cookies or local storage
- do not perform blind full-pool restarts
- do not mass-relogin live accounts
- use bounded canary and controlled recovery steps

## Local Verification

Check listeners on Windows:

```powershell
Get-NetTCPConnection -State Listen |
  Where-Object LocalPort -in 4040,8081,80,443 |
  Sort-Object LocalPort |
  Format-Table -AutoSize
```

Healthy current truth:

- `127.0.0.1:4040` listens
- `127.0.0.1:8081` listens
- `80` and `443` are not owned by Windows `Caddy`

## Phase 27 Ubuntu SSH Recovery

Before claiming external readiness, write the durable artifact:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\recover-ubuntu-ssh-reverse-tunnels-and-authenticated-smoke.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50
```

This records:

- Ubuntu SSH truth plus `sshFailureKind`
- exact Ubuntu repo path and commit hash when reachable
- canonical public upstream truth
- reverse-tunnel task truth
- Ubuntu tunnel listener truth
- ready worker count
- verdict before final external smoke

Final authenticated smoke may run from another operator-controlled host if that host is the one that actually holds the bearer token. Exact Ubuntu repo path/hash should be reported explicitly in the live handoff.

Authenticated external smoke may run from another operator-controlled host if that host is the one that actually holds the bearer token.

## Phase 28 Local Proxy And Bounded Bootstrap

Phase 28 stays on the current local Windows machine only.

- do not transfer this phase to `192.168.88.250` yet
- do not widen beyond bounded worker `shared-2`
- do not delete profiles
- do not clear cookies or local storage
- do not blind-restart the whole pool
- do not mass-relogin accounts

Canonical local wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\stabilize-local-proxy-tls-and-bounded-worker-bootstrap.ps1 `
  -WorkerId shared-2 `
  -ProxyAddress http://127.0.0.1:7897 `
  -InternalBaseUrl http://127.0.0.1:8081 `
  -HostControllerBaseUrl http://127.0.0.1:4040 `
  -PublicBaseUrl http://77.66.186.75 `
  -ApiTokenEnvVar OWMCGP_REMOTE_RELAY_API_TOKEN `
  -OutputJsonPath .\.planning\phases\28-local-proxy-tls-egress-and-bounded-worker-bootstrap-stabilization-for-external-chat-readiness\28-LOCAL-PROXY-BOOTSTRAP-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\28-local-proxy-tls-egress-and-bounded-worker-bootstrap-stabilization-for-external-chat-readiness\28-LOCAL-PROXY-BOOTSTRAP-SUMMARY.md
```

The wrapper must record:

- proxy TLS truth for `https://www.gstatic.com/generate_204`
- proxy TLS truth for `https://chatgpt.com`
- bounded `shared-2` listener truth for `4040`, `8081`, `4024`, and `9225`
- whether proxy-backed bootstrap reached `ready`
- whether a bounded no-proxy fallback was requested or attempted

Public authenticated chat against `http://77.66.186.75` must be rerun only after the wrapper verdict becomes `ready_for_external_chat_smoke`.

## Related Files

- [start-browser-block.ps1](d:/OpenAi/infra/windows-block/start-browser-block.ps1)
- [start-reverse-tunnels.ps1](d:/OpenAi/infra/windows-block/start-reverse-tunnels.ps1)
- [register-browser-block-tasks.ps1](d:/OpenAi/infra/windows-block/register-browser-block-tasks.ps1)
- [prepare-isolated-account-browser-roots.ps1](d:/OpenAi/infra/windows-block/prepare-isolated-account-browser-roots.ps1)
- [revalidate-server-isolated-external-chat-proof.ps1](d:/OpenAi/infra/windows-block/revalidate-server-isolated-external-chat-proof.ps1)
- [recover-ubuntu-ssh-reverse-tunnels-and-authenticated-smoke.ps1](d:/OpenAi/infra/windows-block/recover-ubuntu-ssh-reverse-tunnels-and-authenticated-smoke.ps1)
- [recover-server-token-ssh-listeners-and-external-chat.ps1](d:/OpenAi/infra/windows-block/recover-server-token-ssh-listeners-and-external-chat.ps1)
- [stabilize-local-proxy-tls-and-bounded-worker-bootstrap.ps1](d:/OpenAi/infra/windows-block/stabilize-local-proxy-tls-and-bounded-worker-bootstrap.ps1)
- [remote-relay-server.md](d:/OpenAi/docs/remote-relay-server.md)

## Phase 36 Server Gate

Before claiming that the transferred server path is externally ready, run the Phase 36 token/SSH/listener gate. This step checks bearer-token source, Ubuntu SSH, Ubuntu-side listeners `14021..14027` plus `14040`, and only then performs authenticated external smoke. It does not delete profiles, clear cookies/localStorage, restart the full pool, or relogin accounts.
