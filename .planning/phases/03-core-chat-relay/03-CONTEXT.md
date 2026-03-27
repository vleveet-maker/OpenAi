# Phase 3: Core Chat Relay - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

## Phase Boundary

This phase delivers the first real text chat loop on top of the Phase 2 timed-session contract. An active shared-screen session can send a text prompt through the application, relay it into the assigned ChatGPT browser worker, and read the assistant reply back in the same session history.

This phase stays text-only and focuses on the happy-path relay contract. It does not add retries, reconnect after interrupted relay, token-by-token streaming transport, uploads, voice, or automated recovery. Those remain in later phases.

## Implementation Decisions

### Relay Ownership

- `control-api` remains the source of truth for session state and current-session chat history.
- Store current-session message history durably in the same SQLite database already used for sessions.
- `worker-agent` is an internal executor that drives the assigned browser and returns relay results; it is not the canonical store for chat history.

### Message Model

- Persist a flat session-scoped message history with `user` and `assistant` roles.
- When the operator sends a message, create the `user` message and one `assistant` placeholder in `pending` state before browser automation starts.
- Allow only one in-flight assistant reply per active session at a time; additional sends during a pending reply must be rejected with a conflict response.
- Keep the full current-session history readable after manual end, expiry, or worker loss, but block new sends outside the `active` state.

### Worker Relay Contract

- Relay only through the worker already assigned to the active session.
- `control-api` calls an internal worker-agent relay endpoint over the private worker network.
- Worker relay uses the existing persistent Playwright browser context and manual ChatGPT login already established on the worker.
- Do not automate account login or store credentials; if the browser is no longer authenticated, Phase 3 may surface a relay failure and Phase 4 will handle recovery and retry policy.

### Browser Automation Shape

- Prefer role-based Playwright locators first, with centralized fallback selectors for the current ChatGPT DOM.
- Treat the browser page as a live human-facing surface, so reply capture should use DOM state and text stabilization rather than unsupported private APIs.
- Use a quiescence window to decide when the assistant reply is complete enough to persist for Phase 3.

### Client Behavior

- Keep the existing separate React and Vite shared-screen client and the current 5-second polling model.
- Phase 3 only needs a pending reply state; true transport streaming is deferred.
- The active screen should render full current-session history, an enabled composer while no reply is pending, and a disabled composer plus pending bubble while waiting for the assistant.
- The queued and ended views keep the shell visible but block sending.

### Claude's Discretion

- Exact naming of the chat store, relay client, and message snapshot types.
- Whether the public API returns conversation data from a dedicated `/messages` route or another thin session-scoped contract, as long as it stays session-local and safe.
- Exact CSS and component decomposition for the shared-screen chat shell, as long as it preserves the existing visual language from Phase 2.
- Exact timeout values and selector fallback order, as long as they are centralized and test-covered.

## Canonical References

- `.planning/PROJECT.md` - Product constraints and manual-auth safety boundary
- `.planning/ROADMAP.md` - Phase 3 goal, success criteria, and later resilience boundaries
- `.planning/REQUIREMENTS.md` - `CHAT-01` through `CHAT-04`
- `.planning/STATE.md` - Current project position
- `.planning/phases/02-timed-session-access/02-VERIFICATION.md` - What Phase 2 already guarantees for session routing and UI state
- `services/control-api/src/server.ts` - Current route mounting and runtime bootstrap
- `services/control-api/src/sessions/session-service.ts` - Active session truth, worker pinning, and expiry behavior
- `services/control-api/src/routes/public-sessions.ts` - Existing public session contract and validation style
- `services/control-api/src/workers/worker-registry.ts` - Worker metadata and agent base URLs
- `workers/agent/src/server.ts` - Current worker-agent API surface
- `workers/agent/src/browser-launch.ts` - Persistent Playwright browser bootstrap
- `apps/session-client/src/app.tsx` - Current shared-screen shell and routing
- `apps/session-client/src/use-session-view.ts` - Existing polling and countdown state management

## Deferred Ideas

- Relay retries and idempotency guarantees
- Reconnect and resume of in-flight replies across client interruptions
- Token streaming or server push
- File uploads, images, and voice
- Multi-device handoff or public user auth
- Automated worker recovery and safe re-dispatch after failures

---
*Phase: 03-core-chat-relay*
*Context gathered: 2026-03-27*
