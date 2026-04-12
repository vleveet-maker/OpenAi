# 15 Verification

## Final Verdict

`hold_rollout`

## Confirmed Live Truth

- The live Phase 15 remediation harness ran on the deployed Windows browser-block host.
- The deployed host wrote `15-REMEDIATION-SUMMARY.json` and `15-REMEDIATION-SUMMARY.md`.
- The pre-smoke remediation verdict was explicit before the smoke rerun:
  - `hold_rollout`
  - final remediation snapshot `0/9 ready`
  - only `shared-6` temporarily came up and passed `loopback_api` with `200/200/200` plus `reply=probe-ok`
  - `windows_edge_forced_host` remained `transport_error`
  - `ubuntu_public_owner` remained `502` on `healthz`, `v1/models`, and `v1/chat/completions`
  - public owner response header remained `Server: nginx/1.18.0 (Ubuntu)`
- Operator-surface confirmation is complete:
  - `GET /internal/disconnected-baseline-remediation/latest` returned the current latest result
  - `/internal/admin` showed `Latest disconnected baseline remediation`
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
  - port `4028` was no longer listening
  - active listening workers returned to `0`

## Requirement Status

- `WREM-01`: complete
  - the phase now has one durable remediation artifact that records the disconnected baseline, the temporary bounded recovery on `shared-6`, and the final held state without destructive reset behavior
- `WREM-02`: complete
  - the remediation artifact records the post-repair truth for `windows_edge_forced_host` and `ubuntu_public_owner` separately instead of collapsing them back into one vague `502`
- `WREM-03`: complete
  - `GET /internal/disconnected-baseline-remediation/latest` and `/internal/admin` both showed the same latest remediation result
- `WREM-04`: complete
  - the proven Phase 11 smoke reran after remediation, refreshed the smoke artifacts, and ended with one explicit final verdict: `hold_rollout`

## Repo/Runtime Drift Note

- The deployed host required runtime-specific hotfixes before the route confirmation and smoke rerun would run cleanly:
  - `config.ts`
  - `server.ts`
  - `internal-admin-page.ts`
  - `config.js`
  - `server.js`
  - `internal-admin-page.js`
  - `probe-public-api.ps1`
  - `test-rollout-smoke.ps1`
- Those raw deployed-host code changes have not been synced back into this checkout yet, so this phase is closed on truthful runtime evidence and operator confirmation rather than on a full repo/runtime parity claim.

## Local Reconstruction Note

- The local copies of `15-REMEDIATION-SUMMARY.json`, `15-REMEDIATION-SUMMARY.md`, `11-SMOKE-SUMMARY.json`, `11-SMOKE-SUMMARY.md`, and the `latest.json` files are reconstructed from the operator report because the raw deployed-host artifacts were not synced back into this checkout.

## Remaining Rollout Blocker

1. Phase 15 is complete, and the remaining rollout blocker is no longer missing remediation tooling or operator visibility: both now exist and were exercised on the deployed host.
2. The blocker is the runtime itself after remediation: `windows_edge_forced_host` still fails as `transport_error`, `ubuntu_public_owner` still returns `502`, and the post-remediation smoke still settles only at `1/9 ready` with a degraded pool.
