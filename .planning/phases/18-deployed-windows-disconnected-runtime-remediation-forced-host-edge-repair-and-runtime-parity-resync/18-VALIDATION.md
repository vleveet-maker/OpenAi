# Phase 18 Validation

## Validation Focus

This phase is valid only if it turns the confirmed `disconnected` runtime baseline plus `windows_edge_forced_host` branch into one parity-synced, operator-visible remediation flow with a final smoke verdict.

## Required Evidence

- one canonical preserve-first disconnected-runtime remediation harness exists
- one durable JSON and Markdown remediation summary is written
- the remediation artifact records ready-count changes, dominant runtime blocker, first failing hop, forced-Host status, public-owner status, and verdict
- the latest remediation result is visible through an internal operator surface or route
- the phase ends with one explicit final verdict: `remediated_through_smoke` or `hold_rollout`

Expected artifacts:

- `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`
- `infra/data/disconnected-runtime-remediation/latest.json`
- `services/control-api/src/routes/internal-disconnected-runtime-remediation.ts`
- `.planning/phases/18-deployed-windows-disconnected-runtime-remediation-forced-host-edge-repair-and-runtime-parity-resync/18-REMEDIATION-SUMMARY.json`
- `.planning/phases/18-deployed-windows-disconnected-runtime-remediation-forced-host-edge-repair-and-runtime-parity-resync/18-REMEDIATION-SUMMARY.md`
- `.planning/phases/18-deployed-windows-disconnected-runtime-remediation-forced-host-edge-repair-and-runtime-parity-resync/18-VERIFICATION.md`

## Automated Checks

- PowerShell parse checks for:
  - `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/windows-block/investigate-post-stabilization-runtime-and-public-502.ps1`
  - `infra/windows-block/stabilize-post-remediation-degraded-smoke.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-disconnected-runtime-remediation.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

These checks should cover:

- the exact compatibility marker `phase18-runtime-remediation-v1`
- the new latest disconnected-runtime remediation route shape
- the internal admin page rendering and empty state
- the remediation artifact fields `preRemediationReadyCount`, `postRemediationReadyCount`, `dominantRuntimeBlocker`, `firstFailingHop`, `forcedHostStatus`, `publicOwnerStatus`, and `verdict`
- the generated `dist` runtime files that the deployed host actually starts

## Manual Checks

From the deployed Windows/browser-block host, overlay the Phase 18 archive, restart `control-api`, then run the exact Phase 18 remediation harness:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\remediate-disconnected-runtime-and-forced-host-edge.ps1 `
  -SessionBaseUrl http://127.0.0.1:8080 `
  -PublicApiBaseUrl http://77.66.186.75 `
  -InternalBaseUrl http://127.0.0.1:8081 `
  -HostControllerBaseUrl http://127.0.0.1:4040 `
  -WindowsEdgeBaseUrl http://127.0.0.1 `
  -PublicHostHeader 77.66.186.75 `
  -CanaryWorkerId shared-6 `
  -WorkerIds dad,wife,shared-1,shared-2,shared-3,shared-4,shared-5,shared-6,shared-7 `
  -RecoveryWaitSeconds 15 `
  -EdgeSettleSeconds 10 `
  -OutputJsonPath .\.planning\phases\18-deployed-windows-disconnected-runtime-remediation-forced-host-edge-repair-and-runtime-parity-resync\18-REMEDIATION-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\18-deployed-windows-disconnected-runtime-remediation-forced-host-edge-repair-and-runtime-parity-resync\18-REMEDIATION-SUMMARY.md
```

Then confirm one of these shows the same latest result:

- `GET /internal/disconnected-runtime-remediation/latest`
- `/internal/admin` -> `Latest disconnected runtime remediation`

Then rerun the exact Phase 11 smoke command and use that result when writing `18-VERIFICATION.md`.

## Accept/Reject Rule

Accept the phase only if:

- `WREP-01` is satisfied by one explicit repo/runtime compatibility marker plus repo-side sync of the latest deployed-host restores
- `WREP-02` is satisfied by one preserve-first remediation artifact that records before/after ready counts and separates `windows_edge_forced_host` from `ubuntu_public_owner`
- `WREP-03` is satisfied by one summarized latest-remediation surface instead of raw terminal output
- `WREP-04` is satisfied by one live remediation run followed by one rerun of the proven smoke contract, ending with exactly one final verdict `remediated_through_smoke` or `hold_rollout`

Reject the phase if it:

- records only another degraded note without a durable remediation artifact
- leaves the forced-Host and public-owner branches collapsed into one vague `502`
- hides the latest result in terminal output only
- skips the live deployed-host run
- skips the post-remediation smoke rerun
- uses destructive profile, cookie, or relogin actions as the default path
