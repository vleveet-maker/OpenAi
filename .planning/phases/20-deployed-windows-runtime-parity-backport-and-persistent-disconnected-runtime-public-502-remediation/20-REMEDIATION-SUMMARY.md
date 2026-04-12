# Runtime Parity Backport Remediation Summary

- Generated: `2026-04-01` (date-level repo sync from the deployed-host operator report; the exact remote `generatedAt` was not copied back into this checkout)
- Script compatibility version: `phase20-runtime-parity-backport-v1`
- Upstream compatibility version: `phase19-persistent-followup-v1`
- Verdict: `hold_rollout`
- Summary: Hold rollout. Even after the parity-clean backport overlay, the remediation path stayed at `0/9 -> 0/9` ready, the dominant blocker remained `disconnected`, the first failing hop remained `windows_edge_forced_host`, and the public-owner gate still did not pass.
- Canary worker: `shared-6`
- Requested workers: `dad, wife, shared-1, shared-2, shared-3, shared-4, shared-5, shared-6, shared-7`
- RuntimeReviveWaitSeconds: `15`
- ForcedHostSettleSeconds: `10`
- PublicOwnerSettleSeconds: `10`

## Runtime Parity Backport

- preRemediationReadyCount: `0/9`
- postRemediationReadyCount: `0/9`
- dominantRuntimeBlocker: `disconnected`
- firstFailingHop: `windows_edge_forced_host`
- forcedHostStatus: `fail`
- publicOwnerStatus: `fail`
- parityBackportFiles: `infra/windows-block/probe-public-api.ps1`, `infra/windows-block/recover-browser-block-readiness.ps1`, `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`, `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502.ps1`, `infra/windows-block/test-rollout-smoke.ps1`, `infra/host-worker/test-host-worker-relay.ps1`
- operator surface matched the artifact through `/internal/runtime-parity-backport-remediation/latest` and `/internal/admin`

## Preserve-First Result

- profiles and sessions preserved
- no profile deletion or reset
- no cookie or local-storage clearing
- no blind full-pool restart
- no relogin
- `shared-6` was stopped again after the remediation run
- port `4028` was not left listening
- from the required ports only `127.0.0.1:4040` and `127.0.0.1:8081` remained listening

## Runtime Parity Note

- Unlike the earlier follow-up phases, the live Phase 20 run did not report any new post-overlay server-only compatibility restore after the archive overlay.
- This repo copy of the parity-clean archive is therefore now proven as deployed-host runnable even though the rollout verdict remains `hold_rollout`.
