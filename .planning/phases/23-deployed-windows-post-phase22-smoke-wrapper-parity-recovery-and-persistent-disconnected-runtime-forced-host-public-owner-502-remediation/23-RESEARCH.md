# Phase 23 Research

## Current Baseline

Phase 22 already closed the previous follow-up loop, so these facts are now fixed input for the next step:

- the deployed Windows host overlaid the Phase 22 archive and restarted `control-api`
- `GET /internal/post-phase21-disconnected-runtime-followup/latest` and `/internal/admin` both worked on the live host
- the follow-up still stayed at `0/9 -> 0/9 ready`
- the dominant runtime blocker still stayed `disconnected`
- the first failing hop still stayed `windows_edge_forced_host`
- `loopbackStatus` stayed green while forced-host and public-owner both stayed red
- the required smoke rerun still ended with `hold_rollout`
- the final smoke still settled at `after_settle` with only `1/9 ready`
- the public canary on `shared-6` still returned `502/502/502`
- the Phase 22 checkpoint archive still carried a stale `test-rollout-smoke.ps1`, so the successful smoke rerun had to use the current server-working copy instead of the archive copy

That means the next gap is no longer generic remediation tooling and no longer basic operator-surface work.

The next gap is one narrow parity-and-remediation pass that makes the archive-delivered smoke wrapper truthful again, keeps the persistent disconnected runtime plus `windows_edge_forced_host` / public-owner `502` branch explicit, and proves whether a parity-clean rerun can finally survive the exact smoke contract.

## Existing Building Blocks We Should Reuse

### Proven runtime chain

The repo already has the runtime-critical chain we should reuse instead of inventing another branch:

- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/windows-block/remediate-post-phase21-disconnected-runtime-and-forced-host-public-owner-502.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/host-worker/test-host-worker-relay.ps1`

The preserve-first safety contract remains fixed input:

- preserve the nine logged-in accounts
- do not delete profiles
- do not clear cookies or local storage
- do not mass relogin
- do not use a blind full-pool restart as the default path
- do not widen beyond the bounded canary path unless the evidence becomes decisively green

### Proven operator-surface pattern

The control plane already has the exact visibility pattern we should reuse again:

- one file-backed `latest.json`
- one internal `GET /internal/.../latest` route
- one matching section in `/internal/admin`

Phase 23 should reuse that exact pattern instead of inventing another ad-hoc operator surface.

## What Phase 23 Must Answer

Phase 23 should answer these exact operational questions:

1. Can the repo and archive copy of `test-rollout-smoke.ps1` stay in parity with the server-working smoke wrapper so the next archive no longer rolls smoke backward?
2. Can one preserve-first post-Phase-22 remediation move or honestly reclassify the still-disconnected `0/9 ready` baseline after the completed Phase 22 proof?
3. Does the artifact keep loopback, `windows_edge_forced_host`, and the downstream public-owner `502` branch explicit instead of collapsing the whole path back into one vague public error?
4. After the parity-clean follow-up run, does the exact Phase 11 smoke still end in `hold_rollout`, or can the host finally survive smoke without server-only smoke-wrapper edits?

## What Phase 23 Still Lacks

Four concrete gaps remain:

1. There is no canonical Phase 23 wrapper that treats the stale smoke-wrapper archive regression as first-class scope and reruns the persistent disconnected-runtime plus forced-host/public-owner branch one more time.
2. There is no dedicated durable Phase 23 artifact that records smoke-wrapper parity truth alongside the remediation truth.
3. There is no dedicated latest operator surface for that post-Phase-22 parity-remediation result.
4. There is no final verification that proves the exact smoke rerun used the archive-overlaid `test-rollout-smoke.ps1` without another live-only compatibility restore, or honestly records that parity still failed.

## Recommended Phase Boundary

Phase 23 should stay narrow and preserve-first.

It should do all of this:

- recover the smoke-wrapper parity gap exposed by the stale Phase 22 checkpoint archive
- add one canonical post-Phase-22 parity-remediation harness for the persistent disconnected runtime plus forced-host/public-owner branch
- write a durable remediation artifact and `latest.json`
- expose that latest result in `control-api` and `/internal/admin`
- redeploy the updated archive to `192.168.88.250`
- run one live parity-clean follow-up attempt
- rerun the proven Phase 11 smoke using the archive-overlaid smoke wrapper
- end with one explicit verdict:
  - `parity_recovered_through_smoke`
  - or `hold_rollout`

It should not do any of this:

- reopen broad runtime-parity work outside the smoke-critical wrapper chain
- widen beyond the bounded canary path
- treat destructive reset behavior as a normal repair path
- claim parity recovery unless the smoke rerun succeeds on the archive-delivered wrapper copy

## Recommended Technical Shape

### 1. Add one canonical post-Phase-22 parity-remediation harness

Create:

- `infra/windows-block/remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1`

Stamp one explicit compatibility marker:

- `phase23-smoke-wrapper-parity-recovery-v1`

This wrapper should:

- start from the already-confirmed `0/9 ready` disconnected baseline
- explicitly verify that the archive-delivered smoke-critical chain is aligned before the remediation run continues
- keep the bounded canary `shared-6` alive long enough to probe loopback, forced-host, and public-owner in one bounded run
- capture exact stage snapshots named:
  - `before_phase23_parity_recovery`
  - `after_smoke_wrapper_parity_check`
  - `after_targeted_runtime_revive`
  - `after_loopback_recheck`
  - `after_forced_host_recheck`
  - `after_public_owner_recheck`
  - `after_canary_stop`
- emit one durable artifact pair:
  - `.planning/phases/23-deployed-windows-post-phase22-smoke-wrapper-parity-recovery-and-persistent-disconnected-runtime-forced-host-public-owner-502-remediation/23-PARITY-REMEDIATION-SUMMARY.json`
  - `.planning/phases/23-deployed-windows-post-phase22-smoke-wrapper-parity-recovery-and-persistent-disconnected-runtime-forced-host-public-owner-502-remediation/23-PARITY-REMEDIATION-SUMMARY.md`
- refresh the latest mirror:
  - `infra/data/post-phase22-smoke-wrapper-parity-remediation/latest.json`
- expose exact fields:
  - `scriptCompatibilityVersion`
  - `smokeWrapperParityStatus`
  - `preRemediationReadyCount`
  - `postRemediationReadyCount`
  - `dominantRuntimeBlocker`
  - `firstFailingHop`
  - `loopbackStatus`
  - `forcedHostStatus`
  - `publicOwnerStatus`
  - `verdict`

The pre-smoke remediation verdict must be constrained to:

- `parity_recovered_ready_for_smoke`
- or `hold_rollout`

### 2. Add one matching latest-result operator surface

Add one file-backed route:

- `GET /internal/post-phase22-smoke-wrapper-parity-remediation/latest`

The route should read from:

- `infra/data/post-phase22-smoke-wrapper-parity-remediation/latest.json`

The internal admin page should add one dedicated section:

- `Latest post-phase22 smoke-wrapper parity remediation`

When no file exists yet, the page should render:

- `No post-phase22 smoke-wrapper parity remediation captured yet.`

### 3. End with one exact live parity-clean run plus one exact smoke rerun

The live phase should:

- redeploy the archive to the real Windows host
- restart `control-api`
- run the exact Phase 23 parity-remediation wrapper
- confirm route/admin parity
- rerun the exact Phase 11 smoke using the archive-overlaid `test-rollout-smoke.ps1`
- write `23-VERIFICATION.md`
- record exactly one final verdict:
  - `parity_recovered_through_smoke`
  - or `hold_rollout`

## Risks and Constraints

- preserve-first safety rules are still mandatory
- loopback green does not mean forced-host is repaired
- forced-host green does not mean public-owner is healthy
- smoke-wrapper parity is not recovered if the live host still needs a post-overlay edit before smoke can run
- a parity-clean follow-up must still stay honest if the host cannot move beyond `0/9 ready`
