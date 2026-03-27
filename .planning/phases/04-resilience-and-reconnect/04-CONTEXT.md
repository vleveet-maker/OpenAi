# Phase 4: Resilience and Worker Recovery - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

## Phase Boundary

Phase 4 hardens the Phase 3 text relay so the shared-screen session survives transient transport problems better, reports failures clearly, reconnects cleanly after client interruption, and gives the operator a real worker restart path.

This phase builds on the existing Phase 3 contract instead of replacing it. `control-api` remains the source of truth for sessions and conversation history, `worker-agent` remains the browser executor, and the shared-screen client keeps the same routing and polling model. The focus is reliability, not redesign.

This phase does not add public user auth, multi-device join flows, token streaming, uploads, voice, or observability dashboards. It also does not automate ChatGPT login. Manual reauth stays manual.

The directory slug stays `.planning/phases/04-resilience-and-reconnect` even though the roadmap title says "Resilience and Worker Recovery".

## Implementation Decisions

### Retry and Deduplication

- Retry policy must be server-side in `control-api`; the client must not resend prompts automatically.
- The stored user message remains immutable and singular. Retries are attached to the same assistant placeholder and must never create duplicate user turns.
- Add a durable relay-job model keyed to the existing `assistantMessageId` so retries, terminal failures, and attempt counts survive process restarts.
- Automatic retries are allowed only for clearly transient failures that happen before browser submit is acknowledged. If the worker confirms the prompt was submitted into ChatGPT, do not auto-retry because duplicate assistant turns would be worse than a failed capture.
- Terminal relay failures should stay visible in current-session history as failed assistant entries instead of silently disappearing.

### Failure Classification

- Worker relay results must distinguish `failureClass` as exactly `transient`, `auth`, or `fatal`.
- Worker relay results must also report the stage that failed as exactly `dispatch`, `submitted`, or `capture`.
- `transient` means the request can be retried safely before submit acknowledgement.
- `auth` means the worker is no longer in a usable logged-in state and operator intervention is required.
- `fatal` means the relay failed in a way that should not be auto-retried by the current phase.

### Client Reconnect and Resume

- Reconnect after client interruption uses the same session id and the same assigned worker already pinned by Phase 2 and Phase 3.
- The shared-screen app should persist the last non-terminal session id in local storage and attempt to resume it on app reload.
- Poll failures must not wipe the current history from the UI. Keep the last good snapshot visible and surface a reconnecting banner instead.
- The client may show retrying and failed relay states, but it must not create a second send automatically.

### Worker Restart and Recovery

- Operator restart must become a real worker-control action, not only a status flip in the registry.
- The restart path should target the Docker Engine API over a mounted Unix socket from the server deployment, using known `containerName` values already present in worker definitions.
- Restarting a worker ends any active session on that worker as `worker_unavailable`, because the browser process itself is being replaced.
- Service visibility after restart comes from health monitoring and worker-agent liveness checks; login remains manual if the restarted browser is not ready.

### Error UX

- End users need clear, human-readable states for reply retrying, reply failed, and temporary reconnecting.
- Failed replies stay in the same conversation thread so the operator can see what happened in context.
- Internal restart, reauth, and health details remain internal-only; the public app only gets safe relay and session status.

### Claude's Discretion

- Exact names of relay-job tables, retry scheduler helpers, and health-monitor classes.
- Exact retry backoff values, as long as they are bounded, test-covered, and written explicitly in the plan.
- Exact public snapshot field names for relay status, as long as they remain session-local and safe.
- Exact worker health payload details beyond the required restart and liveness contract.

## Canonical References

- `.planning/PROJECT.md` - Product constraints and manual-auth boundary
- `.planning/ROADMAP.md` - Phase 4 goal, fixed plan titles, and success criteria
- `.planning/REQUIREMENTS.md` - `RELY-01`, `RELY-02`, `RELY-03`, and `ADMN-03`
- `.planning/STATE.md` - Current project position after Phase 3 completion
- `.planning/phases/03-core-chat-relay/03-CONTEXT.md` - Relay ownership and Phase 3 boundaries
- `.planning/phases/03-core-chat-relay/03-RESEARCH.md` - Current relay architecture and Playwright guidance
- `.planning/phases/03-core-chat-relay/03-VERIFICATION.md` - What Phase 3 already guarantees
- `services/control-api/src/chat/chat-relay-service.ts` - Current send and pending-placeholder flow
- `services/control-api/src/chat/worker-relay-client.ts` - Current worker relay transport boundary
- `services/control-api/src/routes/public-chat.ts` - Current public conversation API
- `services/control-api/src/routes/internal-worker-actions.ts` - Current restart placeholder route
- `services/control-api/src/routes/internal-recovery.ts` - Manual reauth workflow
- `services/control-api/src/sessions/session-service.ts` - Session lifetime and worker status effects
- `services/control-api/src/workers/worker-registry.ts` - Worker metadata, assignment, and last-seen state
- `workers/agent/src/server.ts` - Current worker-agent health and relay endpoints
- `workers/agent/src/chat-relay/relay-runner.ts` - Current submit/capture execution path
- `apps/session-client/src/use-session-view.ts` - Current polling and bootstrap logic
- `apps/session-client/src/app.tsx` - Current shared-screen shell and error banners

## Deferred Ideas

- Token streaming and push transport
- Multi-device handoff or public user auth
- Automated re-login or CAPTCHA handling
- Full operator event audit trails and monitoring dashboards
- Cross-household or multi-tenant recovery controls

---
*Phase: 04-resilience-and-reconnect*
*Context gathered: 2026-03-27*
