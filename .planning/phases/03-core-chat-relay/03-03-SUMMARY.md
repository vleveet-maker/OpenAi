---
phase: 03-core-chat-relay
plan: 03
subsystem: ui
tags: [react, vite, polling, chat-ui, vitest]
requires:
  - phase: 03-core-chat-relay
    provides: public chat routes, session-local message history, and worker relay transport
provides:
  - shared-screen conversation history rendering for the active timed session
  - pending assistant and closed-session composer behavior in the client
  - client tests for refresh, pending reply, reply completion, and closed-session history
affects: [phase-04, resilience, session-client]
tech-stack:
  added: [react, react-router-dom, vitest]
  patterns: [polling-based conversation hydration, single-shell multi-state chat UI, pending-reply composer lock]
key-files:
  created: []
  modified:
    - apps/session-client/src/session-types.ts
    - apps/session-client/src/session-api.ts
    - apps/session-client/src/use-session-view.ts
    - apps/session-client/src/app.tsx
    - apps/session-client/src/styles.css
    - apps/session-client/src/app.test.tsx
    - .gitignore
key-decisions:
  - "the client hydrates session snapshot and conversation snapshot together on bootstrap and every 5-second poll"
  - "queued and ended states keep the same session shell visible, but the composer copy explains why sending is blocked"
patterns-established:
  - "shared-screen chat UI always renders session history, even when sending is blocked"
  - "pending assistant placeholders are rendered as a dedicated bubble and disable the composer until polling returns a final reply"
requirements-completed: [CHAT-02, CHAT-03, CHAT-04]
duration: 10 min
completed: 2026-03-27
---

# Phase 03 Plan 03: Core Chat Relay Summary

**Shared-screen React chat UI with persisted conversation history, pending assistant bubbles, and closed-session history review**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-27T15:06:01+03:00
- **Completed:** 2026-03-27T15:15:00+03:00
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Extended the session client contract so it understands message history, pending assistant placeholders, and send permissions from the Phase 3 backend.
- Replaced the Phase 2 placeholder shell with a real shared-screen chat surface that keeps history visible across queued, active, and ended states.
- Added client coverage for refresh restore, pending assistant UX, poll-driven reply completion, and send blocking after session closure.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add client-side conversation types and public chat API helpers** - `136dcc3` (feat)
2. **Task 2: Replace the placeholder shell with active history and pending reply UI** - `fc257ce` (feat)
3. **Task 3: Add client coverage for send, pending, reply, and ended-history flows** - `2eebe73` (test)

**Plan metadata:** `pending` (docs: complete plan)

## Files Created/Modified
- `apps/session-client/src/session-types.ts` - Declares conversation snapshot and session message types for the public chat API.
- `apps/session-client/src/session-api.ts` - Adds client helpers for loading history and sending prompts through `/api/sessions/:sessionId/messages`.
- `apps/session-client/src/use-session-view.ts` - Hydrates session state and conversation state together, tracks pending replies, and exposes send behavior.
- `apps/session-client/src/app.tsx` - Renders message history, pending assistant bubbles, blocked composer copy, and closed-session review flow.
- `apps/session-client/src/styles.css` - Styles user, assistant, pending, and failed message bubbles while preserving the shared-screen layout.
- `apps/session-client/src/app.test.tsx` - Covers refresh restore, pending replies, poll completion, and closed-session send blocking.
- `.gitignore` - Ignores generated worker build output so verification builds do not leave the repo dirty.

## Decisions Made

- The client always polls both the session snapshot and the conversation snapshot together, which keeps timer, worker assignment, and message history aligned without adding a separate realtime channel.
- The same conversation shell stays visible for queued, active, and ended states so operators never lose context or history while a session changes lifecycle state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ignored generated worker build output to keep verification clean**
- **Found during:** Verification after Task 3
- **Issue:** Running the standard `workers/agent` build recreated `workers/agent/dist/` as an untracked directory, leaving the repo dirty after Phase 3 verification.
- **Fix:** Added `workers/agent/dist/` to `.gitignore` and removed the generated directory before final docs commit.
- **Files modified:** `.gitignore`
- **Verification:** `git status --short` returned clean after cleanup
- **Committed in:** `7d6563b`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix only affected repo hygiene for repeatable verification and did not change product scope.

## Issues Encountered

- A fake-timer polling test initially hung on async DOM queries; the final test was rewritten to use explicit timer advancement and microtask flushing so it matches the real polling contract deterministically.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 can now focus on retry, deduplication, reconnect, and worker recovery because the main send-receive chat loop is already visible end to end.
- The main residual risk is third-party ChatGPT DOM drift, so resilience work should preserve the selector fallback and failure-classification patterns established in Wave 2.

---
*Phase: 03-core-chat-relay*
*Completed: 2026-03-27*
