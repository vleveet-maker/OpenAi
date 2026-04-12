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

## Related Files

- [start-browser-block.ps1](d:/OpenAi/infra/windows-block/start-browser-block.ps1)
- [start-reverse-tunnels.ps1](d:/OpenAi/infra/windows-block/start-reverse-tunnels.ps1)
- [register-browser-block-tasks.ps1](d:/OpenAi/infra/windows-block/register-browser-block-tasks.ps1)
- [recover-ubuntu-ssh-reverse-tunnels-and-authenticated-smoke.ps1](d:/OpenAi/infra/windows-block/recover-ubuntu-ssh-reverse-tunnels-and-authenticated-smoke.ps1)
- [remote-relay-server.md](d:/OpenAi/docs/remote-relay-server.md)
