---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Rollout Stability
status: blocked
stopped_at: Phase 10.2 completed with decision `block_phase_11_pending_new_runtime_design`; Phase 11 is blocked and a follow-up runtime design phase must be inserted
last_updated: "2026-03-28T19:48:00+03:00"
last_activity: 2026-03-28 -- Phase 10.2 completed with explicit runtime evidence and blocked Phase 11 pending a new runtime design
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 12
  completed_plans: 12
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.
**Current focus:** Follow-up runtime design before Phase 11 rollout smoke can continue

## Current Position

Phase: 11 blocked pending follow-up runtime design after Phase 10.2 decision
Plan: Phase 10.2 complete
Milestone: `v1.2 Rollout Stability`
Status: Blocked pending runtime-design insertion
Last activity: 2026-03-28 -- Phase 10.2 completed and selected runtime decision `block_phase_11_pending_new_runtime_design`

Progress: [########--] 75%

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
- Phase 10.2 selected runtime decision `block_phase_11_pending_new_runtime_design`; the current selected runtime for Phase 11 is none because both reviewed non-visible runtime paths are rejected for rollout use.
- A fresh user chat still goes through explicit bootstrap state and prefers `Temporary Chat` plus the latest configured reasoning model.
- The intended future user-facing shape remains a standard mobile chat UX with a chat list, create-new-chat, image attachment, and chat continuity across browser workers.
- Live comparison now confirms that visible interactive auth and hidden runtime must be evaluated as separate runtime classes, not as equivalent views of the same reliable session state.

### Remaining Rollout Debt

- Current host hidden runtime is rejected for rollout: live evidence includes Cloudflare challenge URLs and bounded hidden-runtime probe failure.
- The explicit `docker_headed_xvfb` candidate is also rejected for Phase 11 as currently implemented: live bootstrap on `worker-dad` returned `bootstrap_challenge_detected`.
- `/internal/workers` now exposes `runtimeCapability`, but Phase 11 is still blocked and a follow-up runtime design phase must be inserted before rollout smoke confidence can continue.
- Phase 9 still wants one end-to-end live smoke through `/internal/admin`, but that smoke is now downstream of the runtime-design blocker.

## Accumulated Context

### Roadmap Evolution

- v1.2 started: requirements and roadmap reset around internal orchestration, selector drift hardening, and rollout smoke confidence
- Phase 9 executed: host-controller gained symmetric pool stop, control-api added internal host-pool lifecycle routes, and internal admin now exposes `Start pool` / `Stop pool`
- Phase 10 executed partially: selector maintenance is centralized, current localized `Temporary Chat` onboarding and model selection are hardened, and live `smoke-ok` probes pass on `wife` and `shared-1`
- Phase 10 residual tail isolated: `dad` now reports `bootstrap_auth_required`, so the remaining blocker is manual reauth rather than generic selector drift
- Phase 10.1 inserted after Phase 10: Hidden runtime after manual login (URGENT)
- Phase 10.1 executed: host-native runtime now splits visible auth from hidden runtime, control-api exposes explicit transition routes, and a dedicated hidden-runtime validation probe plus docs are in place
- Phase 10.2 inserted after Phase 10: Hidden runtime reliability review and alternative browser runtime decision (URGENT)
- Phase 10.2 executed: Wave 1 added truthful startup and runtime-capability semantics, Wave 2 recorded bounded hidden-runtime evidence, and Wave 3 compared the explicit Docker/Xvfb candidate before blocking Phase 11 on a new runtime design

## Session Continuity

Last session: 2026-03-28 19:48
Stopped at: Phase 10.2 completed with decision `block_phase_11_pending_new_runtime_design`; selected runtime for Phase 11 is none and a follow-up runtime design phase must be inserted
Resume file: .planning/ROADMAP.md
