---
phase: 09-internal-host-pool-orchestration
plan: 01
subsystem: host-controller
tags: [host-controller, proxy-pool, lifecycle, health]
provides:
  - symmetric pool start and stop lifecycle
  - explicit observed pool status across proxy and workers
  - testable HTTP contract for pool health and shutdown
key-files:
  modified:
    - services/host-controller/src/host-controller.mjs
    - services/host-controller/src/server.mjs
    - services/host-controller/test/host-controller.test.mjs
    - services/host-controller/test/server.test.mjs
requirements-completed: [ORCH-01, ORCH-02, ORCH-03]
completed: 2026-03-28
---

# Phase 09 Plan 01: Summary

The host-controller now owns the full proxied host-pool lifecycle instead of relying on one-way start scripts and implicit shutdown behavior.

## Accomplishments

- Added observed pool-health primitives for proxy reachability, worker reachability, and aggregate `idle` / `ready` / `degraded` state.
- Added `stopProxyRuntime()` and `stopPool()` so pool shutdown now tears down workers first and the mixed proxy last.
- Extended host-controller HTTP routes so `GET /health`, `GET /workers`, `POST /pool/start`, and `POST /pool/stop` all return structured lifecycle payloads.
- Exported a server factory so lifecycle routes can be tested without booting the real process entrypoint.
- Added node tests covering degraded-state computation, pool stop sequencing, and the new HTTP lifecycle contract.

## Key Decisions

- Treat proxy reachability as first-class health, not just a side effect of successful worker launches.
- Keep pool lifecycle symmetric so control-api can understand both startup and shutdown without shelling out to scripts.
- Return explicit pool metadata from HTTP endpoints so higher layers do not have to infer lifecycle state from raw worker lists.

## Verification

- `cmd /c npm.cmd test` in `services/host-controller`

## Residual Risk

- Pool stop still depends on Windows process discovery for the mixed proxy port, so operator environments with unexpected local port conflicts can still produce degraded shutdown behavior.
