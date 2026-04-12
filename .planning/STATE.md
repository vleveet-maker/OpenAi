---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 27 local Waves 1-2 complete; next action is the deployed Ubuntu plus Windows live run
last_updated: "2026-04-12T15:42:00.000Z"
last_activity: 2026-04-12 -- Phase 27 local Waves 1-2 completed; live verification pending
progress:
  total_phases: 39
  completed_phases: 38
  total_plans: 117
  completed_plans: 116
  percent: 99
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-12)

**Core value:** A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.
**Current focus:** Phase 27 - deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion

## Current Position

Phase: 27 (deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion) - EXECUTING
Plan: 3 of 3
Milestone: `v1.2 Rollout Stability`
Status: Executing Phase 27 live follow-up
Last activity: 2026-04-12 -- Phase 27 local Waves 1-2 completed; live verification pending

Progress: [##########] 99%

## Milestone Snapshot

- Phases completed: `38 / 39`
- Plans completed: `116 / 117`
- Current roadmap: `.planning/ROADMAP.md`
- Current requirements: `.planning/REQUIREMENTS.md`

## Carry-Forward Context

### Decisions

- Browser relay through managed ChatGPT web sessions remains the product shape.
- Manual operator login and reauthentication remain the deliberate safety model.
- Compact visible runtime remains the official rollout baseline for `v1.2`.
- The deployed Windows host remains preserve-first: no profile deletion, cookie clearing, local-storage clearing, blind full-pool restart, or mass relogin.
- The canonical public API path is `internet -> MikroTik -> Ubuntu nginx -> 127.0.0.1:4010`.
- Windows `Caddy` is no longer part of the active public edge path; the Windows host now only exposes loopback `4040` and `8081`.
- Reverse SSH tunnels from Windows workers to Ubuntu are the runtime-critical dependency for external chat.
- Cross-host file handoff is GitHub-first: publish tracked files to GitHub and point receiving agents at the GitHub source instead of local-only archives.
- Authenticated external smoke should run from whichever host actually has a valid bearer token while still targeting the public path `77.66.186.75`; absence of a token on the Windows host is not itself proof that the API is broken.
- Phase 25 is complete with `hold_rollout`: the deployed Windows host synced branch `windows-browser-block-api-20260331` at commit `8d269d6`, reran parser/tests/build successfully, and wrote the external-readiness artifact, but Ubuntu sync/topology could not be re-verified and the reverse-tunnel task did not stay running.
- Phase 26 is complete with `hold_rollout`: the repo-backed Windows run reached commit `8317e78`, the latest-state route and `/internal/admin` were confirmed, but Ubuntu SSH still blocked the exact topology re-check, the reverse-tunnel task fell back to `Ready` with `LastTaskResult=1`, Ubuntu listener ports were missing, and the accessible Windows-host outside proof stayed at `404/404/501`.
- Phase 27 local Waves 1-2 are now complete: the canonical Ubuntu-SSH wrapper, GitHub-first prompt, latest-state route, and `/internal/admin` section all landed and passed local verification.

### Remaining Rollout Debt

- Ubuntu SSH access to `mi50@77.66.186.75:2222` still needs to be recovered so the exact live repo path, live hash, and local relay topology can be re-verified from tracked assets.
- The reverse-tunnel scheduled task still needs durable proof that it stays `Running` long enough to keep Ubuntu listener ports `14021..14027` and `14040`.
- Authenticated external smoke still needs one repo-backed run from a host that actually has a bearer token.

## Session Continuity

Last session: 2026-04-12
Stopped at: Phase 27 local Waves 1-2 complete; next action is the deployed Ubuntu plus Windows live run

## Accumulated Context

### Roadmap Evolution

- Phase 26 added: Deployed Ubuntu sync recovery, reverse-tunnel task retention, and external authenticated smoke restoration
- Phase 26 planned: repo-backed Ubuntu sync recovery, reverse-tunnel task retention, operator-surface visibility, and authenticated external smoke restoration split into three waves
- Phase 26 local Wave 1 complete: live-fix backport, canonical restoration wrapper, GitHub-first handoff prompt, and docs landed
- Phase 26 local Wave 2 complete: latest restoration route, `/internal/admin` section, tests, and build landed
- Phase 26 complete: the repo-backed Windows run reached commit `8317e78`, the route/admin surface was confirmed live, but Ubuntu SSH stayed blocked, the reverse-tunnel task did not stay `Running`, listeners were missing, and the final external proof stayed at `/healthz=404`, `/v1/models=404`, `/v1/chat/completions=501`
- Phase 27 added: Deployed Ubuntu SSH recovery, reverse-tunnel task retention, and authenticated external smoke completion
- Phase 27 planned: repo-backed Ubuntu SSH recovery, reverse-tunnel task retention, operator-surface visibility, and authenticated external smoke completion split into three waves
- Phase 27 local Wave 1 complete: canonical Ubuntu-SSH wrapper, GitHub-first host prompt, and exact docs landed
- Phase 27 local Wave 2 complete: latest Ubuntu-SSH recovery route, `/internal/admin` section, tests, and build landed
