---
phase: 09-internal-host-pool-orchestration
plan: 02
subsystem: control-api
tags: [control-api, host-pool, internal-admin, lifecycle]
provides:
  - typed host-controller lifecycle client
  - explicit internal host-pool lifecycle API
  - pollable pool snapshots with busy/failure semantics
key-files:
  modified:
    - services/control-api/src/workers/host-controller-client.ts
    - services/control-api/src/workers/host-pool-service.ts
    - services/control-api/src/routes/internal-host-pool.ts
    - services/control-api/src/server.ts
    - services/control-api/test/internal-host-pool.test.ts
requirements-completed: [ORCH-01, ORCH-02, ORCH-03]
completed: 2026-03-28
---

# Phase 09 Plan 02: Summary

Control-api now exposes a real internal host-pool lifecycle surface instead of depending on blind one-shot worker launches.

## Accomplishments

- Extended the host-controller client with typed health snapshots, worker inventory, and `stopPool()` support.
- Added `HostPoolService` with explicit lifecycle states: `idle`, `starting`, `ready`, `degraded`, `stopping`, and `failed`.
- Added internal routes for `GET /internal/host-pool`, `POST /internal/host-pool/start`, and `POST /internal/host-pool/stop`.
- Wired the host-pool lifecycle service into the control-api runtime behind the existing internal admin guard.
- Added route tests for idle, degraded, ready, failure, and in-flight `host_pool_busy` behavior.

## Key Decisions

- Preserve partial success as `degraded` instead of auto-rollback or silent retries.
- Keep lifecycle state in-memory at the control-api layer so the admin surface can poll one clear contract.
- Preserve failed lifecycle state until the next explicit operator action so actionable errors do not disappear on the next poll.

## Verification

- `cmd /c npm.cmd run build` in `services/control-api`
- `cmd /c npm.cmd test` in `services/control-api`

## Residual Risk

- Lifecycle state is operator-facing and clear, but it is still process-local state inside control-api. A control-api restart during an in-flight pool action will reset `starting` or `stopping` back to a fresh health-derived snapshot.
