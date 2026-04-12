# 12 Plan 01 Summary

- Added the canonical `infra/windows-block/recover-browser-block-readiness.ps1` wrapper for preserve-first recovery of the deployed Windows browser-block pool.
- The wrapper now captures host-controller `/health` plus `/internal/host-pool`, `/internal/workers`, and `/internal/observability/summary` before and after recovery, then writes durable JSON and Markdown artifacts and mirrors the latest machine-readable payload to `infra/data/readiness-recovery/latest.json`.
- Recovery always treats `shared-6` as the first canary, runs `test-host-worker-relay.ps1 -ReturnJson -KeepWorkerRunning` worker-by-worker, stops failed workers again, and halts the wider run if the public canary regresses.
- Windows/browser-block docs now pin one exact Phase 12 recovery command, the required `shared-6 canary -> bounded remaining worker list -> rerun Phase 11 smoke` order, and the preserve-first ban on profile deletion, cookie clearing, blind full-pool stop/start, and mass relogin.
