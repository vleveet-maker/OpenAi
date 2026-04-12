# Phase 26 Deployed Host Agent Task

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

Phase 26 prompt path in GitHub:

```text
https://github.com/vleveet-maker/OpenAi/blob/windows-browser-block-api-20260331/.planning/phases/26-deployed-ubuntu-sync-recovery-reverse-tunnel-task-retention-and-external-authenticated-smoke-restoration/26-DEPLOYED-HOST-AGENT-TASK.md
```

Do not use local-only zip archives as the source of truth for this handoff.

## Goal

Complete live `26-03` from GitHub-backed repo state:

- sync Windows and Ubuntu from GitHub
- confirm Ubuntu still proxies `80/443/8080 -> 127.0.0.1:4010`
- confirm reverse tunnels stay retained
- write the Phase 26 external-restoration artifact
- verify `/internal/post-phase25-external-restoration/latest` or `/internal/admin`
- rerun authenticated external smoke

Final verdict must be exactly:

- `externally_ready`
- or `hold_rollout`

## Host Targets

- Ubuntu public-owner host: `77.66.186.75`
- Windows browser-block host: `192.168.88.250`

## Preserve-First Rules

Do not:

- delete profiles
- clear cookies
- clear local storage
- run blind full-pool restart
- mass-relogin all accounts

Use only bounded checks and reversible actions.

## Step 1 - Sync GitHub State On Both Hosts

### Windows `192.168.88.250`

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

### Ubuntu `77.66.186.75`

Use the live repo checkout that owns relay runtime and `nginx` config.

Run:

```bash
cd /path/to/repo
git fetch origin
git checkout windows-browser-block-api-20260331
git pull --ff-only origin windows-browser-block-api-20260331
```

If the live Ubuntu repo path is not obvious, stop and report the exact path used.

## Step 2 - Run Windows Validation

### PowerShell parser checks

```powershell
$files = @(
  "infra/windows-block/start-reverse-tunnels.ps1",
  "infra/windows-block/register-browser-block-tasks.ps1",
  "infra/windows-block/recover-reverse-tunnels-and-external-api-readiness.ps1",
  "infra/windows-block/recover-ubuntu-sync-and-external-auth-smoke.ps1"
)
foreach ($file in $files) {
  $parseErrors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $file), [ref]$null, [ref]$parseErrors)
  if ($parseErrors.Count -gt 0) {
    throw "Parser errors in $file"
  }
}
```

### Targeted control-api tests

```powershell
npm.cmd --prefix services/control-api test -- edge-config.test.ts internal-admin-page.test.ts internal-post-phase25-external-restoration.test.ts
```

### Full control-api suite

```powershell
npm.cmd --prefix services/control-api test
```

### Runtime build

```powershell
npm.cmd --prefix services/control-api run build
```

After build, restart `control-api` if it runs from:

```text
D:\OpenAi\services\control-api\dist\server.js
```

## Step 3 - Verify Ubuntu Topology

Run:

```bash
sudo nginx -t
curl -i http://127.0.0.1:4010/healthz
curl -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:4010/v1/models
sudo nginx -T | egrep -n 'server_name|listen|proxy_pass|4010|192\.168\.88\.250'
ss -ltnH | egrep '14021|14022|14023|14024|14025|14026|14027|14040'
```

Expected truth:

- `127.0.0.1:4010/healthz` returns `200`
- `nginx -T` shows `proxy_pass http://127.0.0.1:4010`
- no active `proxy_pass http://192.168.88.250`
- Ubuntu loopback listeners `14021..14027` and `14040` are present when tunnels are healthy

## Step 4 - Write The Phase 26 External Restoration Artifact

Run on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\recover-ubuntu-sync-and-external-auth-smoke.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50 `
  -PublicBaseUrl http://77.66.186.75 `
  -BearerTokenEnvVar OWMCGP_REMOTE_RELAY_API_TOKEN `
  -InternalBaseUrl http://127.0.0.1:8081 `
  -HostControllerBaseUrl http://127.0.0.1:4040 `
  -OutputJsonPath .\.planning\phases\26-deployed-ubuntu-sync-recovery-reverse-tunnel-task-retention-and-external-authenticated-smoke-restoration\26-EXTERNAL-RESTORATION-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\26-deployed-ubuntu-sync-recovery-reverse-tunnel-task-retention-and-external-authenticated-smoke-restoration\26-EXTERNAL-RESTORATION-SUMMARY.md
```

If the valid bearer token is not available on Windows, provide it explicitly with `-BearerToken`, or run the final authenticated public smoke from the host that actually has the token and report that host in the final summary.

Expected outputs:

- `.planning/phases/26-deployed-ubuntu-sync-recovery-reverse-tunnel-task-retention-and-external-authenticated-smoke-restoration/26-EXTERNAL-RESTORATION-SUMMARY.json`
- `.planning/phases/26-deployed-ubuntu-sync-recovery-reverse-tunnel-task-retention-and-external-authenticated-smoke-restoration/26-EXTERNAL-RESTORATION-SUMMARY.md`
- `infra/data/post-phase25-external-restoration/latest.json`

## Step 5 - Verify Operator Surface

Run:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8081/internal/post-phase25-external-restoration/latest `
  -Headers @{ "x-internal-admin-token" = "local-internal-admin-token" }
```

Also confirm `/internal/admin` shows:

```text
Latest post-phase25 external restoration
```

The route/admin truth must match the written artifact.

## Step 6 - Final Authenticated External Smoke

Run from whichever host actually has the bearer token, but always target the real public contract on `77.66.186.75`:

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
- whether Windows parser checks passed
- whether targeted `control-api` tests passed
- whether the full `control-api` suite passed
- whether the build passed
- whether Ubuntu still shows `80/443/8080 -> 127.0.0.1:4010`
- whether the reverse-tunnel task stayed `Running`
- whether Ubuntu listeners `14021..14027` and `14040` are present
- whether `/internal/post-phase25-external-restoration/latest` returned latest
- exact external smoke results for:
  - `/healthz`
  - `/v1/models`
  - `/v1/chat/completions`
- which host actually held the bearer token
- final verdict:
  - `externally_ready`
  - or `hold_rollout`
- whether any post-pull hotfix was still required

## Next Command After Manual Run

After all of the above, run:

```text
$gsd-execute-phase 26
```
