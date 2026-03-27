---
phase: 03-core-chat-relay
plan: 02
subsystem: api
tags: [playwright, worker-agent, vitest, relay-runner, internal-api]
requires:
  - phase: 03-core-chat-relay
    provides: durable chat history, pending placeholder contract, public chat routes
provides:
  - worker-agent relay runtime and internal relay endpoint
  - Playwright relay runner with selector fallbacks and reply stabilization
  - control-api worker relay client that resolves pending assistant placeholders
affects: [session-client, resilience, phase-03]
tech-stack:
  added: [playwright, vitest]
  patterns: [worker-side relay endpoint, quiescence-based assistant capture, async placeholder resolution]
key-files:
  created:
    - workers/agent/tsconfig.json
    - workers/agent/vitest.config.ts
    - workers/agent/src/chat-relay/relay-types.ts
    - workers/agent/src/chat-relay/selector-map.ts
    - workers/agent/src/chat-relay/relay-runner.ts
    - workers/agent/test/relay-runner.test.ts
    - services/control-api/src/chat/worker-relay-client.ts
  modified:
    - workers/agent/package.json
    - workers/agent/src/browser-launch.ts
    - workers/agent/src/server.ts
    - services/control-api/src/server.ts
    - services/control-api/test/chat-relay-service.test.ts
    - services/control-api/test/public-chat.test.ts
key-decisions:
  - "worker-agent now owns browser submission and reply capture, while control-api keeps canonical message history"
  - "assistant replies are treated as complete only after text stabilization and no visible generation indicator"
patterns-established:
  - "worker relay routes return structured assistantText/completedAt/failureCode payloads"
  - "control-api resolves pending assistant placeholders from transport results without blocking the original send response"
requirements-completed: [CHAT-01, CHAT-02, CHAT-03]
duration: 9 min
completed: 2026-03-27
---

# Phase 03 Plan 02: Core Chat Relay Summary

**Worker-agent Playwright relay runner with internal `/internal/relay/messages` plus control-api transport wiring back into pending assistant placeholders**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-27T11:55:45Z
- **Completed:** 2026-03-27T12:03:16Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- Added worker-agent build and test scaffolding plus a runtime that keeps the persistent browser context ready for relay requests.
- Implemented selector-based Playwright relay execution with fallback composer lookup, send behavior, assistant stabilization, and timeout handling.
- Wired control-api to call the worker relay endpoint and automatically resolve pending assistant placeholders into complete or failed message rows.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add worker-agent build, test, and relay route scaffolding** - `5e22c26` (feat)
2. **Task 2: Implement Playwright prompt submission and assistant reply capture** - `449cf6a` (feat)
3. **Task 3: Wire the real worker relay client into control-api completion flow** - `0957838` (feat)

**Plan metadata:** `pending` (docs: complete plan)

## Files Created/Modified
- `workers/agent/tsconfig.json` - TypeScript build config for the worker-agent package.
- `workers/agent/vitest.config.ts` - Node-based test runner config for relay tests.
- `workers/agent/src/chat-relay/relay-types.ts` - Internal worker relay request and result contract.
- `workers/agent/src/chat-relay/selector-map.ts` - Centralized composer, send-button, assistant-turn, and generating-indicator selectors.
- `workers/agent/src/chat-relay/relay-runner.ts` - Playwright relay execution with lock, stabilization window, and timeout/failure codes.
- `workers/agent/src/server.ts` - Worker runtime wiring that exposes `/internal/relay/messages`.
- `workers/agent/test/relay-runner.test.ts` - Fake-page coverage for success, fallback, and timeout relay paths.
- `services/control-api/src/chat/worker-relay-client.ts` - Fetch-based transport to the worker internal relay route.
- `services/control-api/src/server.ts` - Runtime wiring so accepted sends now dispatch to the assigned worker.
- `services/control-api/test/chat-relay-service.test.ts` - Added async success/failure resolution coverage for pending placeholders.
- `services/control-api/test/public-chat.test.ts` - Kept route tests isolated from live worker network calls.

## Decisions Made

- Kept the worker relay contract internal and structured, so later resilience phases can reason about `failureCode` without scraping logs.
- Used a quiescence-based completion rule instead of naive sleeps, which keeps the relay usable even if the assistant edits the last message while generating.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed worker-agent dependencies and committed `package-lock.json`**
- **Found during:** Task 1 (Add worker-agent build, test, and relay route scaffolding)
- **Issue:** `npm run build` could not execute because the new local TypeScript and Vitest tooling was not installed in `workers/agent`.
- **Fix:** Ran `npm install` in `workers/agent` and committed the generated `package-lock.json` so the package is reproducible.
- **Files modified:** `workers/agent/package-lock.json`
- **Verification:** `cmd /c npm.cmd run build` in `workers/agent`
- **Committed in:** `5e22c26`

**2. [Rule 1 - Bug] Switched Playwright persistent-context typing to a signature-derived type**
- **Found during:** Task 1 (Add worker-agent build, test, and relay route scaffolding)
- **Issue:** The installed Playwright version does not export `LaunchPersistentContextOptions`, so the new worker build failed even though runtime behavior was correct.
- **Fix:** Derived the type from `Parameters<typeof chromium.launchPersistentContext>[1]` in `browser-launch.ts`.
- **Files modified:** `workers/agent/src/browser-launch.ts`
- **Verification:** `cmd /c npm.cmd run build` in `workers/agent`
- **Committed in:** `5e22c26`

**3. [Rule 2 - Missing Critical] Isolated public chat route tests from real worker network calls**
- **Found during:** Task 3 (Wire the real worker relay client into control-api completion flow)
- **Issue:** Once control-api began dispatching to worker agents by default, the route tests would have depended on DNS and live containers instead of a deterministic local fake transport.
- **Fix:** Passed a fake relay transport into the route-test runtime so public API coverage stays fast and hermetic.
- **Files modified:** `services/control-api/test/public-chat.test.ts`
- **Verification:** `cmd /c npm.cmd test` in `services/control-api`
- **Committed in:** `0957838`

---

**Total deviations:** 3 auto-fixed (1 bug, 1 missing critical, 1 blocking)
**Impact on plan:** All three fixes tightened build reproducibility and test isolation without changing intended product scope.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The backend now produces real relay results, so the final remaining work is purely on the shared-screen client.
- `03-03` can focus on conversation history rendering, pending UI, and composer enable/disable behavior without introducing new backend contracts.

---
*Phase: 03-core-chat-relay*
*Completed: 2026-03-27*
