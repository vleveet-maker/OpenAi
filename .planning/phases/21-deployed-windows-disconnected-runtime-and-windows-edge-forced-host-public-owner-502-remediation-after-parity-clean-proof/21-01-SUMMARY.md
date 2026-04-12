# 21-01 Summary

## Outcome

- Added the canonical wrapper `infra/windows-block/remediate-disconnected-runtime-and-forced-host-public-502-post-parity.ps1`
- Reused the Phase 20 parity-clean remediation chain instead of reopening compatibility work
- Wired the wrapper to write `21-REMEDIATION-SUMMARY.json`, `21-REMEDIATION-SUMMARY.md`, and `infra/data/post-parity-disconnected-runtime-remediation/latest.json`
- Updated the Windows/browser-block/operator docs with one exact Phase 21 sync list and one exact live remediation command

## Verification

- `rg -n "phase21-post-parity-remediation-v1|before_post_parity_remediation|after_targeted_runtime_revive|after_loopback_confirmation|after_forced_host_recheck|after_public_owner_recheck|after_canary_stop|preRemediationReadyCount|postRemediationReadyCount|dominantRuntimeBlocker|firstFailingHop|forcedHostStatus|publicOwnerStatus|post_parity_ready_for_smoke|hold_rollout|21-REMEDIATION-SUMMARY|post-parity-disconnected-runtime-remediation/latest.json" infra/windows-block/remediate-disconnected-runtime-and-forced-host-public-502-post-parity.ps1`
- `rg -n "remediate-disconnected-runtime-and-forced-host-public-502-post-parity.ps1|probe-public-api.ps1|recover-browser-block-readiness.ps1|remediate-persistent-disconnected-runtime-and-public-502-parity.ps1|test-rollout-smoke.ps1|test-host-worker-relay.ps1|shared-6|RuntimeReviveWaitSeconds|ForcedHostSettleSeconds|PublicOwnerSettleSeconds|77.66.186.75|21-REMEDIATION-SUMMARY|profile deletion|mass relogin" docs/windows-browser-block.md docs/windows-public-api-block.md docs/internal-worker-ops.md`
- PowerShell parser checks passed for:
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/recover-browser-block-readiness.ps1`
  - `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502-parity.ps1`
  - `infra/windows-block/remediate-disconnected-runtime-and-forced-host-public-502-post-parity.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/host-worker/test-host-worker-relay.ps1`

## Notes

- The new Phase 21 wrapper keeps the preserve-first bounded-canary contract and does not widen beyond `shared-6` by default
- The post-parity artifact exposes `preRemediationReadyCount`, `postRemediationReadyCount`, `dominantRuntimeBlocker`, `firstFailingHop`, `forcedHostStatus`, `publicOwnerStatus`, and verdict `post_parity_ready_for_smoke|hold_rollout`
