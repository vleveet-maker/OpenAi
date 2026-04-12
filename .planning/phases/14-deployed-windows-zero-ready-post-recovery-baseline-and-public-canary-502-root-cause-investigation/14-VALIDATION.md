# Phase 14 Validation

## Validation Focus

This phase is valid only if it turns the vague `0/9 ready` baseline plus public-canary `502` tail into one exact root-cause artifact with worker blocker classes and a first failing hop.

## Required Evidence

- one canonical zero-ready root-cause harness exists
- the public probe records hop-aware evidence instead of only one opaque `502`
- one durable root-cause summary is written as JSON and Markdown
- the latest root-cause result is visible through an internal operator surface or route
- the phase ends with one explicit verdict: `root_cause_confirmed` or `hold_rollout`

Expected artifacts:

- `infra/windows-block/investigate-zero-ready-root-cause.ps1`
- `infra/data/zero-ready-root-cause/latest.json`
- `.planning/phases/14-deployed-windows-zero-ready-post-recovery-baseline-and-public-canary-502-root-cause-investigation/14-ROOT-CAUSE-SUMMARY.json`
- `.planning/phases/14-deployed-windows-zero-ready-post-recovery-baseline-and-public-canary-502-root-cause-investigation/14-ROOT-CAUSE-SUMMARY.md`
- `.planning/phases/14-deployed-windows-zero-ready-post-recovery-baseline-and-public-canary-502-root-cause-investigation/14-VERIFICATION.md`

## Automated Checks

- PowerShell parse checks for:
  - `infra/windows-block/investigate-zero-ready-root-cause.ps1`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/investigate-post-recovery-smoke-regression.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-zero-ready-root-cause.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

These checks should cover:

- the new latest root-cause route shape
- the internal admin page rendering and empty state
- the root-cause harness file shape and hop names
- the probe output fields the live run depends on

## Manual Checks

From the deployed Windows/browser-block host, run the exact Phase 14 harness:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\investigate-zero-ready-root-cause.ps1 `
  -SessionBaseUrl http://127.0.0.1:8080 `
  -PublicApiBaseUrl http://77.66.186.75 `
  -InternalBaseUrl http://127.0.0.1:8081 `
  -HostControllerBaseUrl http://127.0.0.1:4040 `
  -WindowsEdgeBaseUrl http://127.0.0.1 `
  -PublicHostHeader 77.66.186.75 `
  -CanaryWorkerId shared-6 `
  -WorkerIds dad,wife,shared-1,shared-2,shared-3,shared-4,shared-5,shared-6,shared-7 `
  -OutputJsonPath .\.planning\phases\14-deployed-windows-zero-ready-post-recovery-baseline-and-public-canary-502-root-cause-investigation\14-ROOT-CAUSE-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\14-deployed-windows-zero-ready-post-recovery-baseline-and-public-canary-502-root-cause-investigation\14-ROOT-CAUSE-SUMMARY.md
```

Then confirm one of these shows the same latest result:

- `GET /internal/zero-ready-root-cause/latest`
- `/internal/admin` -> `Latest zero-ready root cause`

## Accept/Reject Rule

Accept the phase only if:

- `WROOT-01` is satisfied by one durable artifact that records worker blocker classes for the zero-ready baseline
- `WROOT-02` is satisfied by one hop-aware probe result that names the first failing hop explicitly
- `WROOT-03` is satisfied by one summarized latest-root-cause surface instead of raw terminal output
- `WROOT-04` is satisfied by one explicit final verdict that names the dominant blocker class and first failing hop, or explicitly says the evidence still only supports `hold_rollout`

Reject the phase if it:

- records only `0/9 ready` without classifying the workers
- records only one public `502` without identifying the first failing hop
- hides the latest root-cause result in terminal output only
- uses destructive profile, cookie, or relogin actions as the default diagnostic path
- claims root cause without recording both the worker-level branch and the hop-level canary branch
