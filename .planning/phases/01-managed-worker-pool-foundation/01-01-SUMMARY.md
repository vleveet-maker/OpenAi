---
phase: 01-managed-worker-pool-foundation
plan: 01
subsystem: infra
tags: [playwright, docker, architecture, worker-pool]
requires: []
provides:
  - Worker runtime baseline for named household browser workers
  - Internal-only worker status contract and topology definition
  - Manual-auth and no-credential-storage runtime invariants
affects: [control-api, worker-agent, admin-ops]
tech-stack:
  added: [Playwright, Docker]
  patterns: [per-worker container isolation, durable profile mounts, internal-only admin surfaces]
key-files:
  created:
    - .planning/phases/01-managed-worker-pool-foundation/01-01-ARCHITECTURE-SPIKE.md
  modified: []
key-decisions:
  - "Selected raw Playwright worker-agent containers as the Phase 1 baseline and kept BlitzBrowser as a bounded fallback."
  - "Locked manual operator login and no plaintext credential storage as runtime invariants."
patterns-established:
  - "Named workers run in dedicated containers with one durable browser profile mount each."
  - "Only the control-api and internal admin surfaces may touch worker recovery paths."
requirements-completed: [WORK-01, WORK-02, WORK-03, WORK-04, ADMN-02, SECU-02, SECU-03]
duration: 7 min
completed: 2026-03-27
---

# Phase 01 Plan 01: Architecture Spike Summary

**Worker runtime baseline for named Playwright containers, durable profiles, and manual-auth internal recovery boundaries**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-27T08:55:00Z
- **Completed:** 2026-03-27T09:02:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Compared raw Playwright worker-agent containers against BlitzBrowser-backed workers and made the runtime call explicit.
- Defined the concrete worker topology, durable profile mount pattern, and five-state worker status contract.
- Recorded manual operator login and no-credential-storage rules as hard runtime invariants.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the worker-runtime comparison and decision frame** - `35d07ca` (docs)
2. **Task 2: Define the concrete worker topology, status contract, and boundaries** - `834a2bc` (docs)

**Plan metadata:** recorded in the later phase documentation commit after summary creation.

## Files Created/Modified
- `.planning/phases/01-managed-worker-pool-foundation/01-01-ARCHITECTURE-SPIKE.md` - Runtime comparison, topology, status contract, and operator-auth invariants

## Decisions Made
- Raw Playwright worker-agent containers are the default Phase 1 runtime because they keep worker semantics under direct project control.
- BlitzBrowser remains an optional fallback if headful browser operations become the main delivery bottleneck.
- Worker login is always manual and happens inside the containerized browser controlled through internal-only recovery paths.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 01-02 can now implement the control-api, registry, and internal status routes against one stable worker contract.
- 01-03 can build recovery and restart flows without reopening the runtime decision.

---
*Phase: 01-managed-worker-pool-foundation*
*Completed: 2026-03-27*
