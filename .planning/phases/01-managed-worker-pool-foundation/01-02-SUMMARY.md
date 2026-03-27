---
phase: 01-managed-worker-pool-foundation
plan: 02
subsystem: api
tags: [express, typescript, docker-compose, worker-registry]
requires:
  - phase: 01-01
    provides: worker runtime baseline and status contract
provides:
  - Control-api bootstrap and internal health surface
  - Canonical worker status model and named worker registry
  - Compose topology for control-api plus named worker containers
affects: [phase-02-session-routing, phase-03-recovery, admin-ops]
tech-stack:
  added: [Express, TypeScript, Docker Compose]
  patterns: [central control-api registry, named worker definitions via config, internal route mounting]
key-files:
  created:
    - services/control-api/package.json
    - services/control-api/tsconfig.json
    - services/control-api/src/config.ts
    - services/control-api/src/workers/worker-status.ts
    - services/control-api/src/workers/worker-registry.ts
    - services/control-api/src/routes/internal-workers.ts
    - services/control-api/src/routes/internal-health.ts
    - workers/agent/package.json
    - workers/agent/src/server.ts
    - infra/docker-compose.yml
  modified:
    - services/control-api/src/server.ts
key-decisions:
  - "Built the control plane as a small Express-based control-api with config-driven named worker definitions."
  - "Made worker identity explicit through workerId, containerName, profilePath, and agentBaseUrl fields in the registry."
patterns-established:
  - "Internal worker routes mount from one server entrypoint and read from a shared registry instance."
  - "Compose defines one service per named worker with durable profile mounts under /srv/chatgpt-workers/profiles."
requirements-completed: [WORK-01, WORK-02, WORK-03, ADMN-02, SECU-03]
duration: 18 min
completed: 2026-03-27
---

# Phase 01 Plan 02: Control Plane Summary

**Express control-api with named worker registry, canonical status model, and Docker topology for dedicated household workers**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-27T09:02:00Z
- **Completed:** 2026-03-27T09:20:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Scaffolded the control-api runtime with TypeScript config loading and one canonical worker status module.
- Added a registry that exposes stable named worker records and internal workers plus health endpoints.
- Defined the compose topology for `control-api`, `worker-dad`, `worker-wife`, and `worker-shared-1` with durable profile mounts.

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold the control-api service and worker status model** - `d2f89b3` (chore)
2. **Task 2: Implement named worker registry and internal status routes** - `0e4616a` (feat)
3. **Task 3: Add dedicated worker-agent service shape and compose topology** - `25842e9` (feat)

**Plan metadata:** recorded in the later phase documentation commit after summary creation.

## Files Created/Modified
- `services/control-api/src/workers/worker-status.ts` - Canonical status model for `starting`, `ready`, `busy`, `disconnected`, and `reauth_required`
- `services/control-api/src/workers/worker-registry.ts` - Stable named worker records and update helpers
- `services/control-api/src/routes/internal-workers.ts` - Internal list, detail, and worker status endpoints
- `services/control-api/src/routes/internal-health.ts` - Machine-readable control-api health summary
- `workers/agent/src/server.ts` - Initial worker-agent HTTP skeleton
- `infra/docker-compose.yml` - Named worker topology with durable profile mounts

## Decisions Made
- The first control plane is intentionally in-memory and config-driven because Phase 1 needs worker identity and status semantics before session persistence.
- Worker definitions live in control-api config so the compose topology and backend registry stay aligned from day one.
- Internal route names are explicit and server-side only, which keeps the public application surface separate from worker operations.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The session-routing phase can now target explicit worker IDs instead of anonymous browser slots.
- Recovery and restart routes can reuse the same control-api runtime and registry instead of inventing a second control path.

---
*Phase: 01-managed-worker-pool-foundation*
*Completed: 2026-03-27*
