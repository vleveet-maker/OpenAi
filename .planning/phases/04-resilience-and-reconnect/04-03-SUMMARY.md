---
phase: 04-resilience-and-reconnect
plan: 03
subsystem: worker-ops
tags: [docker, health-monitor, restart, internal-admin]
provides:
  - Docker Engine API backed restart for one worker container
  - background worker health polling with recovery visibility
  - internal worker detail responses that include runtime health metadata
key-files:
  modified:
    - infra/docker-compose.yml
    - services/control-api/src/config.ts
    - services/control-api/src/routes/internal-worker-actions.ts
    - services/control-api/src/routes/internal-workers.ts
    - services/control-api/src/server.ts
    - services/control-api/src/workers/worker-registry.ts
    - workers/agent/src/server.ts
    - docs/internal-worker-ops.md
  created:
    - services/control-api/src/workers/docker-engine-client.ts
    - services/control-api/src/workers/worker-health-monitor.ts
    - services/control-api/test/internal-worker-actions.test.ts
    - services/control-api/test/worker-health-monitor.test.ts
requirements-completed: [ADMN-03, RELY-01]
completed: 2026-03-27
---

# Phase 04 Plan 03: Summary

Worker restart is no longer a registry-only status flip. `control-api` now talks to the Docker Engine API over the mounted Unix socket and can restart a single named worker container on demand, while ending any active session on that worker as `worker_unavailable`.

A background health monitor polls each worker agent with bounded timeouts, records `lastSeenAt`, and marks workers disconnected after two consecutive failed polls. When a restarted or recovered worker comes back healthy, the monitor restores internal visibility and can return the worker to service without manual registry edits.

The worker agent health endpoint now exposes runtime status, browser context readiness, and recent relay failure metadata, and the internal worker ops documentation records the Docker socket requirement plus expected `starting -> ready or disconnected` restart flow for household operators.
