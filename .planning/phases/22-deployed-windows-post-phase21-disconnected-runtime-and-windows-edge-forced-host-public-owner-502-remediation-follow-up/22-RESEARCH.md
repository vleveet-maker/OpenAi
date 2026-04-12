# Phase 22 Research

## Current Baseline

Phase 21 already closed the previous remediation-follow-up loop, so these facts are now fixed input for the next step:

- the deployed Windows host overlaid the Phase 21 archive and restarted `control-api`
- `GET /internal/post-parity-disconnected-runtime-remediation/latest` and `/internal/admin` both worked on the live host
- the remediation still stayed at `0/9 -> 0/9 ready`
- the dominant runtime blocker still stayed `disconnected`
- the first failing hop still stayed `windows_edge_forced_host`
- forced-host and public-owner both stayed red
- the required smoke rerun still ended with `hold_rollout`
- the final smoke still settled at `after_settle` with only `1/9 ready`
- the public canary on `shared-6` still returned `502/502/502`
- the earlier smoke-wrapper crash from a missing `chatCompletions` field is now fixed input, not new phase scope

That means the next gap is no longer parity work and no longer basic operator-surface work.

The next gap is one more preserve-first follow-up pass that accepts the completed Phase 21 chain as the baseline, keeps the disconnected runtime plus `windows_edge_forced_host` / public-owner `502` branch explicit, and decides again whether the host can honestly survive the proven smoke contract.

## Existing Building Blocks We Should Reuse

### Proven follow-up chain

The repo already has the runtime-critical chain we should build on instead of reopening earlier scopes:

- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502-parity.ps1`
- `infra/windows-block/remediate-disconnected-runtime-and-forced-host-public-502-post-parity.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/host-worker/test-host-worker-relay.ps1`

This chain already encodes the preserve-first safety contract that must remain intact:

- preserve the nine logged-in accounts
- do not delete profiles
- do not clear cookies or local storage
- do not mass relogin
- do not use a blind full-pool restart as the default repair path
- do not widen beyond the bounded canary path unless the evidence becomes decisively green

### Proven operator-surface pattern

The control plane already has the visibility pattern we should reuse again:

- one file-backed `latest.json`
- one internal `GET /internal/.../latest` route
- one matching section in `/internal/admin`

Phase 22 should reuse that exact pattern instead of inventing yet another operator surface.

## What Phase 22 Must Answer

Phase 22 should answer these exact operational questions:

1. Can one preserve-first follow-up move or honestly reclassify the still-disconnected `0/9 ready` baseline after the now-complete Phase 21 proof?
2. Does loopback stay green while `windows_edge_forced_host` still remains the first failing hop, or does the branch reclassify cleanly?
3. Can the artifact keep the downstream public-owner `502` branch explicit instead of collapsing the whole path into one vague public error?
4. After the Phase 22 follow-up run, does the proven Phase 11 smoke still end in `hold_rollout`, or can the host finally survive smoke?

## What Phase 22 Still Lacks

Four concrete gaps remain:

1. There is no canonical Phase 22 wrapper that treats the completed Phase 21 chain as fixed input and reruns the disconnected-runtime plus forced-host/public-owner branch one more time.
2. There is no dedicated durable Phase 22 artifact for that post-Phase-21 follow-up run.
3. There is no dedicated latest operator surface for the Phase 22 follow-up result.
4. There is no final post-follow-up-plus-smoke verdict that says the host is `stabilized_through_smoke` or still `hold_rollout`.

## Recommended Phase Boundary

Phase 22 should stay narrow and preserve-first.

It should do all of this:

- accept the completed Phase 21 chain as the baseline instead of reopening parity work
- add one canonical post-Phase-21 follow-up harness for the disconnected runtime plus forced-host/public-owner branch
- write a durable follow-up artifact and `latest.json`
- expose that latest result in `control-api` and `/internal/admin`
- redeploy the updated archive to `192.168.88.250`
- run one live follow-up attempt
- rerun the proven Phase 11 smoke
- end with one explicit verdict:
  - `stabilized_through_smoke`
  - or `hold_rollout`

It should not do any of this:

- reopen repo/runtime parity as the main scope
- widen beyond the bounded canary path
- treat destructive reset behavior as a normal repair path
- claim household rollout is restored without a fresh smoke rerun

## Recommended Technical Shape

### 1. Add one canonical post-Phase-21 follow-up harness

Create:

- `infra/windows-block/remediate-post-phase21-disconnected-runtime-and-forced-host-public-owner-502.ps1`

Stamp one explicit compatibility marker:

- `phase22-post-phase21-followup-v1`

This wrapper should:

- start from the already-confirmed `0/9 ready` disconnected baseline
- reuse the completed Phase 21 chain instead of adding new live-only assumptions
- keep the bounded canary `shared-6` alive long enough to probe loopback, forced-host, and public-owner in one bounded run
- capture exact stage snapshots named:
  - `before_post_phase21_followup`
  - `after_targeted_runtime_revive`
  - `after_loopback_recheck`
  - `after_forced_host_recheck`
  - `after_public_owner_recheck`
  - `after_canary_stop`
- emit one durable artifact pair:
  - `.planning/phases/22-deployed-windows-post-phase21-disconnected-runtime-and-windows-edge-forced-host-public-owner-502-remediation-follow-up/22-FOLLOWUP-SUMMARY.json`
  - `.planning/phases/22-deployed-windows-post-phase21-disconnected-runtime-and-windows-edge-forced-host-public-owner-502-remediation-follow-up/22-FOLLOWUP-SUMMARY.md`
- refresh the latest mirror:
  - `infra/data/post-phase21-disconnected-runtime-followup/latest.json`
- expose exact fields:
  - `scriptCompatibilityVersion`
  - `preRemediationReadyCount`
  - `postRemediationReadyCount`
  - `dominantRuntimeBlocker`
  - `firstFailingHop`
  - `loopbackStatus`
  - `forcedHostStatus`
  - `publicOwnerStatus`
  - `verdict`

The pre-smoke follow-up verdict must be constrained to:

- `post_phase21_ready_for_smoke`
- or `hold_rollout`

### 2. Add one matching latest-result operator surface

Add one file-backed route:

- `GET /internal/post-phase21-disconnected-runtime-followup/latest`

The route should read from:

- `infra/data/post-phase21-disconnected-runtime-followup/latest.json`

The internal admin page should add one dedicated section:

- `Latest post-phase21 disconnected runtime follow-up`

When no file exists yet, the page should render:

- `No post-phase21 disconnected runtime follow-up captured yet.`

### 3. End with one exact live follow-up run plus one exact smoke rerun

The live phase should:

- redeploy the archive to the real Windows host
- restart `control-api`
- run the exact Phase 22 follow-up wrapper
- confirm route/admin parity
- rerun the exact Phase 11 smoke command
- write `22-VERIFICATION.md`
- record exactly one final verdict:
  - `stabilized_through_smoke`
  - or `hold_rollout`

## Risks and Constraints

- preserve-first safety rules are still mandatory
- loopback green does not mean forced-host is repaired
- forced-host green does not mean public-owner is healthy
- a second follow-up must still stay honest if the host cannot move beyond `0/9 ready`
