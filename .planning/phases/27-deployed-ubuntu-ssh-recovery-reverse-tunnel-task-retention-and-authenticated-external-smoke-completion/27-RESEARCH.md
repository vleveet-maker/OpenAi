# Phase 27 Research

## Starting Truth After Phase 26

Phase 27 starts from a much narrower problem than the long chain of Windows runtime phases before it.

What Phase 26 proved from tracked repo-backed state:

- the deployed Windows host synced branch `windows-browser-block-api-20260331` at commit `8317e78`
- PowerShell parser checks passed
- targeted `control-api` tests passed (`3 files / 6 tests`)
- the full `control-api` suite passed (`30 files / 128 tests`)
- `npm.cmd --prefix services/control-api run build` passed
- `GET /internal/post-phase25-external-restoration/latest` answered on the deployed host
- `/internal/admin` rendered `Latest post-phase25 external restoration`

What still failed in Phase 26:

- SSH to `mi50@77.66.186.75:2222` closed immediately, so the exact live Ubuntu checkout path and hash remained unconfirmed
- the reverse-tunnel scheduled task did not stay `Running`; the last observed state was `Ready` with `LastTaskResult=1`
- Ubuntu listener ports `14021..14027` and `14040` were recorded as missing
- accessible Windows-host external proof stayed at `/healthz=404`, `/v1/models=404`, `/v1/chat/completions=501`
- authenticated external smoke still did not complete because the Windows host did not have a bearer token and Ubuntu stayed unavailable by SSH

Earlier live truth from the same date still matters:

- Ubuntu `nginx` can be healthy and proxy `80/443/8080` to `127.0.0.1:4010`
- `127.0.0.1:4010/healthz` can return `200`
- `127.0.0.1:4010/v1/models` can return `401` without a bearer token, which proves the API is alive behind auth
- when reverse SSH tunnels are healthy, Ubuntu can expose `127.0.0.1:14021..14027` and `127.0.0.1:14040`
- when tunnels are healthy and a token is available, authenticated external chat can succeed through the public path

## What This Changes

Phase 27 should not reopen the architecture question.

That question is already settled:

- the canonical public path is `internet -> MikroTik -> Ubuntu nginx -> 127.0.0.1:4010`
- Windows `Caddy` is not the active public edge
- reverse SSH tunnels are the runtime-critical dependency for public chat

So the remaining problem is operational repeatability from tracked assets:

- repo-backed Ubuntu SSH access must work again
- the reverse-tunnel task must stay `Running`
- the expected Ubuntu listener set must stay present long enough to prove readiness
- authenticated external smoke must finish from the host that actually has a valid bearer token

## Exact Remaining Gates

Phase 27 should treat these as the only real blockers:

1. Recover repo-backed Ubuntu SSH verification
   - confirm the exact live checkout path
   - confirm the live commit hash
   - re-verify `nginx -> 127.0.0.1:4010`

2. Prove reverse-tunnel retention
   - the task must stay `Running`
   - the listener set `14021..14027` and `14040` must remain present after a settle window

3. Complete authenticated external smoke from tracked assets
   - identify the execution host that actually has a bearer token
   - run public `/healthz`, `/v1/models`, and `/v1/chat/completions`
   - keep the public target on `77.66.186.75`

4. Avoid new live-only repairs
   - no new post-pull hotfix should be needed
   - if a hotfix is still needed, the truthful verdict remains `hold_rollout`

## Recommended Phase Boundary

Phase 27 should stay narrow and execution-oriented.

It should:

- add one canonical wrapper focused on Ubuntu SSH recovery, reverse-tunnel retention, and authenticated external smoke completion
- add one dedicated latest-state operator surface for this exact follow-up
- keep handoff GitHub-first only
- run one repo-backed recovery pass on Windows plus Ubuntu
- end with exactly one verdict:
  - `externally_ready`
  - or `hold_rollout`

It should not:

- reopen the retired Windows `Caddy` branch
- reclassify "token missing on this host" as the same thing as "public API is broken"
- claim readiness if SSH is still blocked, listeners are still missing, or the tunnel task still falls back to `Ready`

## Recommended Technical Shape

### 1. Add one canonical Phase 27 wrapper

Create:

- `infra/windows-block/recover-ubuntu-ssh-reverse-tunnels-and-authenticated-smoke.ps1`

It should record:

- exact SSH reachability to Ubuntu
- exact SSH failure kind when Ubuntu is still unreachable
- exact Ubuntu repo path and commit hash when reachable
- Ubuntu `nginx -t` and `nginx -T` upstream truth
- Ubuntu local `127.0.0.1:4010` truth
- reverse-tunnel task retention truth after a settle window
- Ubuntu listener truth for `14021..14027` and `14040`
- ready-worker truth
- authenticated public smoke results for `/healthz`, `/v1/models`, and `/v1/chat/completions`
- the host and token source used for authenticated smoke
- final verdict exactly `externally_ready` or `hold_rollout`

It should emit:

- `.planning/phases/27-deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion/27-SSH-RECOVERY-SUMMARY.json`
- `.planning/phases/27-deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion/27-SSH-RECOVERY-SUMMARY.md`
- `infra/data/post-phase26-ubuntu-ssh-recovery/latest.json`

Use one explicit compatibility marker for the new chain:

- `phase27-ubuntu-ssh-recovery-v1`

### 2. Add one dedicated operator surface

Recommended route:

- `GET /internal/post-phase26-ubuntu-ssh-recovery/latest`

Recommended admin section:

- `Latest post-phase26 Ubuntu SSH recovery`

That surface should expose:

- Ubuntu SSH truth and failure kind
- exact Ubuntu repo path and hash
- canonical upstream truth
- reverse-tunnel task state
- listener retention truth
- ready-worker count
- external `healthz`, `models`, and `chat` truth
- execution host
- token source
- compatibility version
- verdict

### 3. Keep execution GitHub-first

The live run should explicitly require:

- Windows checkout sync from GitHub branch `windows-browser-block-api-20260331`
- Ubuntu live repo sync from the same branch
- no local-only archive as source of truth
- authenticated smoke from the host that actually has the bearer token

## Risks And Constraints

- preserve-first remains mandatory on the Windows browser-block host
- Ubuntu SSH reachability is now part of rollout readiness, because the canonical public owner lives there
- reverse SSH tunnels are now runtime-critical infrastructure, not a helper detail
- missing token on one host is not proof of public API failure
- no final `externally_ready` verdict should be accepted if repo-backed sync still needs ad-hoc post-pull fixes or if the reverse-tunnel task still does not retain `Running`
