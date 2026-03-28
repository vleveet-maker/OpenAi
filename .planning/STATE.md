---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Rollout Stability
status: blocked
stopped_at: Phase 10.3 completed with an alternate-desktop runtime decision that still keeps Phase 11 blocked; next step is `$gsd-insert-phase 10.4 "Alternate desktop auth and bootstrap stabilization"`
last_updated: "2026-03-28T21:12:00+03:00"
last_activity: 2026-03-28 -- completed Phase 10.3, selected alternate desktop as the leading non-visible direction, and kept Phase 11 blocked on live evidence
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 15
  completed_plans: 15
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.
**Current focus:** Follow-up needed after Phase 10.3 alternate-desktop proof

## Current Position

Phase: 10.3 complete, Phase 11 blocked pending follow-up
Plan: 3 of 3 complete
Milestone: `v1.2 Rollout Stability`
Status: Blocked pending alternate-desktop stabilization follow-up
Last activity: 2026-03-28 -- completed Phase 10.3 and kept Phase 11 blocked after bounded live proof failed to produce `phase11Ready=true`

Progress: [#######---] 75%

## Milestone Snapshot

- Phases completed: `4 / 6`
- Plans completed: `15 / 15`
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
- The proxied host-native pool can now be controlled from `/internal/admin` and defaults to alternate desktop runtime for routine use.
- Visible interactive browser use is now explicit and limited to `Start visible login` or `Start visible reauth`.
- Hidden-runtime auth loss after manual login is now treated as `architecture review required`, not as a silent retry opportunity.
- Phase 10.2 selected runtime decision `block_phase_11_pending_new_runtime_design`; the current selected runtime for Phase 11 is none because both reviewed non-visible runtime paths are rejected for rollout use.
- Phase 10.3 is now complete and has moved routine host control to `alternate_desktop` / `host_alternate_desktop` as the leading non-visible runtime direction.
- Phase 10.3 bounded live proof still did not produce `phase11Ready=true`, so Phase 11 remains blocked.
- A fresh user chat still goes through explicit bootstrap state and prefers `Temporary Chat` plus the latest configured reasoning model.
- The intended future user-facing shape remains a standard mobile chat UX with a chat list, create-new-chat, image attachment, and chat continuity across browser workers.
- Live comparison now confirms that visible interactive auth and alternate desktop must be evaluated as separate runtime classes, not as equivalent views of the same reliable session state.

### Remaining Rollout Debt

- Current host hidden runtime is rejected for rollout: live evidence includes Cloudflare challenge URLs and bounded hidden-runtime probe failure.
- The explicit `docker_headed_xvfb` candidate is also rejected for Phase 11 as currently implemented: live bootstrap on `worker-dad` returned `bootstrap_challenge_detected`.
- Alternate desktop is now the best non-visible native direction, but the bounded live proof still produced `dad -> bootstrap_auth_required`, `wife -> temporary_confirmation_not_found`, and `shared-1 -> assignment timeout`.
- Phase 11 stays blocked until a follow-up stabilization step gets at least one worker to `phase11Ready=true`.

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
- Phase 10.3 inserted after Phase 10: Alternative non-visible native browser runtime design (URGENT)
- Phase 10.3 planned: same-session alternate desktop is the primary replacement non-visible runtime candidate, and Phase 11 stays blocked until execution writes an explicit runtime decision
- Phase 10.3 executed: alternate desktop launcher, control-plane integration, and live proof landed; the runtime is better than the rejected hidden path but still not rollout-ready, so the next required action is a stabilization follow-up before Phase 11

## Session Continuity

Last session: 2026-03-28 21:12
Stopped at: Phase 10.3 completed with an alternate-desktop runtime decision that still keeps Phase 11 blocked; next step is `$gsd-insert-phase 10.4 "Alternate desktop auth and bootstrap stabilization"`
Resume file: .planning/ROADMAP.md
