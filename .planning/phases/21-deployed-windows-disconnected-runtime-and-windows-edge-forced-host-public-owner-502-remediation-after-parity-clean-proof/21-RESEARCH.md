# Phase 21 Research

## Current Baseline

Phase 20 already closed the repo-to-runtime parity question for this wrapper chain, so we should now treat these facts as fixed input:

- the parity-clean archive overlaid onto the deployed Windows host without any newly reported post-overlay compat fix
- `GET /internal/runtime-parity-backport-remediation/latest` and `/internal/admin` both worked on the live host
- the remediation still stayed at `0/9 -> 0/9 ready`
- the dominant runtime blocker still stayed `disconnected`
- the first failing hop still stayed `windows_edge_forced_host`
- forced-host and public-owner both stayed red
- the required smoke rerun still ended with `hold_rollout`
- the final smoke still settled at `after_settle` with only `1/9 ready`
- the public canary on `shared-6` still returned `502/502/502`

That means the next gap is no longer parity work.

The next gap is one preserve-first remediation pass that accepts the Phase 20 parity-clean chain as the baseline and targets the still-live disconnected runtime plus the `windows_edge_forced_host` / public-owner `502` branch directly.

## Existing Building Blocks We Should Reuse

### Proven parity-clean wrapper chain

The repo already has the runtime-critical chain we should build on instead of reopening compatibility drift:

- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`
- `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502.ps1`
- `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502-parity.ps1`
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

The control plane already has the right visibility pattern:

- one file-backed `latest.json`
- one internal `GET /internal/.../latest` route
- one matching section in `/internal/admin`

Phase 21 should reuse that same pattern again instead of inventing a new operator surface.

## What Phase 21 Must Answer

Phase 21 should answer these exact operational questions:

1. After the parity-clean proof from Phase 20, can one preserve-first remediation flow move or honestly reclassify the still-disconnected `0/9 ready` baseline?
2. After a bounded runtime revive, does `windows_edge_forced_host` still remain the first failing hop or does the branch reclassify cleanly?
3. If forced-host still fails first, can the artifact still keep the downstream public-owner `502` branch explicit instead of collapsing both failures back into one vague public error?
4. After the Phase 21 remediation run, does the proven Phase 11 smoke still end in `hold_rollout`, or can the host finally survive smoke on the parity-clean chain?

## What Phase 21 Still Lacks

Four concrete gaps remain:

1. There is no canonical Phase 21 wrapper that treats the parity-clean chain as fixed input and reruns the disconnected-runtime plus forced-host/public-owner branch on top of it.
2. There is no dedicated durable Phase 21 artifact for that post-parity remediation run.
3. There is no dedicated latest operator surface for the Phase 21 remediation result.
4. There is no final post-parity remediation-plus-smoke verdict that says the host is `remediated_through_smoke` or still `hold_rollout`.

## Recommended Phase Boundary

Phase 21 should stay narrow and preserve-first.

It should do all of this:

- accept the Phase 20 parity-clean chain as the baseline instead of reopening compatibility work
- add one canonical post-parity remediation harness for the disconnected runtime plus forced-host/public-owner branch
- write a durable remediation artifact and `latest.json`
- expose that latest result in `control-api` and `/internal/admin`
- redeploy the updated archive to `192.168.88.250`
- run one live remediation attempt
- rerun the proven Phase 11 smoke
- end with one explicit verdict:
  - `remediated_through_smoke`
  - or `hold_rollout`

It should not do any of this:

- reopen repo/runtime parity as the main scope
- invent a brand-new remediation dialect unrelated to the proven Phase 20 chain
- widen beyond the bounded canary path
- treat destructive reset behavior as a normal repair path
- claim household rollout is restored without a fresh smoke rerun

## Recommended Technical Shape

### 1. Add one canonical post-parity remediation harness

Create:

- `infra/windows-block/remediate-disconnected-runtime-and-forced-host-public-502-post-parity.ps1`

Stamp one explicit compatibility marker:

- `phase21-post-parity-remediation-v1`

This wrapper should:

- start from the already-confirmed `0/9 ready` disconnected baseline
- reuse the Phase 20 parity-clean chain instead of adding new live-only compatibility assumptions
- keep the bounded canary `shared-6` alive long enough to probe loopback, forced-host, and public-owner in one bounded run
- capture exact stage snapshots named:
  - `before_post_parity_remediation`
  - `after_targeted_runtime_revive`
  - `after_loopback_confirmation`
  - `after_forced_host_recheck`
  - `after_public_owner_recheck`
  - `after_canary_stop`

It should default to:

- `SessionBaseUrl=http://127.0.0.1:8080`
- `PublicApiBaseUrl=http://77.66.186.75`
- `InternalBaseUrl=http://127.0.0.1:8081`
- `HostControllerBaseUrl=http://127.0.0.1:4040`
- `WindowsEdgeBaseUrl=http://127.0.0.1`
- `PublicHostHeader=77.66.186.75`
- `CanaryWorkerId=shared-6`
- `RuntimeReviveWaitSeconds=15`
- `ForcedHostSettleSeconds=10`
- `PublicOwnerSettleSeconds=10`

It should write:

- `.planning/phases/21-deployed-windows-disconnected-runtime-and-windows-edge-forced-host-public-owner-502-remediation-after-parity-clean-proof/21-REMEDIATION-SUMMARY.json`
- `.planning/phases/21-deployed-windows-disconnected-runtime-and-windows-edge-forced-host-public-owner-502-remediation-after-parity-clean-proof/21-REMEDIATION-SUMMARY.md`
- `infra/data/post-parity-disconnected-runtime-remediation/latest.json`

The artifact should expose these exact fields:

- `scriptCompatibilityVersion`
- `preRemediationReadyCount`
- `postRemediationReadyCount`
- `dominantRuntimeBlocker`
- `firstFailingHop`
- `forcedHostStatus`
- `publicOwnerStatus`
- `verdict`

The pre-smoke remediation verdict should be exactly one of:

- `post_parity_ready_for_smoke`
- `hold_rollout`

### 2. Surface the latest post-parity remediation result for operators

Mirror the established operator pattern again:

- file-backed source of truth at `infra/data/post-parity-disconnected-runtime-remediation/latest.json`
- one internal route in `control-api`
- one internal admin section that shows:
  - latest timestamp
  - pre-remediation ready count
  - post-remediation ready count
  - dominant runtime blocker
  - first failing hop
  - forced-host status
  - public-owner status
  - compatibility version
  - final verdict

### 3. Close with one explicit remediation-plus-smoke verdict

The live deployed-host closeout should answer one exact question:

After the post-parity remediation run, can the deployed host survive the proven Phase 11 smoke contract?

If yes, Phase 21 should end with `remediated_through_smoke`.

If no, the honest result is still `hold_rollout`, but now with parity-clean post-remediation evidence instead of another parity loop.

## Suggested Plan Decomposition

### Wave 1

- add the canonical post-parity remediation harness
- document the exact repo-to-host sync list and live remediation command
- keep the preserve-first contract explicit in docs

### Wave 2

- add a file-backed latest post-parity remediation route in `control-api`
- render the latest result in `/internal/admin`
- regenerate the `dist` runtime files and cover the new route/admin section with tests

### Wave 3

- redeploy the updated archive to `192.168.88.250`
- run the live Phase 21 remediation harness
- confirm the operator surface shows the same latest remediation artifact
- rerun the proven Phase 11 smoke
- write `21-VERIFICATION.md`
- update roadmap, state, requirements, and project truth with the final verdict

## Risks And Constraints

- The deployed-host inventory remains the source of truth; if it differs from the default nine-worker list, the final verification must record that mismatch explicitly.
- Preserve-first rules remain mandatory: no profile deletion, no cookie clearing, no local-storage clearing, no blind full-pool restart, and no mass relogin as the default path.
- A greener loopback check does not automatically mean the forced-host hop is repaired.
- A greener forced-host hop does not automatically mean the public owner is healthy end-to-end.
- The phase must stay honest if the host still cannot move beyond `0/9 ready` before the smoke rerun.

## Validation Architecture

Automated validation should focus on the new wrapper and the operator surface:

- PowerShell parse checks for:
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/recover-browser-block-readiness.ps1`
  - `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502-parity.ps1`
  - `infra/windows-block/remediate-disconnected-runtime-and-forced-host-public-502-post-parity.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/host-worker/test-host-worker-relay.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts internal-post-parity-disconnected-runtime-remediation.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

Manual validation must remain on the deployed Windows host:

- overlay the Phase 21 archive onto the existing checkout before trusting the live run
- restart `control-api` on `127.0.0.1:8081` from the updated `dist` runtime
- run the exact Phase 21 remediation harness
- confirm `/internal/post-parity-disconnected-runtime-remediation/latest` or `/internal/admin` matches the generated artifact
- rerun the exact Phase 11 smoke command
- record whether the host is now truly `remediated_through_smoke` or still `hold_rollout`

## Planning Conclusion

Phase 21 is ready to plan now.

The right plan is:

1. add one canonical preserve-first post-parity remediation harness
2. expose the latest remediation result to operators
3. rerun the proven smoke contract
4. record one explicit remediation-or-hold verdict
