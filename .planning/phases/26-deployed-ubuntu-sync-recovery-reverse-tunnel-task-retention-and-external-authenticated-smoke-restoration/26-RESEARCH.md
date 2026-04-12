# Phase 26 Research

## Starting Truth After Phase 25

Phase 26 starts from a mixed but much better truth than the final Phase 25 hold verdict alone would suggest.

Negative repo-backed truth from the live Phase 25 run:

- the deployed Windows host synced branch `windows-browser-block-api-20260331` and reran parser/tests/build successfully
- Ubuntu sync and topology could not be re-verified from that run because `77.66.186.75:2222` closed SSH during key exchange, `:22` rejected auth, and `192.168.88.2:22/2222` timed out
- the reverse-tunnel scheduled task fell back to `Ready` with `LastTaskResult=1`
- Windows truth stayed preserve-first and non-destructive, but outside proof regressed to `/healthz=404`, `/v1/models=404`, and `/v1/chat/completions=501`
- authenticated external smoke could not finish on the deployed Windows host because there was no usable local bearer token there

Fresh live truth gathered after Phase 25:

- Ubuntu `nginx` is healthy: `nginx -t` passed, `ss -ltnp` showed listeners on `80`, `443`, and `8080`
- Ubuntu local upstream `http://127.0.0.1:4010/healthz` returns `200 OK`
- Ubuntu local upstream `http://127.0.0.1:4010/v1/models` returns `401 Unauthorized` without a bearer token, which proves the service is alive behind auth
- `nginx -T` shows `proxy_pass http://127.0.0.1:4010` and no longer references `192.168.88.250`
- the historical Windows `Caddy` edge is absent: `192.168.88.250` only listens on loopback `127.0.0.1:4040` and `127.0.0.1:8081`, with no `Caddy` service or process
- after restoring reverse SSH tunnels, Ubuntu again exposed `127.0.0.1:14021..14027` and `127.0.0.1:14040`
- after tunnel recovery, `readyz` reported `7/7 ready`
- authenticated external public smoke succeeded: `/v1/chat/completions` returned `200 OK`, reply `ping-ok`, on worker `shared-2`

## What This Changes

Phase 26 should no longer behave like a broad investigation into whether the public API exists.

That question is already answered:

- public ingress through Ubuntu is real
- the canonical public path is `internet -> MikroTik -> Ubuntu nginx -> 127.0.0.1:4010`
- external chat can succeed when reverse tunnels are healthy and a valid bearer token is available

So the remaining problem is operational repeatability, not architecture discovery.

The real remaining gates are:

- repo-backed Ubuntu sync and verification must work again
- the reverse-tunnel scheduled task must stay `Running` instead of falling back to `Ready`
- the final authenticated smoke must be rerun from a host that actually has a bearer token

## Bearer Token Truth

Phase 25 treated missing Windows-local bearer token as part of the hold verdict. That was operationally honest for that run, but it is not the right long-term assumption.

Important distinction:

- lack of a token on the Windows host does not prove the public API is broken
- it only proves that the smoke was run from the wrong place for authenticated proof

Phase 26 should therefore treat bearer-token location as an execution detail:

- the final authenticated smoke may run from Windows, Ubuntu, or another operator-controlled host
- the important part is that the request targets the real public contract on `77.66.186.75`
- the final artifact must still capture exactly where the smoke ran and whether any extra post-pull hotfix was required

## Live Fixes Still Not Fully Backported Into A Repeatable Cross-Host Flow

The following truths still need a clean repo-backed operational loop:

- `recover-reverse-tunnels-and-external-api-readiness.ps1` needed a null-safe `NextRunTime` and `LastRunTime` fix during the deployed-host run
- `edge-config.test.ts` needed CRLF normalization for reliable Windows test execution
- the repo lacks one canonical Phase 26 wrapper that combines Ubuntu sync verification, reverse-tunnel retention truth, and authenticated public smoke into one durable artifact
- the repo lacks one dedicated latest-state operator surface for this new external-restoration follow-up
- the deployed-host handoff for this follow-up should be GitHub-first from the start, not archive-first

## Recommended Phase Boundary

Phase 26 should stay narrow and execution-oriented.

It should:

- backport the remaining live operational fixes from the Phase 25 run
- add one canonical wrapper for Ubuntu sync recovery, reverse-tunnel task retention, and authenticated external smoke
- expose the latest result in `control-api` and `/internal/admin`
- sync both Ubuntu and Windows from GitHub-tracked state
- rerun authenticated external smoke against the real public contract
- end with exactly one verdict:
  - `externally_ready`
  - or `hold_rollout`

It should not:

- reopen the retired Windows `Caddy` branch
- treat bearer-token location as the same thing as public API health
- claim external readiness if the repo-backed overlay still needs live-only post-pull fixes

## Recommended Technical Shape

### 1. Backport the remaining operational fixes

Phase 26 should carry forward the deployed-host fixes that were still discovered during Phase 25:

- null-safe task-time handling in `recover-reverse-tunnels-and-external-api-readiness.ps1`
- CRLF-safe Windows test behavior in `services/control-api/test/edge-config.test.ts`
- GitHub-first handoff instructions for both Ubuntu and Windows

Use one explicit compatibility marker for the new chain:

- `phase26-ubuntu-sync-recovery-v1`

### 2. Add one canonical external-restoration wrapper

Create:

- `infra/windows-block/recover-ubuntu-sync-and-external-auth-smoke.ps1`

It should record:

- Ubuntu SSH reachability
- Ubuntu `nginx -T` upstream truth
- Ubuntu local `127.0.0.1:4010` truth
- reverse-tunnel scheduled-task truth
- Ubuntu listener truth for `14021..14027` and `14040`
- ready-worker truth
- authenticated external smoke results for `/healthz`, `/v1/models`, and `/v1/chat/completions` when a bearer token is available
- final verdict exactly `externally_ready` or `hold_rollout`

It should emit:

- `.planning/phases/26-deployed-ubuntu-sync-recovery-reverse-tunnel-task-retention-and-external-authenticated-smoke-restoration/26-EXTERNAL-RESTORATION-SUMMARY.json`
- `.planning/phases/26-deployed-ubuntu-sync-recovery-reverse-tunnel-task-retention-and-external-authenticated-smoke-restoration/26-EXTERNAL-RESTORATION-SUMMARY.md`
- `infra/data/post-phase25-external-restoration/latest.json`

### 3. Add a dedicated operator surface

Phase 26 needs a dedicated route and admin section, not another note hidden inside Phase 25 artifacts.

Recommended route:

- `GET /internal/post-phase25-external-restoration/latest`

Recommended admin section:

- `Latest post-phase25 external restoration`

That surface should expose:

- Ubuntu SSH and upstream truth
- reverse-tunnel task state
- tunnel listener status
- ready-worker count
- external `healthz`, `models`, and `chat` status
- external model used
- compatibility version
- verdict

### 4. Keep the live execution GitHub-first

The live run should no longer depend on a local-only archive being manually copied around.

The deployed-host prompt for Phase 26 should explicitly instruct:

- Windows checkout sync from GitHub branch `windows-browser-block-api-20260331`
- Ubuntu live repo sync from the same branch
- repo-backed validation on both hosts
- wrapper execution on the host that can both reach the public path and provide a valid bearer token

## Risks And Constraints

- preserve-first remains mandatory on the Windows browser-block host
- reverse SSH tunnels are now runtime-critical infrastructure, not just a helper detail
- Ubuntu SSH reachability is now part of rollout readiness, because the canonical public owner lives there
- the external chat path may already be healthy in live reality while repo-backed proof is still incomplete; Phase 26 must close that gap honestly instead of reopening old architecture debates
- no final `externally_ready` verdict should be accepted if repo-backed sync still needs ad-hoc post-pull fixes
