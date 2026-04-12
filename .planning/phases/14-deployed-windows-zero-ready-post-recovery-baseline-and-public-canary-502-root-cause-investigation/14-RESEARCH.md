# Phase 14 Research

## Current Baseline

Phase 13 already proved the key negative truth:

- the deployed Windows browser-block host can reach a preserved recovery flow
- but the post-recovery baseline can still already be `0/9 ready`
- only `shared-6` briefly becomes `1/9 ready` during canary start
- the pool then settles back to `0/9 ready`
- the final public canary ends in `502` for `healthz`, `v1/models`, and `v1/chat/completions`

That means the remaining blocker is no longer:

- latest-smoke visibility
- latest-recovery visibility
- regression-surface visibility
- repo/runtime parity for the already-known Phase 13 wrappers

The blocker is now exact root cause:

1. why the preserved nine-account pool can already be zero-ready right after the recovery path
2. where the first failing hop appears in the public canary path when the canary later returns `502`
3. whether those two failures are the same underlying branch or two separate branches

## Existing Building Blocks We Should Reuse

### Preserve-first wrappers and evidence

The repo already has the correct preserve-first shape:

- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/windows-block/investigate-post-recovery-smoke-regression.ps1`
- `infra/host-worker/test-host-worker-relay.ps1`
- `infra/windows-block/probe-public-api.ps1`

These scripts already encode the safety contract we must keep:

- preserve logged-in accounts
- keep raw worker-agent, host-controller, and internal control ports loopback-only
- use one bounded canary instead of widening the public worker set
- avoid profile deletion, cookie clearing, blind full-pool restart, or mass relogin

### Existing truth surfaces

The current control plane already exposes the surfaces we need for root-cause capture:

- `GET /health` from host-controller
- `GET /internal/host-pool`
- `GET /internal/workers`
- `GET /internal/observability/summary`
- `GET /internal/readiness-recovery/latest`
- `GET /internal/rollout-smoke/latest`
- `GET /internal/post-recovery-regression/latest`
- `/internal/admin`

### Current live evidence

The phase starts from durable live evidence:

- `12-RECOVERY-SUMMARY.json` proved the pool can be recovered to `9/9 ready`
- the later smoke rerun still regressed to `0/9 ready`, `9/9 disconnected`
- the Phase 13 regression artifact proved that one later run already started from `0/9 ready`
- during that run only `shared-6` briefly reached `1/9 ready`
- the final public canary then returned `502/502/502`
- the internal regression surface now exists and returns the latest artifact

That narrows the open problem sharply:

- the runtime can recover in one bounded path
- but the next observed baseline can already be degraded again before the public canary succeeds

## What Phase 14 Must Answer

The next phase should answer these exact questions:

1. What is the dominant blocker class across the nine workers when the baseline is already `0/9 ready`?
2. Is the zero-ready baseline coming from runtime collapse, controller classification drift, stale tunnel/session expectations, or another repeatable branch?
3. In the public canary path, what is the first failing hop:
   - direct loopback API on the Windows host
   - the Windows edge path when forced with the public `Host`
   - or the Ubuntu public owner itself
4. Are the zero-ready baseline and the later public `502` the same root cause or two separate failure layers?

## What Phase 14 Still Lacks

Four concrete gaps remain:

1. There is no canonical artifact that classifies every worker in the zero-ready baseline by blocker class instead of only saying `0/9 ready`.
2. There is no durable hop-by-hop canary artifact that proves whether the first failing hop is loopback API, Windows edge, or Ubuntu public owner.
3. There is no dedicated latest root-cause surface equivalent to the recovery, smoke, and regression latest surfaces.
4. There is no final verdict that says the root cause is confirmed with one dominant blocker class and one first failing hop, or that rollout still remains held because the evidence is not yet conclusive.

## Recommended Phase Boundary

Phase 14 should stay narrow and diagnostic.

It should do all of this:

- add one canonical root-cause harness that starts from the current degraded baseline instead of pretending recovery succeeded for that run
- classify every worker in the live zero-ready snapshot into durable blocker classes
- probe the canary path hop-by-hop across:
  - direct Windows loopback API
  - Windows edge with forced public `Host`
  - Ubuntu public owner
- persist one durable latest root-cause artifact
- expose that latest artifact through an internal route and admin section
- end with one explicit verdict:
  - `root_cause_confirmed`
  - or `hold_rollout`

It should not do any of this:

- reopen public-owner reconciliation as a new migration project
- widen the public worker set beyond the canary
- claim rollout is ready
- use destructive reset behavior as the default diagnostic tool

## Recommended Technical Shape

### 1. Add one zero-ready root-cause harness

Create `infra/windows-block/investigate-zero-ready-root-cause.ps1` as the canonical Phase 14 wrapper.

It should:

- capture one current baseline snapshot before any new action
- derive per-worker blocker classes from host-controller `/health`, `/internal/host-pool`, `/internal/workers`, and `/internal/observability/summary`
- run bounded public-canary probes on `shared-6`
- record exact hop results for:
  - `loopback_api`
  - `windows_edge_forced_host`
  - `ubuntu_public_owner`
- write:
  - `.planning/phases/14-deployed-windows-zero-ready-post-recovery-baseline-and-public-canary-502-root-cause-investigation/14-ROOT-CAUSE-SUMMARY.json`
  - `.planning/phases/14-deployed-windows-zero-ready-post-recovery-baseline-and-public-canary-502-root-cause-investigation/14-ROOT-CAUSE-SUMMARY.md`
  - `infra/data/zero-ready-root-cause/latest.json`

### 2. Extend the public probe to distinguish the first failing hop

`infra/windows-block/probe-public-api.ps1` already knows how to hit the public API shape.

Phase 14 should make the probe explicitly record:

- the requested URL
- the effective hop name
- any forced `Host` header
- HTTP status
- `Server` response header when present
- `Via` response header when present
- a short response-body preview

That will let the phase prove whether the `502` first appears:

- before reaching Windows loopback API
- at the Windows edge hop
- or only at the Ubuntu-owned public edge

### 3. Surface the latest root-cause result for operators

Mirror the successful earlier pattern:

- file-backed source of truth at `infra/data/zero-ready-root-cause/latest.json`
- one internal route in `control-api`
- one internal admin section that shows:
  - latest timestamp
  - dominant blocker class
  - ready count
  - disconnected count
  - first failing hop
  - canary hop results
  - final verdict

### 4. Close with one explicit root-cause verdict

The live deployed-host run should answer one exact question:

Do we now know the dominant worker blocker class and the first failing public-canary hop well enough to explain the current `hold_rollout`?

If yes, Phase 14 should end with `root_cause_confirmed`.

If no, the honest result is still `hold_rollout`, but with better evidence than the current vague degraded snapshot.

## Suggested Plan Decomposition

### Wave 1

- add the canonical zero-ready root-cause harness
- extend `probe-public-api.ps1` with hop-aware output fields
- document the exact repo-to-host sync list and live command

### Wave 2

- add a file-backed latest root-cause route in `control-api`
- render the latest root-cause result in `/internal/admin`
- cover the new route and admin section with tests

### Wave 3

- run the live zero-ready root-cause harness on `192.168.88.250`
- confirm the operator surface shows the same latest result
- write `14-VERIFICATION.md`
- update roadmap, state, requirements, and project truth with the final verdict

## Risks And Constraints

- The deployed host inventory remains the source of truth; the repo inventory may still lag the real nine-account pool.
- The phase must not treat a single green canary as proof of whole-pool recovery.
- The public `502` may be downstream of the zero-ready baseline rather than its cause, so the phase must record both layers explicitly.
- Preserve-first rules remain mandatory: no profile deletion, cookie clearing, local-storage clearing, blind full-pool restart, or mass relogin as the default path.

## Validation Architecture

Automated validation should focus on the local script and operator-surface layers:

- PowerShell parse checks for:
  - `infra/windows-block/investigate-zero-ready-root-cause.ps1`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/investigate-post-recovery-smoke-regression.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-zero-ready-root-cause.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

Manual validation must remain on the deployed Windows host:

- sync the Phase 14 scripts and control-api runtime files
- run the exact Phase 14 root-cause harness
- confirm `/internal/zero-ready-root-cause/latest` or `/internal/admin` matches the generated artifact
- record whether the root cause is now explicit enough to close the current investigation branch

## Planning Conclusion

Phase 14 is ready to plan now.

The right plan is:

1. capture exact zero-ready worker blocker classes
2. capture the first failing hop in the public canary path
3. expose the latest root-cause result to operators
4. end with one explicit root-cause-confirmed or hold verdict
