---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Rollout Stability
status: ready
stopped_at: Phase 25 local Waves 1 and 2 complete; next action is live 25-03 on the deployed Ubuntu and Windows hosts
last_updated: "2026-04-12T05:56:00.000Z"
last_activity: 2026-04-12 -- Phase 25 local Waves 1 and 2 completed with server handoff pending
progress:
  total_phases: 37
  completed_phases: 36
  total_plans: 111
  completed_plans: 110
  percent: 99
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-12)

**Core value:** A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.
**Current focus:** Phase 25 - deployed-windows-post-phase24-live-fix-smoke-wrapper-backport-and-persistent-disconnected-runtime-forced-host-public-owner-503-remediation

## Current Position

Phase: 25 (deployed-windows-post-phase24-live-fix-smoke-wrapper-backport-and-persistent-disconnected-runtime-forced-host-public-owner-503-remediation) - IN PROGRESS
Plan: 2 of 3
Milestone: `v1.2 Rollout Stability`
Status: Ready for live Phase 25 verification
Last activity: 2026-04-12 -- Phase 25 local Waves 1 and 2 completed with server handoff pending

Progress: [##########] 99%

## Milestone Snapshot

- Phases completed: `36 / 37`
- Plans completed: `110 / 111`
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
- Phase 25 local Wave 1 backported the tunnel/task/topology truth and added the canonical external-readiness wrapper.
- Phase 25 local Wave 2 added `GET /internal/post-phase24-external-api-readiness/latest` and the matching `/internal/admin` section.

### Remaining Rollout Debt

- Live Phase 25 still needs deployed-host verification on both Ubuntu and Windows.
- The reverse-tunnel scheduled task must be confirmed running on the Windows host after the Phase 25 overlay.
- Ubuntu must be re-confirmed as `80/443/8080 -> 127.0.0.1:4010` with live tunnel listeners `127.0.0.1:14021..14027` and `127.0.0.1:14040`.
- Authenticated external smoke still needs one final repeatable verdict: `externally_ready` or `hold_rollout`.

## Session Continuity

Last session: 2026-04-12
Stopped at: Phase 25 local Waves 1 and 2 complete; next action is live 25-03 on the deployed Ubuntu and Windows hosts
