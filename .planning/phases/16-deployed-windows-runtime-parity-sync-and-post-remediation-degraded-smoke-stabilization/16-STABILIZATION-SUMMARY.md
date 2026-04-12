# Post-Remediation Degraded Smoke Stabilization Summary

- Generated: reconstructed locally from operator report after the deployed-host Phase 16 run
- Raw deployed-host artifact timestamp was not synced back into this checkout
- Script compatibility version: `phase16-runtime-parity-sync-v1`
- Verdict: `hold_rollout`
- Summary: Hold rollout: parity-synced stabilization on the deployed Windows host started at `1/9` ready, ended at `0/9` ready with a degraded pool, and the public canary on `shared-6` again returned `502` through `http://77.66.186.75`
- Canary worker: `shared-6`
- Pre-smoke ready count: `1/9`
- Final smoke ready count: `0/9`
- Final pool status: `degraded`
- Public canary passed: `false`
- Archive redeployed before run: `true`
- `control-api` restarted before run: `true`
- Route confirmed: `true`
- Admin section confirmed: `true`
- Latest JSON BOM fix required on deployed host: `true`

## Public Canary

- `healthz`: `502`
- `v1/models`: `502`
- `v1/chat/completions`: `502`

## Cleanup

- `shared-6` stopped again after the run
- port `4028` no longer listening
- active listening workers returned to `0`

## Preserve-First Truth

- profiles were not deleted
- cookies were not cleared
- local storage was not cleared
- no mass relogin happened

## Reconstruction Note

- This local copy is reconstructed from the operator report because the raw deployed-host `16-STABILIZATION-SUMMARY.*` files were not synced back into this checkout.
