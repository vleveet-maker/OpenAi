# Phase 19 Validation

## Validation Focus

This phase is valid only if it turns the already-parity-clean Phase 18 runtime chain into one preserve-first follow-up flow that records persistent disconnected runtime truth, forced-host/public-owner hop truth, and one final smoke verdict.

## Required Evidence

- one canonical persistent disconnected-runtime follow-up harness exists
- one durable JSON and Markdown follow-up summary is written
- the follow-up artifact records ready-count changes, dominant runtime blocker, first failing hop, forced-host status, public-owner status, and verdict
- the latest follow-up result is visible through an internal operator surface or route
- the phase ends with one explicit final verdict: `stabilized_through_smoke` or `hold_rollout`

Expected artifacts:

- `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502.ps1`
- `infra/data/persistent-disconnected-runtime-followup/latest.json`
- `services/control-api/src/routes/internal-persistent-disconnected-runtime-followup.ts`
- `.planning/phases/19-deployed-windows-persistent-disconnected-runtime-and-forced-host-public-502-remediation-follow-up/19-FOLLOWUP-SUMMARY.json`
- `.planning/phases/19-deployed-windows-persistent-disconnected-runtime-and-forced-host-public-502-remediation-follow-up/19-FOLLOWUP-SUMMARY.md`
- `.planning/phases/19-deployed-windows-persistent-disconnected-runtime-and-forced-host-public-502-remediation-follow-up/19-VERIFICATION.md`

## Automated Checks

- PowerShell parse checks for:
  - `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502.ps1`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-persistent-disconnected-runtime-followup.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

These checks should cover:

- the exact compatibility marker `phase19-persistent-followup-v1`
- the new latest follow-up route shape
- the internal admin page rendering and empty state
- the follow-up artifact fields `preFollowupReadyCount`, `postFollowupReadyCount`, `dominantRuntimeBlocker`, `firstFailingHop`, `forcedHostStatus`, `publicOwnerStatus`, and `verdict`
- the generated `dist` runtime files that the deployed host actually starts

## Manual Checks

From the deployed Windows/browser-block host, overlay the Phase 19 archive, restart `control-api`, then run the exact Phase 19 follow-up harness:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\remediate-persistent-disconnected-runtime-and-public-502.ps1 `
  -SessionBaseUrl http://127.0.0.1:8080 `
  -PublicApiBaseUrl http://77.66.186.75 `
  -InternalBaseUrl http://127.0.0.1:8081 `
  -HostControllerBaseUrl http://127.0.0.1:4040 `
  -WindowsEdgeBaseUrl http://127.0.0.1 `
  -PublicHostHeader 77.66.186.75 `
  -CanaryWorkerId shared-6 `
  -WorkerIds dad,wife,shared-1,shared-2,shared-3,shared-4,shared-5,shared-6,shared-7 `
  -RuntimeReviveWaitSeconds 15 `
  -ForcedHostSettleSeconds 10 `
  -PublicOwnerSettleSeconds 10 `
  -OutputJsonPath .\.planning\phases\19-deployed-windows-persistent-disconnected-runtime-and-forced-host-public-502-remediation-follow-up\19-FOLLOWUP-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\19-deployed-windows-persistent-disconnected-runtime-and-forced-host-public-502-remediation-follow-up\19-FOLLOWUP-SUMMARY.md
```

Then confirm one of these shows the same latest result:

- `GET /internal/persistent-disconnected-runtime-followup/latest`
- `/internal/admin` -> `Latest persistent disconnected runtime follow-up`

Then rerun the exact Phase 11 smoke command and use that result when writing `19-VERIFICATION.md`.

## Accept/Reject Rule

Accept the phase only if:

- `WFUP-01` is satisfied by one canonical preserve-first follow-up harness plus a recorded compatibility version
- `WFUP-02` is satisfied by one durable follow-up artifact that records before/after ready counts and separates `windows_edge_forced_host` from `ubuntu_public_owner`
- `WFUP-03` is satisfied by one summarized latest-follow-up surface instead of raw terminal output
- `WFUP-04` is satisfied by one live follow-up run followed by one rerun of the proven smoke contract, ending with exactly one final verdict `stabilized_through_smoke` or `hold_rollout`

Reject the phase if it:

- records only another degraded note without a durable follow-up artifact
- leaves the forced-host and public-owner branches collapsed into one vague `502`
- hides the latest result in terminal output only
- skips the live deployed-host run
- skips the post-follow-up smoke rerun
- uses destructive profile, cookie, or relogin actions as the default path
