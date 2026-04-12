# Phase 24 Research

## Current Baseline

Phase 23 already closed the previous parity-recovery loop, so these facts are now fixed input for the next step:

- the deployed Windows host overlaid the Phase 23 archive and restarted `control-api`
- `GET /internal/post-phase22-smoke-wrapper-parity-remediation/latest` and `/internal/admin` both worked on the live host
- the Phase 23 remediation still stayed at `0/9 -> 0/9 ready`
- the dominant runtime blocker still stayed `disconnected`
- the first failing hop still stayed `windows_edge_forced_host`
- `loopbackStatus` stayed green while forced-host and public-owner both stayed red
- the required smoke rerun still ended with `hold_rollout`
- the final smoke still settled at `after_settle` with only `1/9 ready`
- the public canary on `shared-6` still returned `502/502/502`
- the archive-delivered wrapper chain still needed live post-overlay compatibility restores in `probe-public-api.ps1`, `test-rollout-smoke.ps1`, and `remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1`

That means the next gap is no longer broad runtime investigation and no longer generic parity work.

The next gap is one narrower exact compat-backport pass that lifts the deployed-host-compatible smoke wrapper scheme back into the repo and archive, keeps the persistent disconnected runtime plus `windows_edge_forced_host` / public-owner `502` branch explicit, and proves whether the same archive-overlaid scripts can now survive the exact smoke contract without another live-only fix.

## Existing Building Blocks We Should Reuse

### Proven smoke-critical chain

The repo already has the exact chain we should reuse instead of opening another branch:

- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/windows-block/remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1`
- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/host-worker/test-host-worker-relay.ps1`

The preserve-first safety contract remains fixed input:

- preserve the nine logged-in accounts
- do not delete profiles
- do not clear cookies or local storage
- do not mass relogin
- do not use a blind full-pool restart as the default path
- do not widen beyond the bounded canary path unless the evidence becomes decisively green

### Proven operator-surface pattern

The control plane already has the visibility pattern we should reuse again:

- one file-backed `latest.json`
- one internal `GET /internal/.../latest` route
- one matching section in `/internal/admin`

Phase 24 should reuse that exact pattern instead of inventing another one-off operator surface.

## What Phase 24 Must Answer

Phase 24 should answer these exact operational questions:

1. Can the repo and archive copy of `probe-public-api.ps1`, `test-rollout-smoke.ps1`, and `remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1` carry the exact deployed-host-compatible behavior forward so the next overlay no longer needs hand fixes before smoke?
2. Can one preserve-first post-Phase-23 remediation move or honestly reclassify the still-disconnected `0/9 ready` baseline after those exact compat backports?
3. Does the artifact keep loopback, `windows_edge_forced_host`, and the downstream public-owner `502` branch explicit instead of collapsing the whole path back into one vague public error?
4. After the exact compat-backported follow-up run, does the archive-overlaid smoke still end in `hold_rollout`, or can the host finally survive smoke without live script edits?

## What Phase 24 Still Lacks

Four concrete gaps remain:

1. There is no canonical Phase 24 wrapper that treats the exact deployed-host smoke-compat restores as first-class scope and reruns the persistent disconnected runtime plus forced-host/public-owner branch one more time.
2. There is no dedicated durable Phase 24 artifact that records exact smoke-wrapper compat truth alongside the remediation truth.
3. There is no dedicated latest operator surface for that post-Phase-23 exact compat remediation result.
4. There is no final verification that proves the archive-overlaid smoke wrapper now runs unchanged after overlay, or honestly records that exact compat backport is still incomplete.

## Recommended Phase Boundary

Phase 24 should stay narrow and preserve-first.

It should do all of this:

- backport the exact deployed-host-compatible behavior for the smoke-critical wrapper chain
- add one canonical post-Phase-23 exact compat remediation harness for the persistent disconnected runtime plus forced-host/public-owner branch
- write a durable remediation artifact and `latest.json`
- expose that latest result in `control-api` and `/internal/admin`
- redeploy the updated archive to `192.168.88.250`
- run one live exact-compat follow-up attempt
- rerun the proven Phase 11 smoke using the archive-overlaid `test-rollout-smoke.ps1`
- end with one explicit verdict:
  - `compat_backported_through_smoke`
  - or `hold_rollout`

It should not do any of this:

- reopen generic parity work outside the three exact smoke-critical scripts plus the one canonical wrapper
- widen beyond the bounded canary path
- treat destructive reset behavior as a normal repair path
- claim exact compat backport unless the smoke rerun succeeds on the archive-delivered wrapper copy without another post-overlay edit

## Recommended Technical Shape

### 1. Add one canonical post-Phase-23 exact compat remediation harness

Create:

- `infra/windows-block/remediate-post-phase23-exact-smoke-wrapper-compat-and-persistent-disconnected-runtime.ps1`

Stamp one explicit compatibility marker:

- `phase24-exact-smoke-wrapper-compat-backport-v1`

This wrapper should:

- start from the already-confirmed `0/9 ready` disconnected baseline
- explicitly verify that the archive-delivered smoke-critical chain carries the exact compat backport before the remediation run continues
- keep the bounded canary `shared-6` alive long enough to probe loopback, forced-host, and public-owner in one bounded run
- capture exact stage snapshots named:
  - `before_phase24_exact_compat_recovery`
  - `after_exact_smoke_wrapper_compat_check`
  - `after_targeted_runtime_revive`
  - `after_loopback_recheck`
  - `after_forced_host_recheck`
  - `after_public_owner_recheck`
  - `after_canary_stop`
- emit one durable artifact pair:
  - `.planning/phases/24-deployed-windows-post-phase23-exact-smoke-wrapper-compat-backport-and-persistent-disconnected-runtime-forced-host-public-owner-502-remediation/24-COMPAT-REMEDIATION-SUMMARY.json`
  - `.planning/phases/24-deployed-windows-post-phase23-exact-smoke-wrapper-compat-backport-and-persistent-disconnected-runtime-forced-host-public-owner-502-remediation/24-COMPAT-REMEDIATION-SUMMARY.md`
- refresh the latest mirror:
  - `infra/data/post-phase23-exact-smoke-wrapper-compat-remediation/latest.json`
- expose exact fields:
  - `scriptCompatibilityVersion`
  - `smokeWrapperCompatStatus`
  - `preRemediationReadyCount`
  - `postRemediationReadyCount`
  - `dominantRuntimeBlocker`
  - `firstFailingHop`
  - `loopbackStatus`
  - `forcedHostStatus`
  - `publicOwnerStatus`
  - `verdict`

The pre-smoke remediation verdict must be constrained to:

- `compat_backported_ready_for_smoke`
- or `hold_rollout`

### 2. Add one matching latest-result operator surface

Add one file-backed route:

- `GET /internal/post-phase23-exact-smoke-wrapper-compat-remediation/latest`

The route should read from:

- `infra/data/post-phase23-exact-smoke-wrapper-compat-remediation/latest.json`

The internal admin page should add one dedicated section:

- `Latest post-phase23 exact smoke-wrapper compat remediation`

When no file exists yet, the page should render:

- `No post-phase23 exact smoke-wrapper compat remediation captured yet.`

### 3. End with one exact live compat-backport run plus one exact smoke rerun

The live phase should:

- redeploy the archive to the real Windows host
- restart `control-api`
- run the exact Phase 24 compat-remediation wrapper
- confirm route/admin parity
- rerun the exact Phase 11 smoke using the archive-overlaid `test-rollout-smoke.ps1`
- write `24-VERIFICATION.md`
- record exactly one final verdict:
  - `compat_backported_through_smoke`
  - or `hold_rollout`

## Risks and Constraints

- preserve-first safety rules are still mandatory
- loopback green does not mean forced-host is repaired
- forced-host green does not mean public-owner is healthy
- exact compat backport is not complete if the live host still needs a post-overlay edit before smoke can run
- the phase must stay honest if the host still cannot move beyond `0/9 ready`
