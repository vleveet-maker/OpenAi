# 13 Plan 03 Summary

- The live Phase 13 regression harness ran on the deployed Windows browser-block host and ended with the explicit verdict `hold_rollout`.
- The reported stage truth was worse than the Phase 12 recovery baseline: `after_recovery = 0/9 ready`, `after_canary_start = 1/9 ready` on `shared-6` only, and `after_settle = 0/9 ready`.
- The final public canary was red on all three public checks: `healthz=502`, `v1/models=502`, and `v1/chat/completions=502`.
- The deployed host required additional runtime-specific compat work before the harness would run: the operator had to adapt `investigate-post-recovery-smoke-regression.ps1` to the current runtime and apply compat fixes to the phase-13 `test-rollout-smoke.ps1`.
- After the final wrapper copies were synced back into the repo and redeployed from the archive, `GET http://127.0.0.1:8081/internal/post-recovery-regression/latest` returned `200`, and `/internal/admin` showed `Latest post-recovery smoke regression` with the same `hold_rollout`, `recoveredReadyCount=0`, `finalSmokeReadyCount=0`, and canary `502` outcome.
- The host was left in a clean stopped state after the run: `agentListening=false` and `browserListening=false` for `dad`, `wife`, and `shared-1..7`, and ports `4021..4029` were no longer listening.
