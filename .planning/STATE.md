---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Rollout Stability
status: ready_to_execute
stopped_at: Phase 10.1 planned; next step is `$gsd-execute-phase 10.1`
last_updated: "2026-03-28T23:25:00+03:00"
last_activity: 2026-03-28 -- Planned urgent Phase 10.1 for hidden runtime after manual login
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 9
  completed_plans: 6
  percent: 67
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.
**Current focus:** `Phase 10.1: Hidden runtime after manual login` is planned and ready to execute

## Current Position

Milestone: `v1.2 Rollout Stability`
Status: Ready to execute
Last activity: 2026-03-28 - Planned urgent Phase 10.1 for hidden runtime after manual login

Progress: [#######---] 67%

## Milestone Snapshot

- Phases completed: `1 / 4`
- Plans completed: `6 / 6`
- Current roadmap:
  - `.planning/ROADMAP.md`
- Current requirements:
  - `.planning/REQUIREMENTS.md`

## Carry-Forward Context

### Decisions

- Browser relay through managed ChatGPT web sessions is still the confirmed product shape.
- Manual operator login and reauthentication remain the deliberate safety model.
- Public and internal surfaces remain separated behind one edge and protected browser access flow.
- Host-native Chromium workers are now the proven fallback when Docker/browser fingerprinting blocks real login or relay.
- The verified operator path for host-native rollout now goes through `/internal/admin` with `Start pool` and `Stop pool`, while PowerShell scripts remain fallback tools.
- A fresh user chat now goes through explicit bootstrap state and is blocked until a clean `Temporary Chat` plus preferred-model selection is ready or failed clearly.
- The current implementation defines "new chat" as the fresh conversation prepared for a newly active timed session, not yet several independent chats inside one active session.
- The intended future user-facing shape is now explicit: standard mobile chat UX, chat list, create-new-chat, image attachment, and app-level chat continuity across browser workers.
- `v1.2` intentionally prioritizes rollout reliability over new product surface area.

### Remaining Rollout Debt

- `dad` no longer fails with opaque selector drift. The remaining live blocker is `bootstrap_auth_required`, which means that specific host-native profile still needs manual ChatGPT reauthentication before the final three-worker proof can pass.
- Host-native browser windows currently launch minimized and stop cleanly when idle, but routine active use still opens real local windows. Phase 10.1 exists to remove that remaining operator-facing behavior.
- Phase 10 fixed the current localized `Temporary Chat` and model-picker drift on `wife` and `shared-1`, but future ChatGPT UI changes can still reintroduce fresh-chat or relay breakage.
- Phase 9 is code-and-test verified, but it has not yet been live-smoked end-to-end through the real `/internal/admin` operator flow against a running proxied pool.

## Accumulated Context

### Roadmap Evolution

- Phase 8 added: Per-chat Temporary Chat isolation and latest reasoning model selection
- Phase 8 planned: context, research, validation, and 3 execution plans written
- Phase 8 executed: durable bootstrap state, worker Temporary Chat automation, shared-screen preparing/ready/failed UX, and operator docs completed
- v1.1 milestone audited: no blockers found, status recorded as tech_debt because of selector drift and live-only validation tails
- Phase 7 validated: automated proxy/config coverage documented and live host/browser checks captured as manual-only
- Phase 8 validated: automated bootstrap coverage documented and live ChatGPT UI checks captured as manual-only
- v1.1 milestone archived: roadmap, requirements, and audit moved into `.planning/milestones/`
- v1.2 started: requirements and roadmap reset around internal orchestration, selector drift hardening, and rollout smoke confidence
- Phase 9 context gathered: pool-level admin controls only, reuse existing admin page, and treat partial start as degraded without auto-rollback
- Future product direction captured: mobile multi-chat UX with image attachment and chat-to-browser continuity preserved as seed material outside rollout scope
- Phase 9 planned: host-controller stop contract, control-api pool lifecycle service, admin controls, and validation map written
- Phase 9 executed: host-controller gained symmetric pool stop, control-api added internal host-pool lifecycle routes, and internal admin now exposes `Start pool` / `Stop pool`
- Phase 10 planned: centralized selector contracts, current-ui relay hardening, targeted live relay verification, and Temporary Chat/model drift hardening
- Phase 10 executed partially: selector maintenance is centralized, current localized `Temporary Chat` onboarding and model selection are hardened, and live `smoke-ok` probes pass on `wife` and `shared-1`
- Phase 10 residual tail isolated: `dad` now reports `bootstrap_auth_required`, so the remaining blocker is manual reauth rather than generic selector drift
- Phase 10.1 inserted after Phase 10: Hidden runtime after manual login (URGENT)
- Phase 10.1 planned: visible-auth and hidden-runtime split, internal transition controls, and hidden-runtime validation path documented in 3 plans

## Session Continuity

Last session: 2026-03-28 22:35
Stopped at: Phase 10.1 planned; next step is `$gsd-execute-phase 10.1`
Resume file: .planning/phases/10.1-hidden-runtime-after-manual-login/10.1-CONTEXT.md
