---
phase: 09-internal-host-pool-orchestration
plan: 03
subsystem: internal-admin
tags: [internal-admin, operator-ui, docs, host-pool]
provides:
  - pool-level admin controls in the operator page
  - visible lifecycle meaning for start, stop, degraded, and failed states
  - runbooks aligned with the in-app operator flow
key-files:
  modified:
    - services/control-api/src/routes/internal-admin-page.ts
    - services/control-api/test/internal-admin-page.test.ts
    - docs/host-native-worker.md
    - docs/internal-worker-ops.md
requirements-completed: [ORCH-01, ORCH-02, ORCH-03]
completed: 2026-03-28
---

# Phase 09 Plan 03: Summary

The internal admin page is now the primary operator path for host-native pool start and stop.

## Accomplishments

- Added a dedicated host-pool lifecycle panel above worker cards in `/internal/admin`.
- Added `Start pool` and `Stop pool` controls wired to the internal lifecycle API.
- Added explicit operator copy for `idle`, `starting`, `ready`, `degraded`, `stopping`, and `failed`.
- Updated the admin page poll loop so pool status refreshes every 5 seconds alongside worker and observability data.
- Updated admin-page coverage and runbooks so the operator path now points to internal admin first, with PowerShell scripts as fallback tools.

## Key Decisions

- Keep the existing worker cards intact and add pool-level controls above them rather than replacing worker detail.
- Show degraded and failed states plainly in the UI instead of hiding them behind log-only flows.
- Reposition PowerShell scripts as fallback infrastructure tools, not the default operator experience.

## Verification

- `cmd /c npm.cmd run build` in `services/control-api`
- `cmd /c npm.cmd test` in `services/control-api`

## Residual Risk

- This phase makes lifecycle control clearer, but it does not yet prove the pool start/stop flow end-to-end against the live household environment from the admin page itself. That operational confidence is deferred to later rollout-smoke work.
