---
phase: 02-timed-session-access
plan: 01
subsystem: backend
tags: [sqlite, session-routing, queue, timers, worker-assignment]
requires:
  - phase: 01-01
    provides: worker runtime and status contract
  - phase: 01-02
    provides: control-api registry and worker identity
provides:
  - Durable SQLite session store
  - FIFO queue and least-recently-assigned worker selection
  - Startup rehydrate and background timer sweep
affects: [phase-02-public-api, phase-03-chat-relay, phase-04-recovery]
tech-stack:
  added: [better-sqlite3, Vitest]
  patterns: [server-side session queue, worker pinning, restart rehydrate]
key-files:
  created:
    - services/control-api/src/sessions/session-types.ts
    - services/control-api/src/sessions/session-store.ts
    - services/control-api/src/sessions/session-service.ts
  modified:
    - services/control-api/src/config.ts
    - services/control-api/src/workers/worker-registry.ts
    - infra/docker-compose.yml
key-decisions:
  - "Stored sessions durably in SQLite so queue and active-session state survive control-api restart."
  - "Kept one global FIFO queue and least-recently-assigned ready worker selection instead of profile affinity."
patterns-established:
  - "Timed sessions are authoritative on the server and own worker busy or ready transitions."
  - "Worker assignment metadata lives in the registry, while queue truth lives in SQLite."
requirements-completed: [SESS-01, SESS-02]
duration: 32 min
completed: 2026-03-27
---

# Phase 02 Plan 01: Session Engine Summary

**Durable SQLite-backed timed-session queue with FIFO promotion, worker pinning, restart rehydrate, and timer sweep**

## Performance

- **Duration:** 32 min
- **Started:** 2026-03-27T09:40:00Z
- **Completed:** 2026-03-27T10:12:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added a durable `sessions` table and explicit Phase 2 session types.
- Implemented queue promotion, least-recently-assigned worker selection, and active-session pinning.
- Added startup rehydrate plus background expiry handling so active sessions survive restart and end cleanly.

## Task Commits

Phase 2 implementation was synchronized into GSD after inline execution, so this plan's work is captured in one integrated feature commit:

1. **Task 1: Add durable session types, store, and config surface** - `282ea5a` (feat)
2. **Task 2: Implement queue, assignment, timer, and rehydrate orchestration** - `282ea5a` (feat)
3. **Task 3: Wire durable session storage into local infrastructure** - `282ea5a` (feat)

**Plan metadata:** recorded in the later docs commit after summary creation.

## Files Created/Modified
- `services/control-api/src/sessions/session-types.ts` - Canonical timed-session and end-reason types
- `services/control-api/src/sessions/session-store.ts` - SQLite persistence, queue ordering, and lookup helpers
- `services/control-api/src/sessions/session-service.ts` - Queue reconciliation, activation, expiry, and rehydrate logic
- `services/control-api/src/workers/worker-registry.ts` - Assignment label and last-assigned metadata for routing
- `infra/docker-compose.yml` - Durable mount and runtime env vars for the session database

## Decisions Made
- SQLite is good enough for the current one-household deployment and avoids introducing a separate database service in Phase 2.
- Timer ownership stays in the control API so the browser worker remains a runtime target, not a session source of truth.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Public session routes can now expose an already-stable queue and lifecycle contract.
- Chat relay can rely on `active` session state and pinned `workerId` instead of inventing its own reservation logic.

---
*Phase: 02-timed-session-access*
*Completed: 2026-03-27*
