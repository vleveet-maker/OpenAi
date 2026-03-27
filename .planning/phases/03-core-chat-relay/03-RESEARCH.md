# Phase 3: Core Chat Relay - Research

**Completed:** 2026-03-27
**Question answered:** What do we need to know to plan and execute the first real ChatGPT relay loop well on top of the current worker pool and timed-session app?

## Findings

### Control Boundary

- The existing `control-api` already owns session truth, worker assignment, timer expiry, and public app routes, so Phase 3 should keep chat history and send eligibility authoritative there instead of moving conversation state into `worker-agent`.
- The current worker registry already knows `workerId`, `agentBaseUrl`, and active session assignment, which makes it the right bridge from a session-scoped send request to a specific worker browser.

### Persistent Browser Constraints

- Playwright documents `launchPersistentContext` as the persistent context API for storage such as cookies and local storage, and it warns that multiple browser instances cannot share the same `userDataDir`.
- That matches the current architecture exactly: one durable browser context per worker container remains the correct shape for Phase 3 relay and session affinity.

### Selector and Waiting Strategy

- Playwright recommends prioritizing user-facing locators and relies on actionability plus auto-waiting before actions such as click and fill.
- For this project, that means Phase 3 should use a role-first locator strategy for the composer and send controls, then keep CSS fallbacks centralized in one selector map instead of scattering brittle selectors across the relay flow.
- A reply-capture loop should wait on observable DOM changes and message-text stabilization, not raw sleeps, because Playwright's actionability and locator model work best when waits remain explicit and tied to page state.

### Public Product Fit

- The shared-screen app already polls every 5 seconds and does not use push transport. Because `CHAT-03` allows a pending or streaming state, Phase 3 can satisfy the requirement with a durable pending assistant placeholder instead of adding SSE or WebSocket transport right now.
- This keeps the first relay contract simple: send once, render history, show pending while the worker is generating, then replace the placeholder with the final assistant text on the next poll.

### Testing Posture

- `services/control-api` already has `Vitest` and `Supertest`, so relay-domain and public-route coverage should stay there.
- `workers/agent` currently has no TypeScript build or test harness, so Phase 3 should add `tsconfig`, `build`, and `Vitest` there before introducing meaningful relay automation.
- Browser automation against the live ChatGPT site should not be the main automated test path. The safer Phase 3 test strategy is unit coverage around selector helpers, relay runner logic, and control-api orchestration with fake transports or page doubles, plus one optional manual smoke test on a manually logged-in worker.

## Recommended Direction

- Add a durable session-scoped messages store in `control-api`, separate from but keyed to the existing sessions table.
- On send, persist one complete `user` message and one `assistant` placeholder in `pending` state before dispatching the browser relay.
- Define a thin internal worker relay contract: `control-api` submits `{ sessionId, userMessageId, assistantMessageId, bodyText }` to the worker that already owns the session.
- Implement reply capture inside `worker-agent` with a centralized selector map, a single in-flight relay lock per worker, and a quiescence-based "assistant reply complete" rule.
- Extend the shared-screen client to poll conversation history and render a pending assistant bubble plus disabled composer while waiting.

## Validation Architecture

- `services/control-api` should keep fast `Vitest` plus `Supertest` coverage for send eligibility, pending placeholder creation, history listing, and relay completion or failure transitions.
- `workers/agent` should gain a fast `Vitest` suite for selector resolution, submission flow ordering, and assistant-text stabilization logic using doubles instead of live ChatGPT.
- `apps/session-client` should extend its current `Vitest` plus Testing Library coverage for active history rendering, pending reply UI, send disabling during pending, and history visibility after session end.
- A manual smoke check can remain optional and should only confirm that a manually authenticated worker can complete one live prompt and return a visible assistant reply in the app.

## Sources

- Playwright BrowserType docs: `launchPersistentContext` - https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context
- Playwright locator guidance - https://playwright.dev/docs/locators
- Playwright actionability and auto-waiting - https://playwright.dev/docs/actionability

---
*Phase: 03-core-chat-relay*
*Research completed: 2026-03-27*
