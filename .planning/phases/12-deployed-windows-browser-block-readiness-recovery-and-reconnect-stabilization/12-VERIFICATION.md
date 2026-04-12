# 12 Verification

- Phase: `12`
- Date: `2026-03-31`
- Status: `complete`
- Final verdict: `hold_rollout`

## Short Report

This phase succeeded in proving the preserve-first recovery path, but it did not clear the rollout hold.

Simple explanation:

- the deployed Windows browser-block host ran the live bounded recovery and produced durable readiness-recovery artifacts
- that live recovery restored the preserved nine-account pool to `9/9 ready` and `usable`
- the public canary on `shared-6` stayed green through recovery
- the required post-recovery rerun of the proven Phase 11 smoke also ran and wrote refreshed smoke artifacts
- the rerun still ended with `hold_rollout` because the smoke-time snapshot regressed to `0/9 ready` and `9/9 disconnected`

## Requirement Verdict

- `WREC-01` complete
- `WREC-02` complete
- `WREC-03` complete via durable file-backed latest-recovery artifacts; the final handoff did not separately quote a fresh `/internal/readiness-recovery/latest` payload, so this closeout relies on the artifact contract rather than a second route-level transcript
- `WREC-04` complete

## What Landed

Phase artifacts:

- [12-RECOVERY-SUMMARY.json](d:/OpenAi/.planning/phases/12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization/12-RECOVERY-SUMMARY.json)
- [12-RECOVERY-SUMMARY.md](d:/OpenAi/.planning/phases/12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization/12-RECOVERY-SUMMARY.md)
- [12-03-SUMMARY.md](d:/OpenAi/.planning/phases/12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization/12-03-SUMMARY.md)
- [12-VERIFICATION.md](d:/OpenAi/.planning/phases/12-deployed-windows-browser-block-readiness-recovery-and-reconnect-stabilization/12-VERIFICATION.md)

Repo-backed latest artifacts:

- [latest.json](d:/OpenAi/infra/data/readiness-recovery/latest.json)
- [11-SMOKE-SUMMARY.json](d:/OpenAi/.planning/phases/11-rollout-smoke-confidence/11-SMOKE-SUMMARY.json)
- [11-SMOKE-SUMMARY.md](d:/OpenAi/.planning/phases/11-rollout-smoke-confidence/11-SMOKE-SUMMARY.md)
- [latest.json](d:/OpenAi/infra/data/rollout-smoke/latest.json)

## Recovery Result

- recovery status: `recovered`
- recovered ready count: `9/9`
- recovered worker ids: `dad`, `wife`, `shared-1`, `shared-2`, `shared-3`, `shared-4`, `shared-5`, `shared-6`, `shared-7`
- blocker worker ids after recovery: none

## Post-Recovery Smoke Result

- rerun verdict: `hold_rollout`
- smoke snapshot: `0/9 ready`, `9/9 disconnected`
- public canary on `shared-6`:
  - `GET /healthz` -> `200`
  - `GET /v1/models` -> `200`
  - `POST /v1/chat/completions` -> `200`
  - assistant reply -> `probe-ok`
- `shared-6` was stopped again after the rerun
- port `4028` was not left listening
- the canary browser was not left hanging

## Preserve-First Result

- 9 accounts preserved
- no profile deletion
- no cookie clearing
- no local-storage clearing
- no relogin
- no blind mass restart across all 9 workers
- `4021..4029`, `4040`, `8080`, and `8081` remained loopback-only on `127.0.0.1`

## Compatibility Note

The deployed host needed compatibility adjustments in:

- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/host-worker/test-host-worker-relay.ps1`

The exact remote diffs were not synced back into this checkout, so those two files may still differ between repo and deployed host even though the live Phase 12 outcome is now recorded here.

## Final Decision

Decision:

- `hold_rollout`

Meaning:

- preserve-first recovery is real and can temporarily restore the full nine-account deployed pool
- the public canary path remains healthy on `shared-6`
- `WREC-01`, `WREC-02`, `WREC-03`, and `WREC-04` are now complete
- household-use rollout still remains held until the pool stays healthy through the smoke contract instead of regressing back to `0/9 ready` and `9/9 disconnected`
