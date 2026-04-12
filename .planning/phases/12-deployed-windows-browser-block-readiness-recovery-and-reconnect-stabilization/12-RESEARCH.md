# Phase 12 Research

## Current Baseline

Phase 11 already answered the public-path question honestly.

Current truthful starting point:

- Ubuntu deliberately owns public `77.66.186.75` and proxies the API contract to the preserved Windows edge.
- The public canary on `shared-6` is green for `healthz`, `v1/models`, and `v1/chat/completions`.
- The latest rollout-smoke surface is already real and operator-visible.
- Household rollout is still held because the deployed Windows browser-block snapshot stayed at `0/9 ready` and `9/9 disconnected`.

That means Phase 12 is not another ingress phase and not another smoke-design phase.

It is the preserve-first readiness-recovery phase.

## Existing Building Blocks We Should Reuse

### Preserve-first Windows tooling

The repo already has the key safety tools for a live Windows host that must not lose logged-in accounts:

- `infra/windows-block/backup-browser-block-state.ps1`
- `infra/windows-block/restore-browser-block-state.ps1`
- `infra/windows-block/test-browser-block-canary.ps1`
- `infra/windows-block/test-browser-block-subset.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`

These tools already establish the right discipline:

- freeze first
- canary before wider proof
- no blind profile deletion
- no broad public-worker widening

### Bounded worker proof paths

The repo also already has proof flows that can be composed into recovery instead of reinvented:

- `infra/host-worker/test-host-worker-relay.ps1`
  - starts one worker in `CompactCorner`
  - waits for `ready`
  - creates a worker-pinned validation session
  - proves `Temporary Chat -> GPT-5.4 Thinking -> relay`
  - can leave the worker running with `-KeepWorkerRunning`
- `infra/host-worker/test-windows-browser-block-matrix.ps1`
  - iterates worker-by-worker through the host-controller path
  - captures success/failure detail
  - stops workers again after the probe

The key gap is not "how do we prove a worker at all?"

The key gap is "how do we recover a degraded live 9-account pool preserve-first and keep recovered workers up?"

### Current operator truth surfaces

The control plane already exposes enough truth to classify the degraded state:

- `GET /internal/host-pool`
- `GET /internal/workers`
- `GET /internal/observability/summary`
- `GET /internal/rollout-smoke/latest`
- `/internal/admin`

Relevant code paths:

- `services/control-api/src/routes/internal-host-pool.ts`
- `services/control-api/src/routes/internal-workers.ts`
- `services/control-api/src/routes/internal-observability.ts`
- `services/control-api/src/routes/internal-rollout-smoke.ts`
- `services/control-api/src/routes/internal-admin-page.ts`
- `services/control-api/src/workers/worker-health-monitor.ts`
- `services/control-api/src/workers/host-pool-service.ts`
- `services/host-controller/src/host-controller.mjs`

## Important Constraint: Live Host Inventory Beats Repo Defaults

The repo's default worker definitions still model the tracked seven-worker package (`dad`, `wife`, `shared-1` through `shared-5`).

The deployed preserve-first Windows host now reports a nine-account pool and uses `shared-6` as the proven canary.

Phase 12 therefore must not assume that local defaults are the full production truth.

The recovery flow needs to:

- accept explicit worker IDs
- prefer live host inventory from the deployed environment
- record any repo-vs-host inventory mismatch as evidence, not silently ignore it

## What Phase 12 Still Lacks

Three real gaps remain:

1. There is no single preserve-first readiness-recovery wrapper for the live Windows host that:
   - captures current blocker classes
   - retries bounded reconnect worker-by-worker
   - keeps recovered workers running
   - stops failed workers again cleanly
   - writes durable JSON/Markdown recovery artifacts
2. There is no dedicated latest-recovery operator surface equivalent to Phase 11's latest-smoke surface.
3. There is no final recovery-to-smoke handoff artifact that says whether rollout can resume or remains held after bounded reconnect work.

## Recommended Phase Boundary

Phase 12 should stay narrow and honest.

It should do all of this:

- add one preserve-first readiness-recovery wrapper for the deployed Windows browser block
- use `shared-6` as the default canary gate before broader reconnect work
- preserve the existing nine logged-in accounts by avoiding blind full-pool restarts, cookie clearing, profile deletion, or mass relogin
- persist the latest recovery result in machine-readable form
- surface the latest recovery result through an internal operator route or page
- rerun the proven Phase 11 smoke after recovery and record whether rollout can resume

It should not do any of this:

- redesign the runtime again
- reopen public-owner reconciliation
- expose raw `4040`, worker-agent ports, or raw `:4010` publicly
- treat "all workers are disconnected" as a reason to wipe or recreate the browser profiles
- claim household rollout is ready without rerunning the established smoke contract

## Recommended Technical Shape

### 1. Add one readiness-recovery wrapper on the deployed Windows/browser-block side

The cleanest composition is:

- read current truth from:
  - host-controller `GET /health`
  - `GET /internal/host-pool`
  - `GET /internal/workers`
  - `GET /internal/observability/summary`
- run worker recovery sequentially through `infra/host-worker/test-host-worker-relay.ps1 -ReturnJson -KeepWorkerRunning`
- enforce preserve-first order:
  - canary `shared-6`
  - then small subset
  - then remaining worker list only if earlier steps do not show a new dangerous regression
- stop failed workers again after capture
- write:
  - `.planning/phases/12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization/12-RECOVERY-SUMMARY.json`
  - `.planning/phases/12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization/12-RECOVERY-SUMMARY.md`
  - `infra/data/readiness-recovery/latest.json`

Why this is the right level:

- it reuses the already-proven compact-visible relay proof
- it keeps the recovery logic PowerShell-side where the operator will actually run it
- it leaves room for exact blocker classes instead of a vague "degraded" verdict

### 2. Make latest readiness recovery file-backed and operator-visible

This should mirror the successful Phase 11 shape:

- `infra/data/readiness-recovery/latest.json` becomes the machine-readable source of truth
- `control-api` reads it through one small internal route
- `/internal/admin` renders a dedicated recovery section with counts and blocker summaries

This keeps:

- PowerShell recovery decoupled from service internals
- internal UI testable with normal `vitest`
- operators out of raw console archaeology

### 3. Close the phase with live recovery plus rerun of the proven smoke

The phase should not end after writing a recovery artifact.

It should end only after:

- the latest recovery surface matches the live artifact
- Phase 11 smoke is rerun
- the final verdict says one of:
  - rollout can resume
  - rollout remains held, with exact blocker workers and failure classes

## Suggested Plan Decomposition

### Wave 1

- add the preserve-first readiness-recovery wrapper
- define the recovery artifact shape
- document the exact recovery order and rerun contract

### Wave 2

- add `control-api` support for reading the latest recovery state
- render the latest recovery result on `/internal/admin`
- cover the new route/UI with tests

### Wave 3

- run the live recovery on the deployed Windows host
- confirm the operator surface shows the same latest result
- rerun Phase 11 smoke
- write `12-VERIFICATION.md`
- update roadmap/state/requirements/project truth

## Risks And Constraints

- The deployed host inventory may differ from the repo's tracked seven-worker package; the phase must record, not hide, that mismatch.
- A worker that is recoverable in bounded compact-visible proof may still be inappropriate to widen publicly; the phase is about readiness recovery, not public-pool widening.
- If several workers fall into `reauth_required`, the honest output is a preserve-first hold with named accounts, not a destructive reset.
- The current public canary already works; a regression there during recovery is a serious new blocker and should stop widening.

## Validation Architecture

Automated coverage should focus on the file-backed route/UI layer and any host-controller changes:

- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/host-controller test`

Manual coverage must remain on the deployed Windows host:

- live preserve-first recovery run on `192.168.88.250`
- latest recovery route or admin-page confirmation
- rerun of the established Phase 11 smoke command

## Planning Conclusion

Phase 12 is ready to plan now.

The right plan is:

1. capture exact blocker classes instead of opaque disconnected counts
2. recover known-good workers through bounded compact-visible reconnect
3. surface the latest recovery result for operators
4. rerun the proven rollout smoke and state explicitly whether rollout can resume
