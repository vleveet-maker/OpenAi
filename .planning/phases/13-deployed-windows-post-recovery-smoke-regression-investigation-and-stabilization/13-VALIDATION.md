# Phase 13 Validation

## Validation Focus

This phase is valid only if it turns the vague post-recovery collapse into exact stage-level evidence and then proves whether one bounded stabilization mode keeps the preserved nine-account pool healthy through smoke.

## Required Evidence

- one canonical post-recovery regression harness exists
- repo and deployed-host script behavior is aligned through one explicit compatibility contract
- one durable regression/stabilization summary is written as JSON and Markdown
- the latest regression/stabilization result is visible through an internal operator surface or route
- the phase ends with one explicit verdict: `stabilized_through_smoke` or `hold_rollout`

Expected artifacts:

- `infra/windows-block/investigate-post-recovery-smoke-regression.ps1`
- `infra/data/post-recovery-regression/latest.json`
- `.planning/phases/13-deployed-windows-post-recovery-smoke-regression-investigation-and-stabilization/13-REGRESSION-SUMMARY.json`
- `.planning/phases/13-deployed-windows-post-recovery-smoke-regression-investigation-and-stabilization/13-REGRESSION-SUMMARY.md`
- `.planning/phases/13-deployed-windows-post-recovery-smoke-regression-investigation-and-stabilization/13-VERIFICATION.md`

## Automated Checks

- PowerShell parse checks for:
  - `infra/windows-block/investigate-post-recovery-smoke-regression.ps1`
  - `infra/windows-block/recover-browser-block-readiness.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/host-worker/test-host-worker-relay.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-post-recovery-regression.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

These checks should cover:

- the new latest-regression route shape
- the internal admin page rendering and empty state
- the regression harness file shape and stage names
- the compatibility version and stage metadata the live run depends on

## Manual Checks

From the deployed Windows/browser-block host, run the exact Phase 13 harness:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\investigate-post-recovery-smoke-regression.ps1 `
  -SessionBaseUrl http://127.0.0.1:8080 `
  -PublicApiBaseUrl http://77.66.186.75 `
  -InternalBaseUrl http://127.0.0.1:8081 `
  -HostControllerBaseUrl http://127.0.0.1:4040 `
  -CanaryWorkerId shared-6 `
  -WorkerIds dad,wife,shared-1,shared-2,shared-3,shared-4,shared-5,shared-6,shared-7 `
  -PostRecoveryDelaySeconds 15 `
  -PostCanaryDelaySeconds 10 `
  -PostSmokeDelaySeconds 15 `
  -KeepCanaryRunningUntilFinalSnapshot `
  -OutputJsonPath .\.planning\phases\13-deployed-windows-post-recovery-smoke-regression-investigation-and-stabilization\13-REGRESSION-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\13-deployed-windows-post-recovery-smoke-regression-investigation-and-stabilization\13-REGRESSION-SUMMARY.md
```

Before trusting the result, confirm the deployed host is using the same script compatibility version recorded in the repo copies of:

- `infra/host-worker/test-host-worker-relay.ps1`
- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/windows-block/investigate-post-recovery-smoke-regression.ps1`

Then confirm one of these shows the same latest result:

- `GET /internal/post-recovery-regression/latest`
- `/internal/admin` -> `Latest post-recovery smoke regression`

## Accept/Reject Rule

Accept the phase only if:

- `WREG-01` is satisfied by one durable stage-by-stage artifact that records the first regression point explicitly
- `WREG-02` is satisfied by one explicit compatibility version plus repo/deployed-host script parity for the live run
- `WREG-03` is satisfied by one summarized latest-regression surface instead of raw terminal output
- `WREG-04` is satisfied by one explicit final verdict that says whether the bounded stabilization mode holds through smoke or rollout remains held

Reject the phase if it:

- records only the final degraded snapshot and still claims to have explained the regression
- relies on unsynced deployed-host script behavior with no parity marker
- hides the latest regression result in terminal output only
- uses destructive profile, cookie, or relogin actions as the default stabilization path
- claims stabilization without proving the pool stays healthy through the final smoke snapshot
