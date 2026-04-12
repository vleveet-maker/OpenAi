# Post-Recovery Smoke Regression Summary

- Generated locally from operator report and closeout confirmation: 2026-03-31
- Script compatibility version: `phase13-post-recovery-smoke-regression-v1`
- Verdict: `hold_rollout`
- Reconstruction note: this local copy is reconstructed from the deployed-host operator report because the raw `13-REGRESSION-SUMMARY.json` payload was not synced back into this checkout

## Stage Counts

| Stage | Ready |
|-------|-------|
| after_recovery | 0/9 |
| after_canary_start | 1/9 (`shared-6` only) |
| after_settle | 0/9 |

## Public Canary

| Check | Result |
|-------|--------|
| healthz | `502` |
| v1/models | `502` |
| v1/chat/completions | `502` |

## Cleanup

- final `agentListening=false` for `dad`, `wife`, `shared-1..7`
- final `browserListening=false` for `dad`, `wife`, `shared-1..7`
- ports `4021..4029` no longer listen after the run

## Parity And Operator Surface Closeout

- `investigate-post-recovery-smoke-regression.ps1` required deployed-host runtime adaptation before the command would run
- `test-rollout-smoke.ps1` required the phase-13 version plus additional deployed-host compat fixes before the command would run
- the final deployed-host copies of both wrappers were then synced back into the repo and redeployed from the archive
- `GET /internal/post-recovery-regression/latest` later returned `200`, and `/internal/admin` showed the same latest `hold_rollout`, `recoveredReadyCount=0`, `finalSmokeReadyCount=0`, and canary `502` result
