# 23 Verification

## Final Verdict

`hold_rollout`

## Confirmed Live Truth

- The deployed Windows browser-block host overlaid the Phase 23 archive and restarted `control-api` on `127.0.0.1:8081` before the live parity-remediation run.
- The live remediation run wrote `23-PARITY-REMEDIATION-SUMMARY.json` plus `23-PARITY-REMEDIATION-SUMMARY.md`.
- Operator-surface confirmation is complete for the remediation artifact:
  - `GET /internal/post-phase22-smoke-wrapper-parity-remediation/latest` returned the current latest parity-remediation result
  - `/internal/admin` showed `Latest post-phase22 smoke-wrapper parity remediation`
- The remediation result was explicit before smoke:
  - `hold_rollout`
  - compatibility version `phase23-smoke-wrapper-parity-recovery-v1`
  - pre-remediation ready = `0/9`
  - post-remediation ready = `0/9`
  - dominant runtime blocker = `disconnected`
  - first failing hop = `windows_edge_forced_host`
  - `loopbackStatus = passed`
  - forced-host and public-owner checks both failed
- The exact smoke rerun also happened after the parity-remediation checkpoint:
  - `11-SMOKE-SUMMARY.json` refreshed on the deployed host
  - `11-SMOKE-SUMMARY.md` refreshed on the deployed host
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
  - the browser was closed after the smoke rerun

## Requirement Status

- `WSPR-01`: complete
  - the phase made the final parity truth explicit: the archive overlay no longer rolled in the stale Phase 22 copy, but a pure archive-unchanged smoke path still did not survive deployment because the host needed post-overlay restores in `probe-public-api.ps1`, `test-rollout-smoke.ps1`, and `remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1`
- `WSPR-02`: complete
  - the live post-Phase-22 remediation flow ran preserve-first and recorded exact before/after truth for the still-disconnected baseline plus loopback, forced-host, and public-owner status
- `WSPR-03`: complete
  - `GET /internal/post-phase22-smoke-wrapper-parity-remediation/latest` and `/internal/admin` both showed the same latest parity-remediation result
- `WSPR-04`: complete
  - the proven Phase 11 smoke reran after the Phase 23 remediation checkpoint and ended with one explicit final verdict: `hold_rollout`

## Repo/Runtime Compatibility Note

- The live remediation artifact still reported `smokeWrapperParityStatus=archive_chain_ready` before smoke, but the deployed host needed post-overlay compatibility restores before the smoke rerun could succeed.
- The successful smoke rerun therefore used the current phase-23-compatible server-working copy of `test-rollout-smoke.ps1` instead of proving a pure archive-unchanged wrapper chain.
- The raw deployed-host script diffs were not synced back verbatim into this checkout.

## Local Reconstruction Note

- The local copies of `23-PARITY-REMEDIATION-SUMMARY.json`, `23-PARITY-REMEDIATION-SUMMARY.md`, `11-SMOKE-SUMMARY.json`, `11-SMOKE-SUMMARY.md`, and the matching `latest.json` files are reconstructed from the operator report because the raw deployed-host artifacts were not synced back into this checkout.

## Remaining Rollout Blocker

1. Phase 23 is complete, and the remaining rollout blocker is no longer missing tooling, missing operator visibility, or a missing smoke rerun.
2. The blocker is still the live runtime path: remediation stayed `0/9 -> 0/9 ready`, the dominant blocker stayed `disconnected`, the first failing hop stayed `windows_edge_forced_host`, and both forced-host plus public-owner checks stayed red.
3. Even after the Phase 23 parity-remediation checkpoint, the exact smoke contract still settled only at `1/9 ready` with a degraded pool and a fully red public canary on `shared-6`, while the deployed host still needed post-overlay wrapper compatibility restores.
