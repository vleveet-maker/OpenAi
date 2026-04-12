# Phase 15 Validation

## Validation Focus

This phase is valid only if it turns the exact Phase 14 diagnosis into a preserve-first remediation attempt that is durable, operator-visible, and tied back to the real rollout smoke contract.

## Required Evidence

- one canonical disconnected-baseline plus forced-Host remediation harness exists
- one durable remediation summary is written as JSON and Markdown
- the latest remediation result is visible through an internal operator surface or route
- the phase reruns the proven Phase 11 smoke after remediation
- the phase ends with one explicit verdict: `remediated_through_smoke` or `hold_rollout`

Expected artifacts:

- `infra/windows-block/remediate-disconnected-baseline-and-forced-host-edge.ps1`
- `infra/data/disconnected-baseline-remediation/latest.json`
- `.planning/phases/15-deployed-windows-disconnected-baseline-and-forced-host-edge-remediation/15-REMEDIATION-SUMMARY.json`
- `.planning/phases/15-deployed-windows-disconnected-baseline-and-forced-host-edge-remediation/15-REMEDIATION-SUMMARY.md`
- `.planning/phases/15-deployed-windows-disconnected-baseline-and-forced-host-edge-remediation/15-VERIFICATION.md`

## Automated Checks

- PowerShell parse checks for:
  - `infra/windows-block/remediate-disconnected-baseline-and-forced-host-edge.ps1`
  - `infra/windows-block/recover-browser-block-readiness.ps1`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-disconnected-baseline-remediation.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

These checks should cover:

- the new latest-remediation route shape
- the internal admin page rendering and empty state
- the remediation harness file shape and stage names
- the exact verdict fields the live run depends on

## Manual Checks

From the deployed Windows/browser-block host, run the exact Phase 15 remediation harness:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\remediate-disconnected-baseline-and-forced-host-edge.ps1 `
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
  -OutputJsonPath .\.planning\phases\15-deployed-windows-disconnected-baseline-and-forced-host-edge-remediation\15-REMEDIATION-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\15-deployed-windows-disconnected-baseline-and-forced-host-edge-remediation\15-REMEDIATION-SUMMARY.md
```

Then confirm one of these shows the same latest result:

- `GET /internal/disconnected-baseline-remediation/latest`
- `/internal/admin` -> `Latest disconnected baseline remediation`

Then rerun the proven Phase 11 smoke command:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\test-rollout-smoke.ps1 `
  -PublicBaseUrl http://77.66.186.75 `
  -InternalBaseUrl http://127.0.0.1:8081 `
  -HostControllerBaseUrl http://127.0.0.1:4040 `
  -CanaryWorkerId shared-6 `
  -OutputJsonPath .\.planning\phases\11-rollout-smoke-confidence\11-SMOKE-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\11-rollout-smoke-confidence\11-SMOKE-SUMMARY.md
```

## Accept/Reject Rule

Accept the phase only if:

- `WREM-01` is satisfied by one durable remediation artifact that records before/after worker truth for the disconnected baseline
- `WREM-02` is satisfied by one remediation artifact that records the forced-Host hop and the public-owner hop after the repair attempt
- `WREM-03` is satisfied by one summarized latest-remediation surface instead of raw terminal output
- `WREM-04` is satisfied by one rerun of the proven smoke contract and one explicit final verdict `remediated_through_smoke` or `hold_rollout`

Reject the phase if it:

- records only a recovery attempt without before/after worker truth
- claims edge remediation without recording the forced-Host and public-owner hop results
- hides the latest remediation result in terminal output only
- skips the post-remediation smoke rerun
- uses destructive profile, cookie, or relogin actions as the default repair path
