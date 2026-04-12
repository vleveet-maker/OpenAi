# Phase 16 Research

## Current Baseline

Phase 15 already proved two important truths:

- the preserve-first remediation and latest-remediation operator surface are real
- the rollout is still held after remediation

The exact live outcome is now explicit:

- `windows_edge_forced_host` still fails as `transport_error`
- `ubuntu_public_owner` still returns `502`
- the post-remediation smoke still settles at only `1/9 ready`
- the final public canary on `shared-6` still returns `502/502/502`

Phase 15 also surfaced a second problem that is now part of the rollout blocker:

- the deployed Windows host required runtime-specific hotfixes in:
  - `services/control-api/src/config.ts`
  - `services/control-api/src/server.ts`
  - `services/control-api/src/routes/internal-admin-page.ts`
  - `services/control-api/dist/config.js`
  - `services/control-api/dist/server.js`
  - `services/control-api/dist/routes/internal-admin-page.js`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
- those raw live-host edits were not synced back into this checkout

That means the next gap is no longer basic diagnosis or first-line remediation.

The next gap is runtime parity plus bounded stabilization.

## Existing Building Blocks We Should Reuse

### Existing preserve-first wrappers

The repo already has the bounded building blocks for this follow-up:

- `infra/windows-block/remediate-disconnected-baseline-and-forced-host-edge.ps1`
- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/investigate-zero-ready-root-cause.ps1`
- `infra/windows-block/investigate-post-recovery-smoke-regression.ps1`

These wrappers already encode the safety contract that must remain unchanged:

- preserve logged-in accounts
- do not delete profiles
- do not clear cookies or local storage
- do not use blind full-pool restart as the default path
- do not widen beyond one bounded canary unless the live host proves that is safe

### Existing operator surfaces

The control plane already has the visibility pattern we should reuse again:

- `GET /internal/rollout-smoke/latest`
- `GET /internal/readiness-recovery/latest`
- `GET /internal/post-recovery-regression/latest`
- `GET /internal/zero-ready-root-cause/latest`
- `GET /internal/disconnected-baseline-remediation/latest`
- `/internal/admin`

Phase 16 does not need a new observability pattern.

It should reuse the same file-backed latest route plus admin-section approach.

## What Phase 16 Must Answer

Phase 16 should answer these exact operational questions:

1. Which deployed-host hotfixes must be synced back into the repo so a new archive reproduces live runtime behavior without ad hoc server edits?
2. After runtime parity is restored, can one bounded post-remediation stabilization wrapper keep the degraded smoke path healthier than the current `after_settle = 1/9 ready` outcome?
3. Does the public canary still fail with `502` after parity-synced redeploy, or was some of that failure coupled to repo-vs-runtime drift?
4. Can operators see the latest degraded-smoke stabilization truth through the same internal route and admin surface pattern as earlier phases?

## What Phase 16 Still Lacks

Four concrete gaps remain:

1. There is no canonical parity marker that ties the repo copy of the runtime-critical PowerShell and `control-api` files back to the deployed-host execution path.
2. There is no canonical post-remediation degraded-smoke stabilization harness that writes one durable artifact instead of another operator note.
3. There is no latest stabilization route or admin section for this exact post-remediation degraded-smoke branch.
4. There is no final parity-synced live verdict that says whether rollout is actually `stabilized_through_smoke` or still `hold_rollout`.

## Recommended Phase Boundary

Phase 16 should stay narrow and stabilization-focused.

It should do all of this:

- sync the runtime-critical deployed-host hotfix behavior back into the repo
- stamp one explicit compatibility version across the stabilization-facing wrappers
- add one canonical `stabilize-post-remediation-degraded-smoke.ps1` wrapper
- write:
  - `.planning/phases/16-deployed-windows-runtime-parity-sync-and-post-remediation-degraded-smoke-stabilization/16-STABILIZATION-SUMMARY.json`
  - `.planning/phases/16-deployed-windows-runtime-parity-sync-and-post-remediation-degraded-smoke-stabilization/16-STABILIZATION-SUMMARY.md`
  - `infra/data/post-remediation-degraded-smoke/latest.json`
- expose the latest stabilization result in `control-api` and `/internal/admin`
- redeploy the parity-synced archive to `192.168.88.250`
- run one bounded live stabilization pass and end with one explicit verdict:
  - `stabilized_through_smoke`
  - or `hold_rollout`

It should not do any of this:

- delete profiles or clear cookies/local storage
- widen from the bounded canary path into a blind full-pool start
- reopen public-owner architecture as a separate redesign
- claim rollout health without a new live parity-synced artifact

## Recommended Technical Shape

### 1. Sync the runtime-critical files back into explicit parity

Phase 16 should bring the repo copy of the live hotfix path back into explicit parity for:

- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/windows-block/remediate-disconnected-baseline-and-forced-host-edge.ps1`
- `services/control-api/src/config.ts`
- `services/control-api/src/server.ts`
- `services/control-api/src/routes/internal-admin-page.ts`

Then the build output should regenerate the runtime files the deployed host actually starts from:

- `services/control-api/dist/config.js`
- `services/control-api/dist/server.js`
- `services/control-api/dist/routes/internal-admin-page.js`

The parity sync should stamp one exact compatibility marker:

- `phase16-runtime-parity-sync-v1`

That marker should appear in the stabilization-facing artifacts so future server runs can say exactly which repo/runtime contract produced the evidence.

### 2. Add one canonical degraded-smoke stabilization wrapper

Create `infra/windows-block/stabilize-post-remediation-degraded-smoke.ps1` as the canonical Phase 16 wrapper.

It should default to:

- `SessionBaseUrl=http://127.0.0.1:8080`
- `PublicApiBaseUrl=http://77.66.186.75`
- `InternalBaseUrl=http://127.0.0.1:8081`
- `HostControllerBaseUrl=http://127.0.0.1:4040`
- `WindowsEdgeBaseUrl=http://127.0.0.1`
- `PublicHostHeader=77.66.186.75`
- `CanaryWorkerId=shared-6`
- `RecoveryWaitSeconds=15`
- `PostCanaryDelaySeconds=10`
- `PostSmokeDelaySeconds=15`

It should capture exact stage snapshots named:

- `before_stabilization`
- `after_remediation`
- `after_smoke_canary`
- `after_smoke_settle`
- `after_cleanup`

It should reuse the existing remediation and smoke helpers instead of inventing a second smoke contract.

The stabilization artifact should expose these exact fields:

- `scriptCompatibilityVersion`
- `preSmokeReadyCount`
- `finalSmokeReadyCount`
- `finalPoolStatus`
- `publicCanaryPassed`
- `verdict`

### 3. Surface the latest stabilization result for operators

Mirror the established operator pattern again:

- file-backed source of truth at `infra/data/post-remediation-degraded-smoke/latest.json`
- one internal route in `control-api`
- one internal admin section that shows:
  - latest timestamp
  - pre-smoke ready count
  - final smoke ready count
  - final pool status
  - public canary result
  - compatibility version
  - final verdict

### 4. Close with one explicit parity-synced live verdict

The live deployed-host closeout should answer one exact question:

After the repo/runtime parity sync, can the deployed host survive one bounded post-remediation degraded-smoke stabilization run?

If yes, Phase 16 should end with `stabilized_through_smoke`.

If no, the honest result is still `hold_rollout`, but now with parity-synced evidence instead of another live-only hotfix note.

## Suggested Plan Decomposition

### Wave 1

- sync the live PowerShell hotfix behavior back into the repo
- stamp the exact compatibility marker
- add the canonical stabilization wrapper
- document the exact repo-to-host sync list and live command

### Wave 2

- add a file-backed latest-stabilization route in `control-api`
- render the latest stabilization result in `/internal/admin`
- regenerate the `dist` runtime files and cover the new route/admin section with tests

### Wave 3

- redeploy the parity-synced archive to `192.168.88.250`
- run the live stabilization wrapper
- confirm the operator surface shows the same latest artifact
- write `16-VERIFICATION.md`
- update roadmap, state, requirements, and project truth with the final verdict

## Risks And Constraints

- The preserved host inventory remains the source of truth; the repo defaults may still lag the live nine-account pool unless the phase records that mismatch explicitly.
- A parity-synced repo does not automatically mean the degraded smoke path is healthy.
- A greener smoke snapshot does not automatically mean the public canary path is healthy end-to-end.
- Preserve-first rules remain mandatory: no profile deletion, no cookie clearing, no local-storage clearing, no blind full-pool restart, and no mass relogin as the default path.

## Validation Architecture

Automated validation should focus on the repo/runtime parity layer and the operator surface:

- PowerShell parse checks for:
  - `infra/windows-block/stabilize-post-remediation-degraded-smoke.ps1`
  - `infra/windows-block/remediate-disconnected-baseline-and-forced-host-edge.ps1`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-post-remediation-degraded-smoke.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

Manual validation must remain on the deployed Windows host:

- sync the Phase 16 archive over the existing checkout
- restart `control-api` from the parity-synced runtime files
- run the exact Phase 16 stabilization harness
- confirm `/internal/post-remediation-degraded-smoke/latest` or `/internal/admin` matches the generated artifact
- record whether the bounded stabilization path now truly reaches `stabilized_through_smoke` or still ends in `hold_rollout`

## Planning Conclusion

Phase 16 is ready to plan now.

The right plan is:

1. restore repo-vs-runtime parity for the live hotfix path
2. add one canonical post-remediation degraded-smoke stabilization harness
3. expose the latest stabilization result to operators
4. rerun the bounded live path on the deployed host and record one explicit final verdict
