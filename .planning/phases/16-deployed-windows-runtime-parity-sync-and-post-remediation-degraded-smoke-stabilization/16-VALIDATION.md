# Phase 16 Validation

## Validation Focus

This phase is valid only if it converts the Phase 15 runtime-drift note into a parity-synced, operator-visible, and live-verified stabilization pass.

## Required Evidence

- the repo now has one explicit runtime parity contract for the deployed-host hotfix path
- one canonical post-remediation degraded-smoke stabilization harness exists
- one durable stabilization summary is written as JSON and Markdown
- the latest stabilization result is visible through an internal operator surface or route
- the phase ends with one explicit verdict: `stabilized_through_smoke` or `hold_rollout`

Expected artifacts:

- `infra/windows-block/stabilize-post-remediation-degraded-smoke.ps1`
- `infra/data/post-remediation-degraded-smoke/latest.json`
- `services/control-api/src/routes/internal-post-remediation-degraded-smoke.ts`
- `.planning/phases/16-deployed-windows-runtime-parity-sync-and-post-remediation-degraded-smoke-stabilization/16-STABILIZATION-SUMMARY.json`
- `.planning/phases/16-deployed-windows-runtime-parity-sync-and-post-remediation-degraded-smoke-stabilization/16-STABILIZATION-SUMMARY.md`
- `.planning/phases/16-deployed-windows-runtime-parity-sync-and-post-remediation-degraded-smoke-stabilization/16-VERIFICATION.md`

## Automated Checks

- PowerShell parse checks for:
  - `infra/windows-block/stabilize-post-remediation-degraded-smoke.ps1`
  - `infra/windows-block/remediate-disconnected-baseline-and-forced-host-edge.ps1`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-post-remediation-degraded-smoke.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

These checks should cover:

- the exact compatibility marker for the parity-synced runtime path
- the new latest-stabilization route shape
- the internal admin page rendering and empty state
- the stabilization harness stage names and verdict fields
- the generated `dist` runtime files that the deployed host actually starts

## Manual Checks

From the deployed Windows/browser-block host, overlay the Phase 16 archive and restart `control-api`, then run the exact Phase 16 stabilization harness:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\stabilize-post-remediation-degraded-smoke.ps1 `
  -SessionBaseUrl http://127.0.0.1:8080 `
  -PublicApiBaseUrl http://77.66.186.75 `
  -InternalBaseUrl http://127.0.0.1:8081 `
  -HostControllerBaseUrl http://127.0.0.1:4040 `
  -WindowsEdgeBaseUrl http://127.0.0.1 `
  -PublicHostHeader 77.66.186.75 `
  -CanaryWorkerId shared-6 `
  -WorkerIds dad,wife,shared-1,shared-2,shared-3,shared-4,shared-5,shared-6,shared-7 `
  -RecoveryWaitSeconds 15 `
  -PostCanaryDelaySeconds 10 `
  -PostSmokeDelaySeconds 15 `
  -KeepCanaryRunningUntilFinalSnapshot `
  -OutputJsonPath .\.planning\phases\16-deployed-windows-runtime-parity-sync-and-post-remediation-degraded-smoke-stabilization\16-STABILIZATION-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\16-deployed-windows-runtime-parity-sync-and-post-remediation-degraded-smoke-stabilization\16-STABILIZATION-SUMMARY.md
```

Then confirm one of these shows the same latest result:

- `GET /internal/post-remediation-degraded-smoke/latest`
- `/internal/admin` -> `Latest post-remediation degraded smoke stabilization`

## Accept/Reject Rule

Accept the phase only if:

- `WPAR-01` is satisfied by one explicit repo/runtime parity contract for the live hotfix path
- `WPAR-02` is satisfied by one durable stabilization artifact that records pre-smoke readiness, final smoke readiness, final pool status, and public-canary truth
- `WPAR-03` is satisfied by one summarized latest-stabilization surface instead of raw terminal output
- `WPAR-04` is satisfied by one live parity-synced run that ends with exactly one final verdict `stabilized_through_smoke` or `hold_rollout`

Reject the phase if it:

- leaves the live hotfix path only on the server and not in the repo
- records only another smoke note without a durable stabilization artifact
- hides the latest stabilization result in terminal output only
- skips the live parity-synced run on the deployed host
- uses destructive profile, cookie, or relogin actions as the default stabilization path
