---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 26 local Waves 1-2 complete; next action is GitHub-backed host verification and authenticated external smoke
last_updated: "2026-04-12T10:24:51.674Z"
last_activity: 2026-04-12 -- Phase 26 local Waves 1-2 completed; live host verification pending
progress:
  total_phases: 38
  completed_phases: 37
  total_plans: 114
  completed_plans: 126
  percent: 97
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-12)

**Core value:** A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.
**Current focus:** Phase 26 — deployed-ubuntu-sync-recovery-reverse-tunnel-task-retention-and-external-authenticated-smoke-restoration

## Current Position

Phase: 26 (deployed-ubuntu-sync-recovery-reverse-tunnel-task-retention-and-external-authenticated-smoke-restoration) — EXECUTING
Plan: 2 of 3
Milestone: `v1.2 Rollout Stability`
Status: Executing Phase 26
Last activity: 2026-04-12 -- Phase 26 local Waves 1-2 completed; live host verification pending

Progress: [#########-] 97%

## Milestone Snapshot

- Phases completed: `37 / 38`
- Plans completed: `111 / 114`
- Current roadmap: `.planning/ROADMAP.md`
- Current requirements: `.planning/REQUIREMENTS.md`

## Carry-Forward Context

### Decisions

- Browser relay through managed ChatGPT web sessions remains the product shape.
- Manual operator login and reauthentication remain the deliberate safety model.
- Compact visible runtime remains the official rollout baseline for `v1.2`.
- The deployed Windows host remains preserve-first: no profile deletion, cookie clearing, local-storage clearing, blind full-pool restart, or mass relogin.
- The canonical public API path is now `internet -> MikroTik -> Ubuntu nginx -> 127.0.0.1:4010`.
- Windows `Caddy` is no longer part of the active public edge path; the Windows host now only exposes loopback `4040` and `8081`.
- Reverse SSH tunnels from Windows workers to Ubuntu are now the critical dependency for external chat.
- Cross-host file handoff is now GitHub-first: when another host or agent needs files, publish them to GitHub, replace the old tracked version there, and give the receiving agent a prompt that points to the GitHub source instead of a local-only archive.
- Authenticated external smoke should run from whichever host actually has a valid bearer token while still targeting the public path `77.66.186.75`; absence of a token on the Windows host is not itself evidence that the API is broken.
- Phase 25 local Wave 1 backported the tunnel/task/topology truth and added the canonical external-readiness wrapper.
- Phase 25 local Wave 2 added `GET /internal/post-phase24-external-api-readiness/latest` and the matching `/internal/admin` section.
- Phase 25 is now complete with `hold_rollout`: the deployed Windows host synced branch `windows-browser-block-api-20260331` at commit `8d269d6`, reran parser/tests/build successfully, and wrote the external-readiness artifact, but Ubuntu sync/topology could not be re-verified and the reverse-tunnel task did not stay running.
- The final Phase 25 live truth is explicit: `7/9 ready`, reverse-tunnel task `Ready` with `LastTaskResult=1`, Windows `Caddy` absent, and outside proof regressed to `/healthz=404`, `/v1/models=404`, `/v1/chat/completions=501`.
- Phase 26 is now in live-checkpoint state: local Waves 1-2 are complete, and the remaining work is the GitHub-backed Ubuntu plus Windows verification plus the final authenticated external smoke.

### Remaining Rollout Debt

- Ubuntu sync/topology still needs to be re-verified from the GitHub-backed path on the real public-owner host.
- The reverse-tunnel scheduled task still needs one live proof that it stays `Running` long enough to keep the Ubuntu listener set present.
- Authenticated external smoke still needs to be rerun from a host that actually has the bearer token and matches the new Phase 26 wrapper contract.
- The final external-readiness verdict remains pending until the live artifact, route/admin surface, and authenticated smoke all agree.

## Session Continuity

Last session: 2026-04-12
Stopped at: Phase 26 local Waves 1-2 complete; next action is GitHub-backed host verification and authenticated external smoke

## Accumulated Context

### Roadmap Evolution

- Phase 26 added: Deployed Ubuntu sync recovery, reverse-tunnel task retention, and external authenticated smoke restoration
- Phase 26 planned: repo-backed Ubuntu sync recovery, reverse-tunnel task retention, operator-surface visibility, and authenticated external smoke restoration split into three waves
- Phase 26 local Wave 1 complete: live-fix backport, canonical restoration wrapper, GitHub-first handoff prompt, and docs landed
- Phase 26 local Wave 2 complete: latest restoration route, `/internal/admin` section, tests, and build landed
