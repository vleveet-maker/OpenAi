# 23-01 Summary

## Outcome

- Added the canonical wrapper `infra/windows-block/remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1`
- Backported the smoke-critical compatibility marker `phase23-smoke-wrapper-parity-recovery-v1` into `infra/windows-block/test-rollout-smoke.ps1` and `infra/windows-block/probe-public-api.ps1`
- Wired the wrapper to write `23-PARITY-REMEDIATION-SUMMARY.json`, `23-PARITY-REMEDIATION-SUMMARY.md`, and `infra/data/post-phase22-smoke-wrapper-parity-remediation/latest.json`
- Exposed explicit `smokeWrapperParityStatus` plus `loopbackStatus`, `forcedHostStatus`, and `publicOwnerStatus` without reopening the older remediation chain
- Updated `docs/windows-browser-block.md`, `docs/windows-public-api-block.md`, and `docs/internal-worker-ops.md` with one exact Phase 23 sync list, one exact live command, and the archive-overlaid smoke-wrapper note

## Verification

- `rg -n "phase23-smoke-wrapper-parity-recovery-v1|before_phase23_parity_recovery|after_smoke_wrapper_parity_check|after_targeted_runtime_revive|after_loopback_recheck|after_forced_host_recheck|after_public_owner_recheck|after_canary_stop|smokeWrapperParityStatus|preRemediationReadyCount|postRemediationReadyCount|dominantRuntimeBlocker|firstFailingHop|loopbackStatus|forcedHostStatus|publicOwnerStatus|parity_recovered_ready_for_smoke|hold_rollout|23-PARITY-REMEDIATION-SUMMARY|post-phase22-smoke-wrapper-parity-remediation/latest.json" infra/windows-block/remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1 infra/windows-block/test-rollout-smoke.ps1 infra/windows-block/probe-public-api.ps1`
- `rg -n "remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1|remediate-post-phase21-disconnected-runtime-and-forced-host-public-owner-502.ps1|test-rollout-smoke.ps1|probe-public-api.ps1|recover-browser-block-readiness.ps1|test-host-worker-relay.ps1|shared-6|RuntimeReviveWaitSeconds|ForcedHostSettleSeconds|PublicOwnerSettleSeconds|77.66.186.75|23-PARITY-REMEDIATION-SUMMARY|archive-overlaid test-rollout-smoke.ps1|parity failure|profile deletion|mass relogin" docs/windows-browser-block.md docs/windows-public-api-block.md docs/internal-worker-ops.md`
- PowerShell parser checks passed for:
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/recover-browser-block-readiness.ps1`
  - `infra/windows-block/remediate-post-phase21-disconnected-runtime-and-forced-host-public-owner-502.ps1`
  - `infra/windows-block/remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/host-worker/test-host-worker-relay.ps1`

## Notes

- The new Phase 23 wrapper stays preserve-first and still routes through the bounded canary `shared-6`
- `smokeWrapperParityStatus=archive_chain_ready|marker_missing` is now explicit before the live smoke rerun starts
