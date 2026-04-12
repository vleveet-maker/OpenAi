# 13 Verification

## Final Verdict

`hold_rollout`

## Confirmed Live Truth

- The live Phase 13 harness ran on the deployed Windows browser-block host.
- The deployed host wrote `13-REGRESSION-SUMMARY.json` and `13-REGRESSION-SUMMARY.md`.
- The reported stage counts were:
  - `after_recovery = 0/9 ready`
  - `after_canary_start = 1/9 ready` on `shared-6` only
  - `after_settle = 0/9 ready`
- The final public canary on `shared-6` did not pass:
  - `healthz = 502`
  - `v1/models = 502`
  - `v1/chat/completions = 502`
- The operator cleaned the host after the run:
  - all `agentListening` values are now `false`
  - all `browserListening` values are now `false`
  - ports `4021..4029` are no longer listening

## Requirement Status

- `WREG-01`: complete
  - durable live regression artifacts were created on the deployed host
- `WREG-02`: complete
  - the final deployed-host copies of `investigate-post-recovery-smoke-regression.ps1` and `test-rollout-smoke.ps1` were synced back into the repo, then the synced archive was redeployed to the host, so repo-to-runtime parity is now closed
- `WREG-03`: complete
  - after the `control-api` restart, `GET /internal/post-recovery-regression/latest` returned `200`, and `/internal/admin` showed the same latest `hold_rollout` artifact with `recoveredReadyCount=0`, `finalSmokeReadyCount=0`, and canary `502`
- `WREG-04`: complete
  - the phase now has one explicit final verdict: `hold_rollout`

## 11-Smoke Artifact Refresh

- The local checkout does not have fresh raw copies of `11-SMOKE-SUMMARY.json`, `11-SMOKE-SUMMARY.md`, or `infra/data/rollout-smoke/latest.json` from the deployed host.
- Because the deployed-host script needed runtime-specific compat fixes, this verification does not claim those Phase 11 smoke artifacts were refreshed until the updated host copies are synced back or explicitly reported.

## Local Reconstruction Note

- The local copies of `13-REGRESSION-SUMMARY.json`, `13-REGRESSION-SUMMARY.md`, and `infra/data/post-recovery-regression/latest.json` were reconstructed from the operator report because the raw deployed-host files were not synced back into this checkout.

## Remaining Rollout Blocker

1. Phase 13 is complete, but rollout remains held by runtime stability rather than missing instrumentation: the preserved pool was already `0/9 ready` after recovery, only `shared-6` briefly reached `1/9 ready`, and the final public canary ended `502/502/502`.
2. The next phase should investigate that zero-ready post-recovery baseline and the final public-canary regression instead of repeating parity or operator-surface work.
