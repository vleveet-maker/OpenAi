# Phase 13 Research

## Current Baseline

Phase 12 already proved two important truths:

- the deployed Windows browser-block host can recover the preserved nine-account pool to `9/9 ready` and `usable`
- the required post-recovery rerun of the proven Phase 11 smoke still collapses back to `0/9 ready` and `9/9 disconnected`

The public canary on `shared-6` stays green throughout that path.

That means the remaining blocker is no longer public ingress, latest-smoke visibility, or basic bounded recovery.

The blocker is now exact post-recovery smoke regression inside the preserved Windows pool.

## Existing Building Blocks We Should Reuse

### Preserve-first Windows wrappers

The repo already has the core building blocks for this path:

- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/host-worker/test-host-worker-relay.ps1`

These scripts already encode the right safety model:

- preserve logged-in accounts
- use `shared-6` as the canary gate
- avoid blind full-pool restart, cookie clearing, profile deletion, or mass relogin
- keep raw worker-agent, host-controller, and internal control ports loopback-only

### Existing truth surfaces

The current control plane already exposes enough data to classify where the regression happens if we capture it at the right times:

- `GET /health` from host-controller
- `GET /internal/host-pool`
- `GET /internal/workers`
- `GET /internal/observability/summary`
- `GET /internal/readiness-recovery/latest`
- `GET /internal/rollout-smoke/latest`
- `/internal/admin`

### Current live evidence

The phase starts from explicit, durable evidence:

- `12-RECOVERY-SUMMARY.json` says the pool was `recovered` with `9/9 ready`
- the post-recovery `11-SMOKE-SUMMARY.json` still says `hold_rollout`
- the first degraded snapshot after the rerun is `0/9 ready`, `9/9 disconnected`
- `shared-6` is stopped again after the smoke and port `4028` is no longer listening
- the deployed host needed out-of-band compatibility adjustments in:
  - `infra/windows-block/recover-browser-block-readiness.ps1`
  - `infra/host-worker/test-host-worker-relay.ps1`

That last point matters: repo truth and deployed-host script truth may still drift.

## What Phase 13 Must Answer

The next phase should answer these exact questions instead of adding another vague hold note:

1. Does the regression happen before smoke starts, during canary start, during canary stop, or only after the final smoke cleanup?
2. Is the regression coming from worker runtime collapse, host-controller state drift, control-api classification drift, or script behavior drift between repo and deployed host?
3. Does one bounded stabilization mode, such as keeping the canary running until the final snapshot and waiting through a short settle window, keep the pool healthy through smoke?
4. If the pool still regresses, what is the first exact stage and worker evidence that proves it?

## What Phase 13 Still Lacks

Four real gaps remain:

1. There is no canonical artifact that records stage-by-stage truth across recovery and smoke. Right now we only have the good recovery snapshot and the bad final smoke snapshot.
2. There is no repo-backed parity contract that makes the local copies of `test-host-worker-relay.ps1`, `recover-browser-block-readiness.ps1`, and `test-rollout-smoke.ps1` trustworthy relative to the deployed host.
3. There is no dedicated latest regression/stabilization surface equivalent to the latest recovery and latest smoke surfaces.
4. There is no final verdict that says whether one bounded stabilization mode survives smoke or whether rollout remains held with the exact first regression stage.

## Recommended Phase Boundary

Phase 13 should stay narrow and evidence-driven.

It should do all of this:

- bring the repo copies of the recovery, smoke, and relay scripts back into explicit parity with the deployed-host execution path
- add one canonical `investigate-post-recovery-smoke-regression.ps1` wrapper that orchestrates recovery plus smoke with stage snapshots
- capture durable stage snapshots at these exact points:
  - `before_recovery`
  - `after_recovery`
  - `before_smoke`
  - `after_canary_start`
  - `after_canary_stop`
  - `after_smoke`
  - `after_settle`
- persist one durable latest regression/stabilization artifact
- expose that latest artifact through an internal operator route or page
- end with one explicit verdict:
  - `stabilized_through_smoke`
  - or `hold_rollout`

It should not do any of this:

- reopen public-owner reconciliation
- widen the public worker set beyond the existing canary discipline
- treat temporary instability as justification for destructive profile or cookie reset behavior
- claim rollout is ready without proving the pool stays healthy through the smoke contract itself

## Recommended Technical Shape

### 1. Add one post-recovery regression harness

Create `infra/windows-block/investigate-post-recovery-smoke-regression.ps1` as the canonical orchestration wrapper.

It should have concrete defaults:

- `SessionBaseUrl=http://127.0.0.1:8080`
- `PublicApiBaseUrl=http://77.66.186.75`
- `InternalBaseUrl=http://127.0.0.1:8081`
- `HostControllerBaseUrl=http://127.0.0.1:4040`
- `CanaryWorkerId=shared-6`
- `PostRecoveryDelaySeconds=15`
- `PostCanaryDelaySeconds=10`
- `PostSmokeDelaySeconds=15`

It should optionally keep the canary running until the final snapshot so the phase can distinguish:

- regression caused by canary startup
- regression caused by canary shutdown
- regression caused by later cleanup or settle behavior

The wrapper should call the existing recovery and smoke flows, collect the stage snapshots listed above, compute per-worker status deltas, and write:

- `.planning/phases/13-deployed-windows-post-recovery-smoke-regression-investigation-and-stabilization/13-REGRESSION-SUMMARY.json`
- `.planning/phases/13-deployed-windows-post-recovery-smoke-regression-investigation-and-stabilization/13-REGRESSION-SUMMARY.md`
- `infra/data/post-recovery-regression/latest.json`

### 2. Normalize the repo/deployed-host script contract

The repo must stop carrying ambiguous script drift.

The safest phase shape is:

- add one explicit compatibility marker, such as `scriptCompatibilityVersion=phase13-post-recovery-smoke-regression-v1`
- make `test-host-worker-relay.ps1 -ReturnJson` emit the exact worker-level fields consumed by the recovery and regression wrappers
- make the recovery and smoke wrappers preserve stage-specific metadata instead of only final summaries
- require the live run to confirm that the deployed host is using those same script semantics before trusting the outcome

### 3. Expose the latest regression result to operators

Mirror the successful Phase 11 and Phase 12 shape:

- file-backed source of truth at `infra/data/post-recovery-regression/latest.json`
- one internal route in `control-api`
- one internal admin section that shows:
  - latest timestamp
  - compatibility version
  - recovered ready count
  - first regression stage
  - stage-by-stage counts
  - public canary result
  - final verdict

### 4. Close with one live stabilization verdict

The live deployed-host run should end by answering one exact question:

Can one bounded stabilization mode keep the preserved nine-account pool healthy through the smoke contract?

If yes, Phase 13 should say so explicitly with `stabilized_through_smoke`.

If no, Phase 13 should still end with better truth than Phase 12:

- exact first regression stage
- exact worker evidence
- explicit hold verdict

## Suggested Plan Decomposition

### Wave 1

- add the canonical post-recovery regression harness
- align the recovery/smoke/relay script contract with a shared compatibility version
- document the exact repo-to-host sync and live-run command

### Wave 2

- add a file-backed latest regression route in `control-api`
- render the latest regression/stabilization result in `/internal/admin`
- cover the new route and admin section with tests

### Wave 3

- verify deployed-host script parity
- run the live regression harness on `192.168.88.250`
- confirm the operator surface shows the same latest result
- write `13-VERIFICATION.md`
- update roadmap, state, requirements, and project truth with the final stabilization verdict

## Risks And Constraints

- The deployed host inventory remains the source of truth; the repo's tracked seven-worker package is still not the full live inventory.
- The public canary already works, so Phase 13 must not mistake a green canary for full-pool stability.
- If the canary is the only worker that stays healthy, the honest result is still `hold_rollout`.
- Script drift between repo and deployed host can invalidate conclusions, so parity has to be part of the phase itself rather than an afterthought.
- Preserve-first rules remain mandatory: no profile deletion, cookie clearing, local-storage clearing, blind full-pool restart, or mass relogin as the default path.

## Validation Architecture

Automated validation should focus on the local script and operator-surface layers:

- PowerShell parse checks for:
  - `infra/windows-block/investigate-post-recovery-smoke-regression.ps1`
  - `infra/windows-block/recover-browser-block-readiness.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/host-worker/test-host-worker-relay.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-post-recovery-regression.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

Manual validation must remain on the deployed Windows host:

- sync or confirm script parity
- run the exact Phase 13 regression harness
- confirm `/internal/post-recovery-regression/latest` or `/internal/admin` matches the generated artifact
- record whether the bounded stabilization mode holds through the final smoke snapshot

## Planning Conclusion

Phase 13 is ready to plan now.

The right plan is:

1. capture stage-by-stage truth across recovery and smoke
2. eliminate hidden repo-vs-host script drift
3. surface the latest regression/stabilization result for operators
4. end with one explicit stabilize-or-hold verdict grounded in exact stage evidence
