# Phase 12 Validation

## Validation Focus

This phase is valid only if it turns the degraded `0/9 ready`, `9/9 disconnected` snapshot into exact preserve-first recovery evidence and then hands off to the already-proven rollout-smoke contract.

## Required Evidence

- one preserve-first recovery wrapper exists for the deployed Windows/browser-block host
- one durable recovery summary is written as JSON and Markdown
- the latest recovery result is visible through an internal operator surface or route
- the phase ends with a rerun of the proven Phase 11 smoke and one explicit rollout verdict

Expected artifacts:

- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/data/readiness-recovery/latest.json`
- `.planning/phases/12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization/12-RECOVERY-SUMMARY.json`
- `.planning/phases/12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization/12-RECOVERY-SUMMARY.md`
- `.planning/phases/12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization/12-VERIFICATION.md`

## Automated Checks

- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-worker-actions.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-readiness-recovery.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/host-controller test`

These checks should cover:

- the new latest-recovery route shape
- the internal admin page rendering and empty state
- any host-controller or operator-surface changes that support bounded recovery

## Manual Checks

Run the live preserve-first recovery from the deployed Windows/browser-block side:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\recover-browser-block-readiness.ps1 `
  -InternalBaseUrl http://127.0.0.1:8081 `
  -HostControllerBaseUrl http://127.0.0.1:4040 `
  -CanaryWorkerId shared-6 `
  -WorkerIds dad,wife,shared-1,shared-2,shared-3,shared-4,shared-5,shared-6,shared-7 `
  -OutputJsonPath .\.planning\phases\12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization\12-RECOVERY-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization\12-RECOVERY-SUMMARY.md
```

If the deployed host inventory differs from the known nine-worker set above, rerun with the exact worker IDs returned by the live host and record the mismatch in the verification artifact.

Then confirm one of these shows the same latest result:

- `GET /internal/readiness-recovery/latest`
- `/internal/admin` -> `Latest readiness recovery`

Then rerun the exact Phase 11 smoke command from `11-VERIFICATION.md`.

## Accept/Reject Rule

Accept the phase only if:

- `WREC-01` is satisfied by one preserve-first recovery command that captures exact blocker classes
- `WREC-02` is satisfied by bounded reconnect work that keeps recovered workers running and avoids destructive mass reset behavior
- `WREC-03` is satisfied by one summarized latest-recovery surface instead of raw terminal output
- `WREC-04` is satisfied by rerunning Phase 11 smoke and recording one explicit rollout verdict afterward

Reject the phase if it:

- claims recovery without durable JSON/Markdown evidence
- hides worker-level blockers behind another generic `degraded` or `disconnected` summary
- uses destructive profile, cookie, or relogin actions as a first resort
- skips the Phase 11 smoke rerun and still declares rollout ready
