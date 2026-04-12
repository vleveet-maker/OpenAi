# 18 Verification

## Final Verdict

`hold_rollout`

## Confirmed Live Truth

- The live Phase 18 remediation harness ran on the deployed Windows browser-block host after the Phase 18 archive overlay.
- The deployed host restarted `control-api` on `127.0.0.1:8081` before the live remediation run.
- The deployed host wrote `18-REMEDIATION-SUMMARY.json` and `18-REMEDIATION-SUMMARY.md`.
- The remediation result was explicit before the smoke rerun:
  - `hold_rollout`
  - compatibility version `phase18-runtime-remediation-v1`
  - pre-remediation ready = `0/9`
  - post-remediation ready = `0/9`
  - dominant runtime blocker = `disconnected`
  - first failing hop = `windows_edge_forced_host`
  - the bounded canary `shared-6` came up locally and passed the relay proof with `smoke-ok`
  - the public gate `http://77.66.186.75` still returned `502`
- Operator-surface confirmation is complete:
  - `GET /internal/disconnected-runtime-remediation/latest` returned the current latest remediation result
  - `/internal/admin` showed `Latest disconnected runtime remediation`
- The exact post-remediation smoke rerun also happened:
  - `11-SMOKE-SUMMARY.json` refreshed on the deployed host
  - `11-SMOKE-SUMMARY.md` refreshed on the deployed host
  - `infra/data/rollout-smoke/latest.json` refreshed on the deployed host
  - final smoke verdict remained `hold_rollout`
  - final smoke stage = `after_settle`
  - final smoke pool status = `degraded`
  - final smoke ready workers = `1/9`
  - public canary on `shared-6` failed with `502` on `healthz`, `v1/models`, and `v1/chat/completions`
- Preserve-first safety held during both the remediation run and the smoke rerun:
  - profiles were not deleted
  - cookies and local storage were not cleared
  - no blind full-pool restart happened
  - no mass relogin happened
  - `shared-6` was stopped again after cleanup
  - `agentListening=false` and `browserListening=false` after cleanup
  - port `4028` was no longer listening

## Requirement Status

- `WREP-01`: complete
  - the repo now carries the recorded compatibility marker `phase18-runtime-remediation-v1` plus the backported string-or-object `Worker.status` normalization in the runtime-critical Windows wrappers, so the next archive no longer depends on the old `status.detail`-only assumption that the deployed host had to restore manually
- `WREP-02`: complete
  - the phase now has one durable preserve-first remediation artifact that records before/after ready counts plus separate truth for `windows_edge_forced_host` and `ubuntu_public_owner`
- `WREP-03`: complete
  - `GET /internal/disconnected-runtime-remediation/latest` and `/internal/admin` both showed the same latest remediation result
- `WREP-04`: complete
  - the proven Phase 11 smoke reran after the parity-synced remediation run and ended with one explicit final verdict: `hold_rollout`

## Repo/Runtime Parity Note

- The live Phase 18 remediation still surfaced the exact runtime gaps that had to be restored on the deployed host during execution:
  - `probe-public-api.ps1`
  - `recover-browser-block-readiness.ps1`
  - `remediate-disconnected-runtime-and-forced-host-edge.ps1`
  - `test-rollout-smoke.ps1`
- This checkout now backports the known status-schema compatibility fix across the runtime-critical Windows wrappers, so the repo no longer keeps the old `status.detail` assumption that broke the deployed smoke rerun after overlay.

## Local Reconstruction Note

- The local copies of `18-REMEDIATION-SUMMARY.json`, `18-REMEDIATION-SUMMARY.md`, `11-SMOKE-SUMMARY.json`, `11-SMOKE-SUMMARY.md`, and the matching `latest.json` files are reconstructed from the operator report because the raw deployed-host artifacts were not synced back into this checkout.

## Remaining Rollout Blocker

1. Phase 18 is complete, and the remaining rollout blocker is no longer missing remediation tooling, missing operator visibility, or the old `status.detail` schema mismatch.
2. The blocker is still the live runtime path: remediation stayed at `0/9 ready`, the first failing hop remains `windows_edge_forced_host`, and the public path at `http://77.66.186.75` still returns `502`.
3. Even after the remediation run, the exact smoke contract still settles only at `1/9 ready` with a degraded pool and a fully red public canary on `shared-6`.
