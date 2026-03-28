---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Rollout Stability
status: ready_to_execute
stopped_at: Phase 10.2 planned in three waves; next step is `$gsd-execute-phase 10.2`
last_updated: "2026-03-28T19:34:00+03:00"
last_activity: 2026-03-28 -- Phase 10.2 planned to turn hidden-runtime failure into a prove-or-pivot runtime decision
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 12
  completed_plans: 9
  percent: 60
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.
**Current focus:** Phase 10.2 - Hidden runtime reliability review and alternative browser runtime decision

## Current Position

Phase: 10.2 (Hidden runtime reliability review and alternative browser runtime decision) - READY TO EXECUTE
Plan: 3 of 3
Milestone: `v1.2 Rollout Stability`
Status: Ready to execute Phase 10.2
Last activity: 2026-03-28 -- Phase 10.2 planned to turn hidden-runtime failure into a prove-or-pivot runtime decision

Progress: [######----] 60%

## Milestone Snapshot

- Phases completed: `2 / 5`
- Plans completed: `9 / 9`
- Current roadmap:
  - `.planning/ROADMAP.md`
- Current requirements:
  - `.planning/REQUIREMENTS.md`

## Carry-Forward Context

### Decisions

- Browser relay through managed ChatGPT web sessions is still the confirmed product shape.
- Manual operator login and reauthentication remain the deliberate safety model.
- Public and internal surfaces remain separated behind one edge and protected browser access flow.
- Host-native Chromium workers remain the proven fallback when Docker/browser fingerprinting blocks real login or relay.
- The proxied host-native pool can now be controlled from `/internal/admin` and defaults to hidden runtime for routine use.
- Visible interactive browser use is now explicit and limited to `Start visible login` or `Start visible reauth`.
- Hidden-runtime auth loss after manual login is now treated as `architecture review required`, not as a silent retry opportunity.
- A fresh user chat still goes through explicit bootstrap state and prefers `Temporary Chat` plus the latest configured reasoning model.
- The intended future user-facing shape remains a standard mobile chat UX with a chat list, create-new-chat, image attachment, and chat continuity across browser workers.
- Live comparison now confirms that visible interactive auth and hidden runtime must be evaluated as separate runtime classes, not as equivalent views of the same reliable session state.

### Remaining Rollout Debt

- Hidden runtime now has a stronger confirmed failure mode: on all three workers it reaches Cloudflare challenge URLs during bootstrap, while the same `wife` profile in visible auth reaches a normal logged-in ChatGPT page.
- Phase 9 is code-and-test verified, but it still needs a real smoke through `/internal/admin` against a running proxied host pool.
- Phase 10 fixed the current localized `Temporary Chat` and model-picker drift for visible-auth/live DOM paths, but hidden runtime still cannot be treated as a proven steady-state browser.
- Host-controller `pool/start` currently returns `start_requested`, but manual worker start proved more reliable than controller-driven restart during this live check and needs its own review.
- Phase 10.2 is now the explicit prove-or-pivot gate before Phase 11; rollout smoke confidence must follow the runtime decision it produces.

## Accumulated Context

### Roadmap Evolution

- v1.2 started: requirements and roadmap reset around internal orchestration, selector drift hardening, and rollout smoke confidence
- Phase 9 executed: host-controller gained symmetric pool stop, control-api added internal host-pool lifecycle routes, and internal admin now exposes `Start pool` / `Stop pool`
- Phase 10 executed partially: selector maintenance is centralized, current localized `Temporary Chat` onboarding and model selection are hardened, and live `smoke-ok` probes pass on `wife` and `shared-1`
- Phase 10 residual tail isolated: `dad` now reports `bootstrap_auth_required`, so the remaining blocker is manual reauth rather than generic selector drift
- Phase 10.1 inserted after Phase 10: Hidden runtime after manual login (URGENT)
- Phase 10.1 executed: host-native runtime now splits visible auth from hidden runtime, control-api exposes explicit transition routes, and a dedicated hidden-runtime validation probe plus docs are in place
- Phase 10.2 inserted after Phase 10: Hidden runtime reliability review and alternative browser runtime decision (URGENT)
- Phase 10.2 planned: Wave 1 fixes pool and worker truth, Wave 2 records bounded challenge evidence, and Wave 3 ends with a runtime keep-or-pivot decision for Phase 11

## Session Continuity

Last session: 2026-03-28 19:34
Stopped at: Phase 10.2 planned in three waves; next step is `$gsd-execute-phase 10.2`
Resume file: .planning/ROADMAP.md
