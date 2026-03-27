---
phase: 02-timed-session-access
plan: 02
subsystem: api
tags: [express, session-api, timer-enforcement, supertest]
requires:
  - phase: 02-01
    provides: durable session service and queueing semantics
provides:
  - Public session lifecycle API
  - Safe worker summaries on public routes
  - Internal recovery and restart hooks that cooperate with active sessions
affects: [phase-03-chat-relay, phase-04-worker-recovery]
tech-stack:
  added: [Supertest]
  patterns: [public session api, safe worker projections, route-level lifecycle tests]
key-files:
  created:
    - services/control-api/src/routes/public-sessions.ts
    - services/control-api/test/public-sessions.test.ts
    - services/control-api/vitest.config.ts
  modified:
    - services/control-api/src/server.ts
    - services/control-api/src/routes/internal-recovery.ts
    - services/control-api/src/routes/internal-worker-actions.ts
key-decisions:
  - "Kept the session API public and separate from internal worker and admin surfaces."
  - "Made reauth and restart flows terminate or resume sessions through the same session service instead of bypassing it."
patterns-established:
  - "Public API returns only session data, queue position, and a safe worker projection."
  - "Internal worker-state changes always flow through sessionService so queue consistency is preserved."
requirements-completed: [SESS-01, SESS-03, SESS-04]
duration: 24 min
completed: 2026-03-27
---

# Phase 02 Plan 02: Session API Summary

**Public timed-session API with create, resume, cancel, end, and safe worker-state integration around recovery flows**

## Performance

- **Duration:** 24 min
- **Started:** 2026-03-27T10:12:00Z
- **Completed:** 2026-03-27T10:36:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added public routes for create, read, cancel, end, and bootstrap session flows.
- Ensured public worker data stays safe and never exposes internal profile or recovery details.
- Wired internal restart and reauth routes into the same session engine so active sessions end cleanly when workers go unavailable.

## Task Commits

Phase 2 implementation was synchronized into GSD after inline execution, so this plan's work is captured in one integrated feature commit:

1. **Task 1: Add public session lifecycle routes** - `282ea5a` (feat)
2. **Task 2: Make internal worker controls cooperate with active sessions** - `282ea5a` (feat)
3. **Task 3: Cover public API and visibility boundaries with tests** - `282ea5a` (feat)

**Plan metadata:** recorded in the later docs commit after summary creation.

## Files Created/Modified
- `services/control-api/src/routes/public-sessions.ts` - Public API contract for timed sessions
- `services/control-api/src/server.ts` - Runtime integration for session store, service, and public routes
- `services/control-api/src/routes/internal-recovery.ts` - Reauth flow that now cooperates with active sessions
- `services/control-api/src/routes/internal-worker-actions.ts` - Restart and mark-ready flows with session safety checks
- `services/control-api/test/public-sessions.test.ts` - Route tests for lifecycle behavior and safe worker projection

## Decisions Made
- `requestedForLabel` stays a plain UI label with strict length validation and no authorization semantics.
- Public session routes return queue position only for queued sessions, keeping the contract minimal and Phase 3-friendly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The UI can poll one stable public API surface.
- Message relay can later block on `active` session state and reuse `GET /api/sessions/:id` as the resume anchor.

---
*Phase: 02-timed-session-access*
*Completed: 2026-03-27*
