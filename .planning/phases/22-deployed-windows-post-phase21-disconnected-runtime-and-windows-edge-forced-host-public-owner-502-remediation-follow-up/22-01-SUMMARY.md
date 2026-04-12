# 22-01 Summary

## Outcome

- Added the canonical wrapper `infra/windows-block/remediate-post-phase21-disconnected-runtime-and-forced-host-public-owner-502.ps1`
- Reused the completed Phase 21 remediation chain instead of reopening parity work
- Wired the wrapper to write `22-FOLLOWUP-SUMMARY.json`, `22-FOLLOWUP-SUMMARY.md`, and `infra/data/post-phase21-disconnected-runtime-followup/latest.json`
- Added explicit `loopbackStatus` extraction from the remediation chain so the Phase 22 artifact keeps loopback, forced-host, and public-owner truth separate
- Updated the Windows/browser-block/operator docs with one exact Phase 22 sync list and one exact live follow-up command

## Verification

- `rg -n "phase22-post-phase21-followup-v1|before_post_phase21_followup|after_targeted_runtime_revive|after_loopback_recheck|after_forced_host_recheck|after_public_owner_recheck|after_canary_stop|preRemediationReadyCount|postRemediationReadyCount|dominantRuntimeBlocker|firstFailingHop|loopbackStatus|forcedHostStatus|publicOwnerStatus|post_phase21_ready_for_smoke|hold_rollout|22-FOLLOWUP-SUMMARY|post-phase21-disconnected-runtime-followup/latest.json" infra/windows-block/remediate-post-phase21-disconnected-runtime-and-forced-host-public-owner-502.ps1`
- `rg -n "remediate-post-phase21-disconnected-runtime-and-forced-host-public-owner-502.ps1|remediate-disconnected-runtime-and-forced-host-public-502-post-parity.ps1|probe-public-api.ps1|recover-browser-block-readiness.ps1|remediate-persistent-disconnected-runtime-and-public-502-parity.ps1|test-rollout-smoke.ps1|test-host-worker-relay.ps1|shared-6|RuntimeReviveWaitSeconds|ForcedHostSettleSeconds|PublicOwnerSettleSeconds|77.66.186.75|22-FOLLOWUP-SUMMARY|profile deletion|mass relogin" docs/windows-browser-block.md docs/windows-public-api-block.md docs/internal-worker-ops.md`
- PowerShell parser checks passed for:
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/recover-browser-block-readiness.ps1`
  - `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502-parity.ps1`
  - `infra/windows-block/remediate-post-phase21-disconnected-runtime-and-forced-host-public-owner-502.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/host-worker/test-host-worker-relay.ps1`

## Notes

- The new Phase 22 wrapper keeps the preserve-first bounded-canary contract and does not widen beyond `shared-6` by default
- The Phase 22 follow-up artifact exposes `preRemediationReadyCount`, `postRemediationReadyCount`, `dominantRuntimeBlocker`, `firstFailingHop`, `loopbackStatus`, `forcedHostStatus`, `publicOwnerStatus`, and verdict `post_phase21_ready_for_smoke|hold_rollout`
