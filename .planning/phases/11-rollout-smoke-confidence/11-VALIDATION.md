# Phase 11 Validation

## Validation Focus

This phase is valid only if it gives the operator one repeatable rollout-smoke flow for the **real current public-owner path**, not another local-only substitute and not another topology experiment.

## Required Evidence

- one repeatable rollout-smoke wrapper exists for the deployed Windows/public path
- one durable smoke summary is written as JSON and Markdown
- the latest smoke result is visible through an internal operator surface or dedicated internal route
- the phase ends with one final verification artifact that states whether rollout confidence is ready or still held

Expected artifacts:

- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/data/rollout-smoke/latest.json`
- `.planning/phases/11-rollout-smoke-confidence/11-SMOKE-SUMMARY.json`
- `.planning/phases/11-rollout-smoke-confidence/11-SMOKE-SUMMARY.md`
- `.planning/phases/11-rollout-smoke-confidence/11-VERIFICATION.md`

## Automated Checks

- `npm --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm --prefix services/control-api test -- internal-host-pool.test.ts`
- `npm --prefix services/control-api test -- internal-observability.test.ts`
- `npm --prefix services/control-api test`

These checks should cover:

- the new latest-smoke route shape
- the internal admin page rendering and empty state
- existing operator surface behavior staying intact

## Manual Checks

Run the live smoke from the deployed Windows/browser-block side:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\test-rollout-smoke.ps1 `
  -PublicBaseUrl http://77.66.186.75 `
  -InternalBaseUrl http://127.0.0.1:8081 `
  -HostControllerBaseUrl http://127.0.0.1:4040 `
  -CanaryWorkerId shared-6 `
  -OutputJsonPath .\.planning\phases\11-rollout-smoke-confidence\11-SMOKE-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\11-rollout-smoke-confidence\11-SMOKE-SUMMARY.md
```

Then confirm one of these shows the same latest result:

- `GET /internal/rollout-smoke/latest`
- `/internal/admin` -> `Latest rollout smoke`

## Accept/Reject Rule

Accept the phase only if:

- `CONF-01` is satisfied by one repeatable command that records readiness, fresh-chat/public bootstrap, and one live relay
- `CONF-02` is satisfied by one summarized latest-result surface instead of raw terminal output
- the final verification says explicitly whether the household can resume using the pool or whether rollout remains held

Reject the phase if it:

- relies on vague "service looked healthy" language without a durable smoke artifact
- reopens public-owner or runtime-design work instead of using the current topology
- records a result only in raw console output with no durable latest-smoke surface
