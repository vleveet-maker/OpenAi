# 12 Recovery Summary

- Generated: `2026-03-31` (repo copy reconstructed from the operator report because the raw remote artifact was not synced into this checkout)
- Recovery status: `recovered`
- Summary: Recovered `9/9` workers and the public canary on `shared-6` still passes.

## Current Truth

- `dad`, `wife`, `shared-1`, `shared-2`, `shared-3`, `shared-4`, `shared-5`, `shared-6`, and `shared-7` now report `ready` and `usable` from `http://127.0.0.1:8081/internal/workers`
- readiness counts: `9 ready`, `0 reauth_required`, `0 reachable_but_unusable`, `0 disconnected`
- public canary on `shared-6`:
  - `GET /healthz` -> `200`
  - `GET /v1/models` -> `200`
  - `POST /v1/chat/completions` -> `200`
  - assistant reply -> `probe-ok`

## Preserve-First Result

- 9 accounts preserved
- no profile deletion
- no cookie clearing
- no local-storage clearing
- no relogin
- no blind mass restart across all 9 workers
- `4021..4029`, `4040`, `8080`, and `8081` remained loopback-only on `127.0.0.1`

## Compatibility Notes

- remote compatibility adjustments were needed in:
  - `infra/windows-block/recover-browser-block-readiness.ps1`
  - `infra/host-worker/test-host-worker-relay.ps1`

Successful remote command:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\recover-browser-block-readiness.ps1 `
  -SessionBaseUrl http://127.0.0.1:8080 `
  -PublicApiBaseUrl http://77.66.186.75 `
  -InternalBaseUrl http://127.0.0.1:8081 `
  -HostControllerBaseUrl http://127.0.0.1:4040 `
  -CanaryWorkerId shared-6 `
  -WorkerIds dad,wife,shared-1,shared-2,shared-3,shared-4,shared-5,shared-6,shared-7 `
  -OutputJsonPath .\.planning\phases\12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization\12-RECOVERY-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization\12-RECOVERY-SUMMARY.md
```
