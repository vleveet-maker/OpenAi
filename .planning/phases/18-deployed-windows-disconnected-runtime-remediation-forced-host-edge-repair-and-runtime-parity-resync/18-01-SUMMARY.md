# 18-01 Summary

## Outcome

- Synced the runtime-critical wrapper chain back to a single compatibility marker: `phase18-runtime-remediation-v1`
- Added the canonical preserve-first remediation wrapper: `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`
- Updated the operator docs with one exact Phase 18 sync list and one exact live remediation command

## Verification

- `rg` confirmed the required Phase 18 markers, hop names, stage names, artifact paths, and verdict vocabulary
- PowerShell parser checks passed for:
  - `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/windows-block/investigate-post-stabilization-runtime-and-public-502.ps1`
  - `infra/windows-block/stabilize-post-remediation-degraded-smoke.ps1`

## Notes

- The new remediation wrapper records the exact Phase 18 stages `before_runtime_remediation`, `after_targeted_reconnect`, `after_loopback_probe`, `after_forced_host_probe`, `after_public_owner_probe`, and `after_canary_stop`
- The wrapper writes `18-REMEDIATION-SUMMARY.json`, `18-REMEDIATION-SUMMARY.md`, and `infra/data/disconnected-runtime-remediation/latest.json`
