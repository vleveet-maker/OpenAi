---
phase: 01-managed-worker-pool-foundation
plan: 03
subsystem: ops
tags: [playwright, recovery, admin, security]
requires:
  - phase: 01-01
    provides: manual-auth runtime invariants and worker topology
  - phase: 01-02
    provides: control-api bootstrap and named worker registry
provides:
  - Persistent-profile Playwright launch primitives
  - Internal-only recovery and restart routes
  - Operator playbook for first login, reauthentication, and restart
affects: [phase-02-session-routing, phase-04-worker-recovery, admin-ops]
tech-stack:
  added: [Playwright]
  patterns: [internal admin guard, bounded reauth sessions, manual operator login workflow]
key-files:
  created:
    - workers/agent/src/browser-launch.ts
    - workers/agent/src/recovery-session.ts
    - services/control-api/src/security/internal-admin-guard.ts
    - services/control-api/src/routes/internal-recovery.ts
    - services/control-api/src/routes/internal-worker-actions.ts
    - docs/internal-worker-ops.md
  modified:
    - services/control-api/src/server.ts
key-decisions:
  - "Made persistent browser launch explicit through Playwright launchPersistentContext against /srv/chatgpt-workers/profiles."
  - "Protected worker action and reauth endpoints with an internal admin guard instead of exposing them as public app APIs."
patterns-established:
  - "Manual login is a first-class operational workflow, not an exception path."
  - "Recovery sessions are bounded and worker state returns to ready only after explicit operator completion."
requirements-completed: [WORK-04, ADMN-01, ADMN-04, SECU-02, SECU-03]
duration: 14 min
completed: 2026-03-27
---

# Phase 01 Plan 03: Recovery Operations Summary

**Persistent Playwright browser launch, internal-only recovery controls, and a household operator playbook for manual login workflows**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-27T09:20:00Z
- **Completed:** 2026-03-27T09:34:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added explicit persistent-profile browser launch primitives rooted at `/srv/chatgpt-workers/profiles/<worker-name>`.
- Protected restart and reauth flows behind an internal admin guard and mounted them through the control-api runtime.
- Wrote the first internal worker operations playbook for setup, first login, reauthentication, restart, and failure triage.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement persistent-profile browser launch and recovery session primitives** - `24f1649` (feat)
2. **Task 2: Add internal-only restart and reauth routes with admin guard** - `de896b0` (feat)
3. **Task 3: Write the internal worker operations playbook** - `3f6c751` (docs)

**Plan metadata:** recorded in the later phase documentation commit after summary creation.

## Files Created/Modified
- `workers/agent/src/browser-launch.ts` - Persistent Playwright launch rooted at durable worker profile storage
- `workers/agent/src/recovery-session.ts` - Recovery-session model with workerId, startedAt, expiresAt, and bounded statuses
- `services/control-api/src/security/internal-admin-guard.ts` - Internal-only request guard for operator routes
- `services/control-api/src/routes/internal-recovery.ts` - Manual reauth start, status, and completion endpoints
- `services/control-api/src/routes/internal-worker-actions.ts` - Worker restart and mark-ready actions
- `docs/internal-worker-ops.md` - Household operator instructions for manual login and recovery

## Decisions Made
- Credentials stay out of the repo and out of service config; only the browser profile persists authenticated state.
- Manual operator login is the intended recovery path, so the API stops at "browser ready for operator action" instead of attempting headless auth.
- Internal routes are guarded at the control-api layer so raw worker recovery never becomes part of the public application contract.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 can safely assign users only to `ready` workers because `reauth_required` and restart flows now exist.
- Phase 4 can extend the same recovery endpoints into richer observability and restart orchestration without changing the security boundary.

---
*Phase: 01-managed-worker-pool-foundation*
*Completed: 2026-03-27*
