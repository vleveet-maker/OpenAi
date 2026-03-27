---
phase: 03-core-chat-relay
plan: 01
subsystem: api
tags: [sqlite, express, vitest, supertest, chat-relay]
requires:
  - phase: 02-timed-session-access
    provides: timed session lifecycle, worker pinning, and shared-screen session bootstrap
provides:
  - durable session-scoped chat history in control-api
  - public chat routes for send and history listing
  - pending assistant placeholder contract before worker relay runs
affects: [worker-agent, session-client, phase-03]
tech-stack:
  added: [better-sqlite3, express, vitest, supertest]
  patterns: [session-scoped message history, pending placeholder relay contract, async relay dispatch]
key-files:
  created:
    - services/control-api/src/chat/chat-types.ts
    - services/control-api/src/chat/chat-store.ts
    - services/control-api/src/chat/chat-relay-service.ts
    - services/control-api/src/routes/public-chat.ts
    - services/control-api/test/chat-relay-service.test.ts
    - services/control-api/test/public-chat.test.ts
  modified:
    - services/control-api/src/server.ts
key-decisions:
  - "control-api now owns durable current-session chat history instead of delegating conversation truth to worker-agent"
  - "accepted sends create a complete user message and a pending assistant placeholder before relay transport begins"
patterns-established:
  - "Public chat routes return a session-local conversation snapshot with canSend and pendingAssistantMessageId"
  - "Assistant placeholder rows are created immediately and resolved later by relay completion or failure"
requirements-completed: [CHAT-01, CHAT-03, CHAT-04]
duration: 4 min
completed: 2026-03-27
---

# Phase 03 Plan 01: Core Chat Relay Summary

**Session-scoped chat history with pending assistant placeholders and public `/messages` routes on control-api**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T11:50:01Z
- **Completed:** 2026-03-27T11:54:44Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added a durable `session_messages` SQLite table and chat message model alongside the Phase 2 session store.
- Implemented `ChatRelayService` with active-session send rules, pending assistant placeholders, and async relay dispatch hooks.
- Exposed public `GET` and `POST /api/sessions/:sessionId/messages` routes and covered the contract with unit and route tests.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add durable session-chat types and storage** - `1fc0ef2` (feat)
2. **Task 2: Implement relay orchestration rules and public chat routes** - `307e470` (feat)
3. **Task 3: Cover relay rules and public chat routes with control-api tests** - `03b67d7` (test)

**Plan metadata:** `pending` (docs: complete plan)

## Files Created/Modified
- `services/control-api/src/chat/chat-types.ts` - Shared relay types, conversation snapshot, and transport contract.
- `services/control-api/src/chat/chat-store.ts` - SQLite-backed message store for session history and pending assistant lookup.
- `services/control-api/src/chat/chat-relay-service.ts` - Send rules, placeholder lifecycle, and async dispatch handling.
- `services/control-api/src/routes/public-chat.ts` - Public send and history routes for the shared-screen app.
- `services/control-api/src/server.ts` - Runtime wiring for the chat store, relay service, and public chat router.
- `services/control-api/test/chat-relay-service.test.ts` - Unit coverage for active-only send rules and placeholder completion/failure.
- `services/control-api/test/public-chat.test.ts` - Route coverage for send/history API and internal-field boundary checks.

## Decisions Made

- `control-api` became the canonical owner of current-session message history so later worker/browser failures cannot erase conversation truth.
- The public chat API returns a full conversation snapshot with `canSend` and `pendingAssistantMessageId`, which keeps the Phase 3 client polling model simple.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Made message ordering deterministic between user and pending assistant rows**
- **Found during:** Task 3 (Cover relay rules and public chat routes with control-api tests)
- **Issue:** User and assistant placeholder rows shared the same timestamp, so SQLite ordering could surface the blank assistant row before the user message.
- **Fix:** Stamped the pending assistant placeholder one millisecond after the user message so history remains human-ordered and stable for the UI.
- **Files modified:** `services/control-api/src/chat/chat-relay-service.ts`
- **Verification:** `cmd /c npm.cmd test` in `services/control-api`
- **Committed in:** `03b67d7`

**2. [Rule 3 - Blocking] Closed SQLite test handles before temp-directory cleanup on Windows**
- **Found during:** Task 3 (Cover relay rules and public chat routes with control-api tests)
- **Issue:** Windows kept temporary SQLite files locked during failing test cleanup, which caused `EPERM` teardown failures.
- **Fix:** Added explicit cleanup callback tracking so each runtime closes `SessionService` and `ChatStore` before the temp directory is removed.
- **Files modified:** `services/control-api/test/chat-relay-service.test.ts`, `services/control-api/test/public-chat.test.ts`
- **Verification:** `cmd /c npm.cmd test` in `services/control-api`
- **Committed in:** `03b67d7`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes were required for reliable history ordering and stable test execution. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `control-api` now has a durable chat contract that Wave 2 can connect to a real worker relay transport.
- The next plan only needs to plug in worker-agent browser automation and resolve pending assistant placeholders with actual replies or failures.

---
*Phase: 03-core-chat-relay*
*Completed: 2026-03-27*
