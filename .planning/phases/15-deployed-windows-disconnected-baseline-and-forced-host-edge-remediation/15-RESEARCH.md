# Phase 15 Research

## Current Baseline

Phase 14 already made the blocker exact:

- the deployed Windows browser-block baseline is still `0/9 ready`
- the dominant worker blocker class is still `disconnected`
- `loopback_api` is green with `200/200/200`
- the first failing hop is `windows_edge_forced_host`
- the Ubuntu public owner still returns `502` on `healthz`, `v1/models`, and `v1/chat/completions`
- `GET /internal/zero-ready-root-cause/latest` and `/internal/admin` already show the same latest root-cause artifact

That means the next gap is no longer diagnosis.

The next gap is preserve-first remediation:

1. recover the disconnected baseline without destructive reset behavior
2. repair or clearly reclassify the failing forced-Host edge branch
3. expose the latest remediation result for operators
4. rerun the proven smoke contract after remediation and record the honest rollout verdict

## Existing Building Blocks We Should Reuse

### Preserve-first runtime and edge wrappers

The repo already has the bounded building blocks for this remediation phase:

- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/windows-block/investigate-zero-ready-root-cause.ps1`
- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/activate-public-edge.ps1`
- `infra/windows-block/start-public-api.ps1`
- `infra/host-worker/test-host-worker-relay.ps1`

These wrappers already encode the safety rules we must keep:

- preserve logged-in accounts
- avoid profile deletion, cookie clearing, local-storage clearing, blind full-pool restart, or mass relogin
- keep raw worker-agent, host-controller, and internal control ports loopback-only
- use one bounded canary instead of widening the worker set

### Existing operator truth surfaces

The control plane already exposes durable visibility patterns we should mirror again:

- `GET /internal/readiness-recovery/latest`
- `GET /internal/rollout-smoke/latest`
- `GET /internal/post-recovery-regression/latest`
- `GET /internal/zero-ready-root-cause/latest`
- `/internal/admin`

That means Phase 15 does not need to invent a new operator pattern.

It should reuse the same file-backed route plus admin-section approach.

## What Phase 15 Must Repair

Phase 15 should answer these exact operational questions:

1. Can the preserve-first recovery path restore the current `0/9 ready`, `9/9 disconnected` baseline again on the live host without destructive actions?
2. After that recovery, does the `windows_edge_forced_host` hop become green again, or does it remain the first failing hop?
3. If the forced-Host hop is repaired, does the Ubuntu public owner still fail separately, or does the canary path recover end-to-end?
4. After the remediation attempt, does the proven Phase 11 smoke contract still collapse the pool, or can the rollout path survive the smoke rerun?

## What Phase 15 Still Lacks

Four concrete gaps remain:

1. There is no canonical remediation wrapper that combines baseline recovery plus forced-Host edge checks into one durable artifact.
2. There is no latest remediation route or admin section equivalent to the earlier latest-smoke, latest-recovery, latest-regression, and latest-root-cause surfaces.
3. There is no post-remediation artifact that says whether the host is ready for a smoke rerun or still on hold before the smoke rerun even starts.
4. There is no final post-remediation smoke verdict tying the repair attempt back to the actual rollout contract.

## Recommended Phase Boundary

Phase 15 should stay narrow and remediation-focused.

It should do all of this:

- add one canonical preserve-first remediation harness for the disconnected baseline plus forced-Host edge branch
- persist a durable remediation artifact and latest file
- expose the latest remediation result in `control-api` and `/internal/admin`
- run the live remediation attempt on `192.168.88.250`
- rerun the proven Phase 11 smoke after remediation
- end with one explicit verdict:
  - `remediated_through_smoke`
  - or `hold_rollout`

It should not do any of this:

- widen the worker set beyond the canary
- treat destructive reset behavior as a normal repair path
- reopen public-owner architecture as a new redesign project
- claim household rollout is healthy without a fresh smoke rerun

## Recommended Technical Shape

### 1. Add one preserve-first remediation harness

Create `infra/windows-block/remediate-disconnected-baseline-and-forced-host-edge.ps1` as the canonical Phase 15 wrapper.

It should:

- default to:
  - `SessionBaseUrl=http://127.0.0.1:8080`
  - `PublicApiBaseUrl=http://77.66.186.75`
  - `InternalBaseUrl=http://127.0.0.1:8081`
  - `HostControllerBaseUrl=http://127.0.0.1:4040`
  - `WindowsEdgeBaseUrl=http://127.0.0.1`
  - `PublicHostHeader=77.66.186.75`
  - `CanaryWorkerId=shared-6`
  - `RecoveryWaitSeconds=15`
  - `EdgeSettleSeconds=10`
- capture stage snapshots named:
  - `before_remediation`
  - `after_recovery`
  - `after_windows_edge_forced_host`
  - `after_public_owner_probe`
  - `after_canary_stop`
- derive per-worker before/after blocker classes for the zero-ready baseline
- reuse the existing readiness-recovery and probe helpers instead of inventing a destructive reset path
- write:
  - `.planning/phases/15-deployed-windows-disconnected-baseline-and-forced-host-edge-remediation/15-REMEDIATION-SUMMARY.json`
  - `.planning/phases/15-deployed-windows-disconnected-baseline-and-forced-host-edge-remediation/15-REMEDIATION-SUMMARY.md`
  - `infra/data/disconnected-baseline-remediation/latest.json`

The wrapper should end with one pre-smoke remediation verdict:

- `remediated_ready_for_smoke`
- or `hold_rollout`

### 2. Reuse the existing probe and smoke contracts instead of creating a second edge dialect

Phase 14 already made the hop ladder explicit.

Phase 15 should keep the exact same hop names:

- `loopback_api`
- `windows_edge_forced_host`
- `ubuntu_public_owner`

The remediation wrapper should reuse `probe-public-api.ps1` for those hops so the before/after comparison stays durable instead of forking the edge vocabulary again.

The phase should also reuse `test-rollout-smoke.ps1` for the final smoke rerun instead of inventing a second smoke contract.

### 3. Surface the latest remediation result for operators

Mirror the successful earlier pattern again:

- file-backed source of truth at `infra/data/disconnected-baseline-remediation/latest.json`
- one internal route in `control-api`
- one internal admin section that shows:
  - latest timestamp
  - recovered ready count
  - dominant remaining blocker class
  - forced-Host hop status
  - public-owner hop status
  - remediation verdict

### 4. Close with one explicit remediation-plus-smoke verdict

The live deployed-host closeout should answer one exact question:

After preserve-first remediation, can the deployed host survive the proven rollout smoke contract?

If yes, Phase 15 should end with `remediated_through_smoke`.

If no, the honest result is still `hold_rollout`, but now with exact post-remediation evidence instead of only Phase 14 root-cause proof.

## Suggested Plan Decomposition

### Wave 1

- add the canonical disconnected-baseline plus forced-Host remediation harness
- document the exact repo-to-host sync list and live remediation command
- keep preserve-first rules explicit in docs

### Wave 2

- add a file-backed latest-remediation route in `control-api`
- render the latest remediation result in `/internal/admin`
- cover the new route and admin section with tests

### Wave 3

- run the live remediation harness on `192.168.88.250`
- confirm the operator surface shows the same latest remediation result
- rerun the proven Phase 11 smoke
- write `15-VERIFICATION.md`
- update roadmap, state, requirements, and project truth with the final verdict

## Risks And Constraints

- The deployed host inventory remains the source of truth; the repo inventory may still lag the live nine-account pool.
- A recovered baseline does not automatically prove that the forced-Host branch or the full smoke contract is healthy.
- A green forced-Host hop does not automatically prove that the Ubuntu public owner is healthy.
- Preserve-first rules remain mandatory: no profile deletion, cookie clearing, local-storage clearing, blind full-pool restart, or mass relogin as the default path.

## Validation Architecture

Automated validation should focus on the local wrapper and operator-surface layers:

- PowerShell parse checks for:
  - `infra/windows-block/remediate-disconnected-baseline-and-forced-host-edge.ps1`
  - `infra/windows-block/recover-browser-block-readiness.ps1`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-disconnected-baseline-remediation.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

Manual validation must remain on the deployed Windows host:

- sync the Phase 15 scripts and `control-api` runtime files from the archive
- run the exact Phase 15 remediation harness
- confirm `/internal/disconnected-baseline-remediation/latest` or `/internal/admin` matches the generated artifact
- rerun the exact Phase 11 smoke command
- record whether the host is now truly remediated through smoke or still on hold

## Planning Conclusion

Phase 15 is ready to plan now.

The right plan is:

1. restore the disconnected baseline preserve-first
2. recheck the forced-Host edge and public-owner branch with the same hop ladder
3. expose the latest remediation result to operators
4. rerun the proven smoke contract and record one explicit remediation-or-hold verdict
