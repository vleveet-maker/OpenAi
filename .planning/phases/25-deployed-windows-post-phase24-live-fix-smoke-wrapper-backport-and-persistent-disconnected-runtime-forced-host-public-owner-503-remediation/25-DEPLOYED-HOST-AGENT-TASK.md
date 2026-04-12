# Phase 25 Deployed Host Agent Task

## Source Of Truth

Use GitHub as the only handoff source.

Repository:

```text
https://github.com/vleveet-maker/OpenAi
```

Branch:

```text
windows-browser-block-api-20260331
```

Phase 25 prompt path in GitHub:

```text
https://github.com/vleveet-maker/OpenAi/blob/windows-browser-block-api-20260331/.planning/phases/25-deployed-windows-post-phase24-live-fix-smoke-wrapper-backport-and-persistent-disconnected-runtime-forced-host-public-owner-503-remediation/25-DEPLOYED-HOST-AGENT-TASK.md
```

Do not rely on local-only zip archives for this handoff.

## Goal

Complete live `25-03` for Phase 25 using the GitHub-tracked repo state, confirm the canonical public path, confirm reverse-tunnel health, run the Phase 25 readiness wrapper, verify the internal operator surface, and finish with authenticated external smoke.

Final verdict must be exactly:

- `externally_ready`
- or `hold_rollout`

## Host Targets

- Ubuntu public-owner host: `77.66.186.75`
- Windows browser-block host: `192.168.88.250`

## Important Live Truth

- Canonical public path is now `internet -> MikroTik -> Ubuntu nginx -> 127.0.0.1:4010`
- Windows `Caddy` is not the active public edge
- Reverse SSH tunnels are critical for external chat
- Windows should keep `4040` and `8081` on loopback only
- Preserve-first rules remain mandatory

## Preserve-First Rules

Do not:

- delete profiles
- clear cookies
- clear local storage
- run blind full-pool restart
- mass-relogin all accounts

Use only bounded checks and reversible actions.

## Step 1 - Sync The GitHub Branch

### On Windows `192.168.88.250`

Repo root:

```text
D:\OpenAi
```

Run:

```powershell
cd D:\OpenAi
git fetch origin
git checkout windows-browser-block-api-20260331
git pull --ff-only origin windows-browser-block-api-20260331
```

### On Ubuntu `77.66.186.75`

Use the live repo checkout that owns the relay and `nginx` config.

Run:

```bash
cd /path/to/repo
git fetch origin
git checkout windows-browser-block-api-20260331
git pull --ff-only origin windows-browser-block-api-20260331
```

If the Ubuntu live checkout path is not obvious, stop and report the exact path you used.

## Step 2 - Run The Same Validation Set We Expect For Phase 25

### On Windows - PowerShell parser checks

Run:

```powershell
$files = @(
  "infra/windows-block/start-reverse-tunnels.ps1",
  "infra/windows-block/register-browser-block-tasks.ps1",
  "infra/windows-block/build-windows-browser-block-package.ps1",
  "infra/windows-block/recover-reverse-tunnels-and-external-api-readiness.ps1"
)
foreach ($file in $files) {
  $parseErrors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $file), [ref]$null, [ref]$parseErrors)
  if ($parseErrors.Count -gt 0) {
    throw "Parser errors in $file"
  }
}
```

### On Windows - targeted control-api tests

Run:

```powershell
npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts internal-post-phase24-external-api-readiness.test.ts
```

### On Windows - full control-api suite

Run:

```powershell
npm.cmd --prefix services/control-api test
```

### On Windows - runtime build

Run:

```powershell
npm.cmd --prefix services/control-api run build
```

After build, restart `control-api` if it runs from:

```text
D:\OpenAi\services\control-api\dist\server.js
```

## Step 3 - Verify Live Topology

### On Ubuntu

Run:

```bash
curl -i http://127.0.0.1:4010/healthz
curl -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:4010/v1/models
sudo nginx -T | egrep -n 'server_name|listen|proxy_pass|4010|192\.168\.88\.250'
ss -ltnH | egrep '14021|14022|14023|14024|14025|14026|14027|14040'
```

Expected truth:

- `127.0.0.1:4010` answers
- `nginx -T` shows `proxy_pass http://127.0.0.1:4010`
- no active `proxy_pass http://192.168.88.250`
- tunnel listeners `14021..14027` and `14040` are present

### On Windows

Run:

```powershell
Get-NetTCPConnection -State Listen |
  Where-Object LocalPort -in 80,443,4040,8081 |
  Sort-Object LocalPort |
  Format-Table -AutoSize

Get-ScheduledTask -TaskName "OWMCGP Browser Block - Reverse Tunnels"
Get-ScheduledTaskInfo -TaskName "OWMCGP Browser Block - Reverse Tunnels"
Get-Service *caddy*
Get-Process caddy -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,Path
```

Expected truth:

- `127.0.0.1:4040` and `127.0.0.1:8081` listen
- no active Windows `Caddy` service/process
- reverse-tunnel task exists

## Step 4 - Write The Phase 25 External Readiness Artifact

Run on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\recover-reverse-tunnels-and-external-api-readiness.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50 `
  -InternalBaseUrl http://127.0.0.1:8081 `
  -HostControllerBaseUrl http://127.0.0.1:4040 `
  -OutputJsonPath .\.planning\phases\25-deployed-windows-post-phase24-live-fix-smoke-wrapper-backport-and-persistent-disconnected-runtime-forced-host-public-owner-503-remediation\25-EXTERNAL-READINESS-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\25-deployed-windows-post-phase24-live-fix-smoke-wrapper-backport-and-persistent-disconnected-runtime-forced-host-public-owner-503-remediation\25-EXTERNAL-READINESS-SUMMARY.md
```

Expected outputs:

- `.planning/phases/25-deployed-windows-post-phase24-live-fix-smoke-wrapper-backport-and-persistent-disconnected-runtime-forced-host-public-owner-503-remediation/25-EXTERNAL-READINESS-SUMMARY.json`
- `.planning/phases/25-deployed-windows-post-phase24-live-fix-smoke-wrapper-backport-and-persistent-disconnected-runtime-forced-host-public-owner-503-remediation/25-EXTERNAL-READINESS-SUMMARY.md`
- `infra/data/post-phase24-external-api-readiness/latest.json`

## Step 5 - Verify Operator Surface

Run:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8081/internal/post-phase24-external-api-readiness/latest `
  -Headers @{ "x-internal-admin-token" = "local-internal-admin-token" }
```

Also confirm `/internal/admin` shows:

```text
Latest post-phase24 external API readiness
```

The route/admin truth must match the written artifact.

## Step 6 - Authenticated External Smoke

Run against the public host with a valid bearer token and the live model `owmcgp-browser`:

```bash
curl -i http://77.66.186.75/healthz
curl -i -H "Authorization: Bearer <TOKEN>" http://77.66.186.75/v1/models
curl -i \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"owmcgp-browser\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with exactly: ping-ok\"}]}" \
  http://77.66.186.75/v1/chat/completions
```

## Final Report Back

Reply with:

- whether GitHub sync succeeded on Windows and Ubuntu
- whether the Windows parser checks passed
- whether the targeted `control-api` tests passed
- whether the full `control-api` suite passed
- whether the `control-api` build passed
- whether Ubuntu still shows `80/443/8080 -> 127.0.0.1:4010`
- whether tunnel listeners `14021..14027` and `14040` are present
- whether the reverse-tunnel task is `Running`
- whether `/internal/post-phase24-external-api-readiness/latest` returns latest
- exact external smoke results for:
  - `/healthz`
  - `/v1/models`
  - `/v1/chat/completions`
- final verdict:
  - `externally_ready`
  - or `hold_rollout`
- any post-pull hotfix that was still required

## Next Command After Manual Run

After all of the above, run:

```text
$gsd-execute-phase 25
```
