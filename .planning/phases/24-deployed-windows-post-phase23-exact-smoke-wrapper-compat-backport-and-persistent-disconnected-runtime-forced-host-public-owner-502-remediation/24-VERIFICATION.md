# 24 Verification

## Verdict

- Final verdict: `hold_rollout`
- Phase outcome: completed with negative evidence
- Exact smoke-wrapper compat conclusion: `requires_live_fix`

## What Was Proven

- The repo now contains the Phase 24 exact smoke-wrapper compat marker, canonical remediation harness, file-backed latest route, matching `/internal/admin` section, and rebuilt `dist` runtime.
- The deployed host overlaid the Phase 24 archive, restarted `control-api`, ran the exact remediation command, and exposed the resulting latest artifact through both `GET /internal/post-phase23-exact-smoke-wrapper-compat-remediation/latest` and `/internal/admin`.
- The exact smoke rerun completed and wrote fresh Phase 11 smoke artifacts with one explicit verdict instead of failing partway through.

## Final Live Truth

- Phase 24 remediation artifact:
  - `verdict=hold_rollout`
  - `smokeWrapperCompatStatus=archive_chain_ready`
  - `preRemediationReadyCount=0/9`
  - `postRemediationReadyCount=0/9`
  - `dominantRuntimeBlocker=disconnected`
  - `firstFailingHop=windows_edge_forced_host`
  - `loopbackStatus=passed`
  - `forcedHostStatus=failed`
  - `publicOwnerStatus=failed`
- Phase 24 smoke rerun artifact:
  - `scriptCompatibilityVersion=phase24-exact-smoke-wrapper-compat-backport-v1`
  - `verdict=hold_rollout`
  - `finalStage=after_settle`
  - `poolStatus=degraded`
  - `readyWorkers=1/9`
  - public canary on `shared-6` returned `503/503/503`

## Why Compat Backport Is Still Not Closed

- The archive overlay still required post-overlay live fixes before smoke could run successfully.
- Those fixes were restored in:
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/recover-browser-block-readiness.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/windows-block/remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1`
  - `infra/windows-block/remediate-post-phase23-exact-smoke-wrapper-compat-and-persistent-disconnected-runtime.ps1`
  - `infra/host-worker/test-host-worker-relay.ps1`
- Because the exact smoke rerun depended on the current server-working copy rather than the untouched archive-overlaid copy, the truthful final compat state is `requires_live_fix`.

## Preserve-First Audit

- profiles preserved
- cookies not cleared
- local storage not cleared
- no blind full-pool restart
- no mass relogin
- `shared-6` stopped after cleanup
- port `4028` not left listening
- browser closed after canary

## Requirement Verdict

- `WSCB-01`: complete with negative evidence; the phase proved the archive overlay still does not carry the smoke-critical behavior forward unchanged
- `WSCB-02`: complete
- `WSCB-03`: complete
- `WSCB-04`: complete with final verdict `hold_rollout`

## Follow-Up Trigger

- Open the next phase because exact smoke-wrapper compat still requires live restores after overlay and the public owner now fails at `503` rather than `502`.
