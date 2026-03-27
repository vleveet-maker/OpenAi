# Phase 4: Resilience and Worker Recovery - Research

**Completed:** 2026-03-27  
**Question answered:** What do we need to know to plan safe retries, reconnect, and restart workflows on top of the current Phase 3 relay architecture?

## Findings

### Current Codebase Reality

- `control-api` already stores sessions and conversation history durably in SQLite, so reconnect and retry state should stay there instead of moving into the client or worker runtime.
- `ChatRelayService` currently creates one user message plus one pending assistant placeholder and then fires the worker relay asynchronously. That is a strong base for Phase 4 because retries can attach to the existing assistant placeholder rather than creating new user turns.
- `internal/workers/:id/restart` is still a placeholder action: it only flips registry state to `starting` and ends the active session. It does not actually restart a Docker container yet.
- The shared-screen client already restores a session when a `/session/:sessionId` URL is opened, but it does not persist the last session id itself and it drops into generic error copy on failed polls instead of a reconnecting state.

### Persistent Browser and Failure Detection

- Playwright still documents `launchPersistentContext` as the persistent browser entry point, which keeps the existing one-profile-per-worker design correct for resilience work too.
- Playwright exposes runtime failure signals that Phase 4 can build around:
  - `browser.on('disconnected')` fires when the browser application is closed or crashed.
  - `browserContext.on('close')` fires when the context closes or the browser crashes.
  - `page.on('crash')` fires when the page crashes and Playwright notes that ongoing and later operations will throw after that point.
- These signals are strong evidence that failure classification should happen at the worker boundary, close to the browser runtime, instead of guessing from generic HTTP timeouts alone.

### Bounded Internal Calls

- Node provides `AbortSignal.timeout(delay)`, so control-api can put explicit time bounds on worker relay HTTP calls and health probes without bringing in another dependency.
- That fits Phase 4 well because internal reliability work needs deterministic timeouts and clearer transient-vs-terminal failure handling.

### Retry Safety

- The current worker relay contract returns only one final result. That is not enough to retry safely because control-api cannot tell whether a failure happened before submit or after the prompt was already entered into ChatGPT.
- Phase 4 therefore needs richer relay acknowledgements from the worker: at minimum, whether submit was acknowledged plus a failure class and failure stage.
- With that richer contract, control-api can retry only pre-submit transient failures and avoid duplicate prompts.

### Restart Control

- Docker documents both a CLI restart path and an Engine API restart path for containers.
- For this project, the Docker Engine API over a mounted socket is the cleaner planning direction because `control-api` already knows `containerName` and does not need a Docker CLI binary inside the container.
- Docker's docs also keep restart policies and manual restarts conceptually separate. That matches this product: container restart policies are infrastructure defaults, but operator-triggered worker restart is still an application workflow that needs explicit status handling.

## Recommended Direction

- Add a durable relay-job record keyed by `assistantMessageId` with attempt count, retry schedule, failure classification, and completion state.
- Extend worker relay results with `failureClass`, `failureStage`, and submit acknowledgement so retries are only attempted when duplicate prompts are still avoidable.
- Keep the public app on the same poll model, but add reconnecting and retrying states plus last-session local persistence for shared-screen recovery.
- Replace the fake internal restart action with a real worker lifecycle service that talks to the Docker Engine API, then let a health monitor restore worker visibility after restart.

## Validation Architecture

- `services/control-api` should add unit and integration coverage for retry scheduling, no-duplicate-user-message guarantees, public relay-status snapshots, and restart orchestration.
- `workers/agent` should add unit coverage for failure classification and submit acknowledgement behavior in the relay runner or relay service layer.
- `apps/session-client` should cover reconnecting UI, retry-status rendering, and local resume on app reload.
- Keep one manual smoke test for a real worker crash or restart because Docker lifecycle plus ChatGPT browser state remain environment-dependent.

## Sources

- Playwright Browser docs: `browser.on('disconnected')` - https://playwright.dev/docs/api/class-browser
- Playwright BrowserContext docs: `browserContext.on('close')` - https://playwright.dev/docs/api/class-browsercontext
- Playwright Page docs: `page.on('crash')` - https://playwright.dev/docs/api/class-page
- Playwright BrowserType docs: `launchPersistentContext` - https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context
- Node.js globals docs: `AbortSignal.timeout()` - https://nodejs.org/api/globals.html
- Docker Engine API docs - https://docs.docker.com/reference/api/docker_remote_api
- Docker Engine restart endpoint reference - https://docs.docker.com/reference/api/engine/version/v1.24/
- Docker restart CLI reference - https://docs.docker.com/reference/cli/docker/container/restart/

---
*Phase: 04-resilience-and-reconnect*
*Research completed: 2026-03-27*
