# Phase 17 Validation

## Validation Focus

This phase is valid only if it turns the repeated post-stabilization `1/9 -> 0/9` collapse and public-canary `502` into one durable, operator-visible runtime investigation artifact.

## Required Evidence

- one canonical post-stabilization runtime investigation harness exists
- one durable JSON and Markdown runtime-investigation summary is written
- the artifact correlates ready counts with runtime blocker and first failing hop
- the latest runtime-investigation result is visible through an internal operator surface or route
- the phase ends with one explicit verdict: `runtime_blocker_confirmed` or `hold_rollout`

Expected artifacts:

- `infra/windows-block/investigate-post-stabilization-runtime-and-public-502.ps1`
- `infra/data/post-stabilization-runtime-investigation/latest.json`
- `services/control-api/src/routes/internal-post-stabilization-runtime-investigation.ts`
- `.planning/phases/17-deployed-windows-post-stabilization-degraded-runtime-and-repeated-public-canary-502-investigation/17-RUNTIME-INVESTIGATION-SUMMARY.json`
- `.planning/phases/17-deployed-windows-post-stabilization-degraded-runtime-and-repeated-public-canary-502-investigation/17-RUNTIME-INVESTIGATION-SUMMARY.md`
- `.planning/phases/17-deployed-windows-post-stabilization-degraded-runtime-and-repeated-public-canary-502-investigation/17-VERIFICATION.md`

## Automated Checks

- PowerShell parse checks for:
  - `infra/windows-block/investigate-post-stabilization-runtime-and-public-502.ps1`
  - `infra/windows-block/stabilize-post-remediation-degraded-smoke.ps1`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-post-stabilization-runtime-investigation.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

These checks should cover:

- the exact compatibility marker for the Phase 17 investigation path
- the new latest-runtime-investigation route shape
- the internal admin page rendering and empty state
- the runtime-investigation artifact fields `preInvestigationReadyCount`, `postCanaryReadyCount`, `finalReadyCount`, `dominantRuntimeBlocker`, `firstFailingHop`, and `verdict`
- the generated `dist` runtime files that the deployed host actually starts

## Manual Checks

From the deployed Windows/browser-block host, overlay the Phase 17 archive, restart `control-api`, then run the exact Phase 17 runtime investigation harness:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\investigate-post-stabilization-runtime-and-public-502.ps1 `
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
  -OutputJsonPath .\.planning\phases\17-deployed-windows-post-stabilization-degraded-runtime-and-repeated-public-canary-502-investigation\17-RUNTIME-INVESTIGATION-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\17-deployed-windows-post-stabilization-degraded-runtime-and-repeated-public-canary-502-investigation\17-RUNTIME-INVESTIGATION-SUMMARY.md
```

Then confirm one of these shows the same latest result:

- `GET /internal/post-stabilization-runtime-investigation/latest`
- `/internal/admin` -> `Latest post-stabilization runtime investigation`

## Accept/Reject Rule

Accept the phase only if:

- `WRTI-01` is satisfied by one durable runtime-investigation artifact that correlates ready-count changes with runtime evidence
- `WRTI-02` is satisfied by one explicit first-failing-hop result plus canary runtime truth
- `WRTI-03` is satisfied by one summarized latest-runtime-investigation surface instead of raw terminal output
- `WRTI-04` is satisfied by one live run that ends with exactly one final verdict `runtime_blocker_confirmed` or `hold_rollout`

Reject the phase if it:

- records only another ready-count note without runtime evidence
- leaves the repeated public `502` as an opaque symptom
- hides the latest result in terminal output only
- skips the live deployed-host run
- uses destructive profile, cookie, or relogin actions as the default path
