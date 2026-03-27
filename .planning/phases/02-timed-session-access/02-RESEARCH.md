# Phase 2: Timed Session Routing - Research

**Completed:** 2026-03-27
**Question answered:** What do we need to know to plan and execute timed session routing well on top of the current worker pool?

## Findings

### Client Stack

- React recommends Vite for adding modular React to an existing project with a separate backend.
- Vite documents backend integration patterns that fit a traditional API server with proxied `/api` routes in development and built static assets in production.

### Persistence Choice

- Node 22 exposes `node:sqlite`, but it is still documented as active development / experimental.
- `better-sqlite3` is a safer Phase 2 choice for a durable local store because it is mature and works well for one-process local persistence.

### Operational Fit

- The existing `control-api` already owns worker lifecycle and route mounting, so session routing belongs there rather than in the worker-agent.
- The worker registry already carries `assignedSessionId`, which makes it a natural bridge between the worker pool and a durable sessions table.

## Recommended Direction

- Implement session orchestration inside `services/control-api`.
- Persist sessions in one SQLite database file mounted from Docker volume storage.
- Keep queueing and timer enforcement on the server side.
- Build a separate Vite/React SPA for the shared-screen flow and let the API remain authoritative through polling.

## Sources

- React docs: adding React to an existing project
- Vite docs: backend integration
- Node.js docs: `sqlite` module
- better-sqlite3 README

---
*Phase: 02-timed-session-access*
*Research completed: 2026-03-27*
