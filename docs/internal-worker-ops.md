# Internal Worker Operations

## Current Live Truth

`phase25-live-fix-backport-v1`

The public API is alive through Ubuntu. Internal worker operations now matter mainly for:

- keeping reverse tunnels healthy
- keeping workers reachable from Ubuntu
- preserving logged-in browser profiles
- verifying that chat can still bootstrap through the worker path

If public `/v1/models` works but chat fails, check reverse tunnels first.

## Internal Entry Points

- operator admin: `http://127.0.0.1:8081/internal/admin`
- ready check: `http://127.0.0.1:8081/readyz`
- workers list: `http://127.0.0.1:8081/internal/workers`
- host controller: `http://127.0.0.1:4040/health`

These stay loopback-only on Windows.

## Preserve-First Rules

- do not delete profiles
- do not clear cookies or local storage
- do not run blind full-pool restarts
- do not relogin all accounts as a first response
- prefer bounded canaries and reversible tunnel/task recovery

## Reverse Tunnel Supervision

The durable task is:

- `OWMCGP Browser Block - Reverse Tunnels`

Check it:

```powershell
Get-ScheduledTask -TaskName "OWMCGP Browser Block - Reverse Tunnels"
Get-ScheduledTaskInfo -TaskName "OWMCGP Browser Block - Reverse Tunnels"
```

If needed, re-register it:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\register-browser-block-tasks.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50
```

## Worker Proof

For one-worker proof on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\host-worker\test-host-worker-relay.ps1 `
  -WorkerId shared-2
```

This should still prove:

`Temporary Chat -> GPT-5.4 Thinking -> relay -> smoke-ok`

## Phase 25 Readiness Artifact

Use this before any final external claim:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\recover-reverse-tunnels-and-external-api-readiness.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50
```

It captures:

- reverse-tunnel task state
- Ubuntu tunnel listener status
- ready worker count
- canonical public upstream
- verdict for whether we are ready for authenticated external smoke

## External Smoke

After readiness is green, run the authenticated public checks against Ubuntu-owned ingress:

- `GET /healthz`
- `GET /v1/models`
- `POST /v1/chat/completions`

Use model `owmcgp-browser`.
