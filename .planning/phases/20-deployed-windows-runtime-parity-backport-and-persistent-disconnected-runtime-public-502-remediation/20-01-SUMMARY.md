# 20-01 Summary

## Outcome

- Backported the six runtime-critical deployed-host compatibility markers into the repo under `phase20-runtime-parity-backport-v1`
- Added the canonical wrapper `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502-parity.ps1`
- Wired the wrapper to write `20-REMEDIATION-SUMMARY.json`, `20-REMEDIATION-SUMMARY.md`, and `infra/data/runtime-parity-backport-remediation/latest.json`
- Updated the Windows/browser-block/operator docs with one exact Phase 20 sync list and one exact live remediation command

## Verification

- `rg -n "phase20-runtime-parity-backport-v1|loopback_api|windows_edge_forced_host|ubuntu_public_owner|shared-6|4028|test-host-worker-relay|probe-public-api|status\.detail" infra/windows-block/probe-public-api.ps1 infra/windows-block/recover-browser-block-readiness.ps1 infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1 infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502.ps1 infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502-parity.ps1 infra/windows-block/test-rollout-smoke.ps1 infra/host-worker/test-host-worker-relay.ps1`
- PowerShell parser checks passed for:
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/recover-browser-block-readiness.ps1`
  - `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`
  - `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502.ps1`
  - `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502-parity.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/host-worker/test-host-worker-relay.ps1`

## Notes

- The new parity wrapper reuses the Phase 19 chain instead of inventing a separate remediation dialect
- The Phase 20 artifact exposes `parityBackportFiles`, `preRemediationReadyCount`, `postRemediationReadyCount`, `dominantRuntimeBlocker`, `firstFailingHop`, `forcedHostStatus`, `publicOwnerStatus`, and verdict `parity_backport_ready_for_smoke|hold_rollout`
