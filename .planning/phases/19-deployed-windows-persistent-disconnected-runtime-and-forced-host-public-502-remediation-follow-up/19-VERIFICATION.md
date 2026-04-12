# 19 Verification

## Final Verdict

`hold_rollout`

## Confirmed Live Truth

- The live Phase 19 follow-up harness ran on the deployed Windows browser-block host after the Phase 19 archive overlay.
- The deployed host restarted `control-api` on `127.0.0.1:8081` before the live follow-up run.
- The deployed host wrote `19-FOLLOWUP-SUMMARY.json` and `19-FOLLOWUP-SUMMARY.md`.
- The follow-up result was explicit before the smoke rerun:
  - `hold_rollout`
  - compatibility version `phase19-persistent-followup-v1`
  - pre-follow-up ready = `0/9`
  - post-follow-up ready = `0/9`
  - dominant runtime blocker = `disconnected`
  - first failing hop = `windows_edge_forced_host`
  - public owner still returned `502`
- Operator-surface confirmation is complete:
  - `GET /internal/persistent-disconnected-runtime-followup/latest` returned the current latest follow-up result
  - `/internal/admin` showed `Latest persistent disconnected runtime follow-up`
- The exact post-follow-up smoke rerun also happened:
  - `11-SMOKE-SUMMARY.json` refreshed on the deployed host
  - `11-SMOKE-SUMMARY.md` refreshed on the deployed host
  - `infra/data/rollout-smoke/latest.json` refreshed on the deployed host
  - final smoke verdict remained `hold_rollout`
  - final smoke stage = `after_settle`
  - final smoke pool status = `degraded`
  - final smoke ready workers = `1/9`
  - public canary on `shared-6` failed with `502` on `healthz`, `v1/models`, and `v1/chat/completions`
- Preserve-first safety held during both the follow-up run and the smoke rerun:
  - profiles were not deleted
  - cookies and local storage were not cleared
  - no blind full-pool restart happened
  - no mass relogin happened
  - `shared-6` was stopped again after cleanup
  - port `4028` was no longer listening

## Requirement Status

- `WFUP-01`: complete
  - the repo now carries the canonical persistent follow-up harness under `phase19-persistent-followup-v1`, and the deployed host exercised that harness live before the smoke rerun
- `WFUP-02`: complete
  - the phase now has one durable preserve-first follow-up artifact that records before/after ready counts plus separate truth for `windows_edge_forced_host` and `ubuntu_public_owner`
- `WFUP-03`: complete
  - `GET /internal/persistent-disconnected-runtime-followup/latest` and `/internal/admin` both showed the same latest follow-up result
- `WFUP-04`: complete
  - the proven Phase 11 smoke reran after the follow-up run and ended with one explicit final verdict: `hold_rollout`

## Repo/Runtime Parity Note

- The live Phase 19 follow-up still surfaced the exact runtime gaps that had to be restored on the deployed host during execution:
  - `probe-public-api.ps1`
  - `recover-browser-block-readiness.ps1`
  - `remediate-disconnected-runtime-and-forced-host-edge.ps1`
  - `remediate-persistent-disconnected-runtime-and-public-502.ps1`
  - `test-rollout-smoke.ps1`
  - `test-host-worker-relay.ps1`
- This checkout now has the Phase 19 harness and operator-surface contract, but those raw deployed-host compatibility restores are not yet synced back into the repo verbatim.

## Local Reconstruction Note

- The local copies of `19-FOLLOWUP-SUMMARY.json`, `19-FOLLOWUP-SUMMARY.md`, `11-SMOKE-SUMMARY.json`, `11-SMOKE-SUMMARY.md`, and the matching `latest.json` files are reconstructed from the operator report because the raw deployed-host artifacts were not synced back into this checkout.

## Remaining Rollout Blocker

1. Phase 19 is complete, and the remaining rollout blocker is no longer missing follow-up tooling, missing operator visibility, or the absence of a smoke rerun.
2. The blocker is still the live runtime path: the follow-up stayed at `0/9 ready`, the dominant blocker remained `disconnected`, the first failing hop remained `windows_edge_forced_host`, and the public owner still returned `502`.
3. Even after the follow-up run, the exact smoke contract still settles only at `1/9 ready` with a degraded pool and a fully red public canary on `shared-6`.
