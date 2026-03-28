# Phase 8: Per-chat Temporary Chat isolation and latest reasoning model selection - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

## Phase Boundary

This phase makes each newly started chat feel like a fresh dialog instead of inheriting the previous thread on the same worker. In the current product shape, one timed session still maps to one active conversation thread, so this phase treats "new chat" as "the fresh conversation prepared for a newly active session-backed dialog."

This phase does not add multiple independent chats inside one active 60-minute session, user-facing model switching, or API-based ChatGPT integration. It focuses on safe fresh-chat bootstrap, `Temporary Chat`, and latest-model selection before the first user message is sent.

## Implementation Decisions

### Fresh-Chat Semantics

- A newly active session must not reuse the previous conversation thread from the same worker.
- The worker keeps its durable logged-in browser profile, but the conversation surface for the new session must be reset to a fresh dialog boundary before the first send.
- Sending the first message must stay blocked until the system knows the fresh chat bootstrap either succeeded or failed clearly.

### Temporary Chat Policy

- The desired mode for each new chat is ChatGPT `Temporary Chat`.
- If `Temporary Chat` cannot be enabled or verified, the system must fail safe and surface a bootstrap failure instead of silently sending messages into a standard remembered chat.
- The phase should capture whether the prepared chat is `temporary`, `standard`, or `unknown` so the UI and internal observability can reflect what happened.

### Latest Reasoning Model Policy

- The product policy is "prefer the latest available reasoning model in ChatGPT."
- The implementation must not hardcode that promise into one permanently assumed label; use an ordered candidate-label configuration that can be updated without redesigning the phase.
- As of `2026-03-28`, the current default target should be `GPT-5.4 Thinking`, because OpenAI says it is rolling out in ChatGPT and replacing `GPT-5.2 Thinking`.
- If the preferred model cannot be confirmed, fail safe with a clear bootstrap error instead of silently continuing on a stale model selection.

### Control-Plane Ownership

- `control-api` remains the source of truth for whether a session's chat surface is `pending`, `ready`, or `failed`.
- Session activation should schedule fresh-chat bootstrap exactly once for that session.
- Public session and conversation snapshots should include enough bootstrap metadata for the shared-screen UI to render preparing, ready, or failed states.

### Worker Automation Shape

- `worker-agent` should expose a dedicated internal bootstrap endpoint instead of hiding fresh-chat setup inside ad hoc relay logic.
- Browser automation for new chat, `Temporary Chat`, and model selection should keep selectors centralized and separately testable from the relay runner.
- The worker should return structured bootstrap metadata including mode, chosen model label, and failure code.

### Client Behavior

- The shared-screen client should show that a fresh chat is being prepared before send becomes available.
- The composer must remain disabled while fresh-chat bootstrap is `pending` or `failed`.
- Once ready, the UI should show that the chat is isolated and which model was selected.

### Claude's Discretion

- Exact schema names for bootstrap records and transport types.
- Whether bootstrap records live in a separate store file or in the existing chat store module, as long as the lifecycle is durable and session-scoped.
- Exact selector fallback order for `Temporary Chat` and model picker controls.
- Exact banner wording and small UI polish, as long as the user can clearly tell "fresh chat is preparing", "fresh chat is ready", or "fresh chat failed".

## Canonical References

- `.planning/PROJECT.md` - Product constraints, fresh-dialog rule, and latest-model policy note
- `.planning/ROADMAP.md` - Phase 8 goal and success criteria
- `.planning/REQUIREMENTS.md` - `CHATISO-01` through `CHATISO-04`
- `.planning/STATE.md` - Current milestone and rollout debt
- `.planning/seeds/SEED-001-per-chat-clean-dialog-isolation.md` - User intent behind the phase
- `services/control-api/src/sessions/session-service.ts` - Current session activation flow and worker pinning
- `services/control-api/src/chat/chat-relay-service.ts` - Current send gating and message lifecycle
- `services/control-api/src/routes/public-sessions.ts` - Current session-create and session-snapshot contract
- `workers/agent/src/server.ts` - Current worker-agent internal API surface
- `workers/agent/src/chat-relay/relay-runner.ts` - Current message relay runner and lock model
- `workers/agent/src/chat-relay/selector-map.ts` - Existing selector centralization pattern
- `apps/session-client/src/use-session-view.ts` - Current polling, bootstrap, and send gating state
- `apps/session-client/src/app.tsx` - Current shared-screen banners and composer UX

## Deferred Ideas

- Several independent chats inside one active timed session
- A user-facing "New Chat" button during an active session
- User-selectable model picker in the app
- Automatic revalidation when OpenAI introduces a newer reasoning model label
- A later migration away from web UI relay toward a first-party API product shape

---
*Phase: 08-per-chat-temporary-chat-isolation-and-latest-reasoning-model-selection*
*Context gathered: 2026-03-28*
