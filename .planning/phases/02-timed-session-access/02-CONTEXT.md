# Phase 2: Timed Session Routing - Context

**Gathered:** 2026-03-27
**Status:** Ready for execution

## Phase Boundary

This phase delivers the timed session contract between the shared-screen application and the existing worker pool. A session can be created, queued, activated on one worker, counted down for 60 minutes, ended manually, or expired automatically. The worker stays pinned for the full active session.

This phase does not yet relay real chat messages into ChatGPT. It only creates the lifecycle, queueing, persistence, and shared-screen experience that Phase 3 will use.

## Implementation Decisions

### Session Ownership

- Phase 2 is operator-started, not end-user authenticated.
- The shared screen that starts the session is the same screen that uses it.
- `requestedForLabel` is only a UI label and must not become an auth or authorization primitive.

### Worker Assignment

- Use any `ready` worker instead of profile-specific affinity.
- If a worker is available, activate immediately.
- If no worker is available, create a queued session in one global FIFO queue.
- When a worker becomes `ready` or an active session ends, promote the oldest queued session.
- Active sessions never hop to a different worker.

### Persistence and Timing

- Session state must survive `control-api` restarts.
- Use SQLite for durable Phase 2 storage.
- The 60-minute timer starts at activation time, not at queue entry time.
- Expired sessions release the worker immediately and allow the queue to continue.

### Client Flow

- Build a separate React application using Vite.
- Use polling every 5 seconds for authoritative session state instead of SSE or WebSocket.
- The shared-screen UI has exactly four states: `Start`, `Queued`, `Active`, and `Ended`.
- The active screen includes a minimal chat shell placeholder with sending disabled until Phase 3.

### Claude's Discretion

- Exact file layout for React and session modules.
- Whether the control API also serves the built SPA in production, as long as development still works with Vite proxying `/api`.
- Exact test naming and helper structure, as long as the queue, timer, and session-state contract are covered.

## Canonical References

- `.planning/PROJECT.md` - Product constraints and current validated decisions
- `.planning/ROADMAP.md` - Phase 2 goal, success criteria, and future phase boundaries
- `.planning/REQUIREMENTS.md` - `SESS-01` through `SESS-04`
- `.planning/STATE.md` - Current project position
- `.planning/phases/01-managed-worker-pool-foundation/01-VERIFICATION.md` - What Phase 1 guarantees already exist
- `services/control-api/src/workers/worker-registry.ts` - Current worker state model and assignment hooks
- `services/control-api/src/server.ts` - Existing route mounting and runtime bootstrap

## Deferred Ideas

- Separate join links or multi-device handoff
- Real message relay
- Queue ETA predictions
- End-user auth or entitlements

---
*Phase: 02-timed-session-access*
*Context gathered: 2026-03-27*
