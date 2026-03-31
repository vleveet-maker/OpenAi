# Windows Server Agent Task

## Goal

Turn the target Windows Server into a self-contained browser block plus public API host.

If the server already has live logged-in accounts, preserve them first and do not treat the host as disposable.

## Repo Inputs

- `infra/windows-block/bootstrap-browser-block.ps1`
- `infra/windows-block/start-browser-block.ps1`
- `infra/windows-block/start-public-api.ps1`
- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/register-browser-block-tasks.ps1`
- `infra/windows-block/register-public-api-task.ps1`
- `docs/windows-public-api-block.md`

## Required Outcome

1. browser block starts locally
2. ChatGPT accounts are logged in on that same Windows Server
3. public API listens on loopback only (`127.0.0.1:4010` or `127.0.0.1:4011`)
4. `Caddy` owns the public edge on `80/443` and reverse-proxies to the loopback API
5. local probe passes for:
  - `/healthz`
  - `/v1/models`
6. one canary `POST /v1/chat/completions` passes before promotion
7. MikroTik can forward public `80/443` to that Windows Server edge

## Exact Task List

1. If this is already a live server, create a freeze point first:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\backup-browser-block-state.ps1
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\backup-public-edge-state.ps1
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\collect-public-edge-audit.ps1
```

2. Unpack or reconcile the Windows browser block package on the Windows Server
3. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\bootstrap-browser-block.ps1
```

4. Create:

```text
infra\data\control-api\remote-relay.local.json
```

5. Put a strong bearer token into that file
6. Start the browser block:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-browser-block.ps1
```

7. If needed, log in to the required ChatGPT workers on that server
8. Start a shadow public API first on loopback:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-public-api.ps1 -ListenHost 127.0.0.1 -ListenPort 4011 -AllowedWorkerIds shared-6
```

9. Reconcile the Windows edge to that shadow path:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\activate-public-edge.ps1 -Mode shadow -Apply
```

10. Verify:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\probe-public-api.ps1 -BaseUrl http://127.0.0.1:4011 -IncludeChatProbe -WorkerId shared-6 -EnsureWorkerStarted -StopWorkerWhenDone
```

11. If canary is green, widen to a subset and probe again
12. Only after that start the promoted loopback API on `4010` and switch the edge:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-public-api.ps1 -ListenHost 127.0.0.1 -ListenPort 4010
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\activate-public-edge.ps1 -Mode promoted -Apply
```

13. If promoted-edge proof fails, roll back immediately:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\rollback-public-edge.ps1 -BackupPath <BACKUP_PATH>
```

14. If final local probe is green, register autostart:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\register-browser-block-tasks.ps1
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\register-public-api-task.ps1
```

## Success Criteria

- `host-controller` is reachable
- canary worker path is reachable before subset and full-pool promotion
- public API responds locally on a shadow path before the final public path
- `Caddy`/edge ownership is backed up before changes
- `4040` and worker-agent ports stay private
- outside NAT can be switched only after a preserve-first verdict
