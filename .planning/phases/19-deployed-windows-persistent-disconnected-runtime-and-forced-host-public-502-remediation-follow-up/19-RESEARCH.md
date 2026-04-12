# Phase 19 Research

## Current Baseline

Phase 18 already closed the last repo/runtime parity gap we knew how to name:

- the deployed host ran the parity-synced remediation archive
- `GET /internal/disconnected-runtime-remediation/latest` and `/internal/admin` matched the same latest remediation result
- the required post-remediation smoke rerun also happened
- the repo now backports string-or-object `Worker.status` normalization into the runtime-critical Windows wrappers

That means the next gap is no longer the old `status.detail` schema drift.

The current live truth we must treat as fixed input is:

- remediation still starts from `0/9 ready`
- remediation still ends at `0/9 ready`
- the dominant runtime blocker remains `disconnected`
- the first failing hop remains `windows_edge_forced_host`
- the public canary on `shared-6` still returns `502` on `healthz`, `v1/models`, and `v1/chat/completions`
- the final smoke still settles at `after_settle` with pool `degraded` and only `1/9 ready`

So Phase 19 should not spend another wave proving the same truths under a new filename.

It should target the remaining operational gap:

1. keep a bounded canary runtime alive long enough to observe whether a targeted revive survives into the forced-host and public-owner path
2. record that truth durably under the same preserve-first rules
3. rerun the exact smoke contract only after the follow-up path has been exercised

## What Phase 18 Already Gives Us

### Runtime-clean wrapper chain

The repo already has the runtime-critical building blocks we should reuse instead of replacing:

- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`
- `infra/windows-block/investigate-post-stabilization-runtime-and-public-502.ps1`

These scripts now already carry the main parity fixes:

- named-parameter probe calls
- BOM-safe latest-state reading on the API side
- string-or-object `Worker.status` normalization in the runtime-critical wrappers

Phase 19 should build on that exact chain instead of inventing another parallel compatibility branch.

### Operator surface pattern

The control plane already has the exact observability pattern we need:

- file-backed `latest.json`
- one internal `GET /internal/.../latest` route
- one matching section in `/internal/admin`

Phase 19 does not need a new visibility model. It only needs a new follow-up artifact for this exact branch:

- persistent disconnected runtime
- bounded canary revive
- forced-host/public `502` branch recheck

## What Still Is Not Answered

Phase 18 still leaves four operational questions open:

1. If we keep the bounded canary alive through the forced-host/public-owner checks, does internal readiness stay above the current `0/9` truth or collapse immediately again?
2. Is the `windows_edge_forced_host` branch still the first failing hop even while the canary is demonstrably alive and loopback-green?
3. Does the public-owner side stay red only because the forced-host branch is still bad, or is there now a separate public-owner fault after forced-host repair?
4. After a targeted follow-up run, does the exact smoke contract still end in `hold_rollout`, or can the host finally survive smoke?

## What Phase 19 Must Add

Four concrete gaps remain:

1. There is no canonical follow-up harness that reuses the Phase 18 parity-clean chain but keeps the canary alive through targeted revive plus forced-host/public-owner rechecks.
2. There is no dedicated latest operator surface for this exact persistent-disconnected follow-up result.
3. There is no durable artifact that correlates the bounded canary revive attempt with the forced-host/public-owner branch in one place.
4. There is no final follow-up-plus-smoke verdict that says the host is `stabilized_through_smoke` or still `hold_rollout`.

## Recommended Phase Boundary

Phase 19 should stay narrow and preserve-first.

It should do all of this:

- add one canonical follow-up harness for the persistent disconnected runtime plus forced-host/public `502` branch
- reuse the Phase 18 parity-clean wrapper chain instead of reopening the parity problem
- persist a durable JSON/Markdown follow-up artifact and `latest.json`
- expose that latest follow-up result in `control-api` and `/internal/admin`
- redeploy the Phase 19 archive to `192.168.88.250`
- run one live bounded follow-up command
- rerun the exact Phase 11 smoke
- end with one explicit final verdict:
  - `stabilized_through_smoke`
  - or `hold_rollout`

It should not do any of this:

- widen beyond the bounded canary path
- reintroduce destructive reset behavior as a normal path
- reopen the already-settled public-owner architecture as a greenfield redesign
- claim rollout is restored without a fresh smoke rerun

## Recommended Technical Shape

### 1. Add one canonical persistent follow-up harness

Create:

- `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502.ps1`

This wrapper should:

- start from the already-confirmed disconnected baseline
- keep the canary `shared-6` alive long enough to probe loopback, forced-host, and public-owner in one bounded run
- capture exact stage snapshots named:
  - `before_followup`
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

- `.planning/phases/19-deployed-windows-persistent-disconnected-runtime-and-forced-host-public-502-remediation-follow-up/19-FOLLOWUP-SUMMARY.json`
- `.planning/phases/19-deployed-windows-persistent-disconnected-runtime-and-forced-host-public-502-remediation-follow-up/19-FOLLOWUP-SUMMARY.md`
- `infra/data/persistent-disconnected-runtime-followup/latest.json`

The artifact should expose these exact fields:

- `scriptCompatibilityVersion`
- `preFollowupReadyCount`
- `postFollowupReadyCount`
- `dominantRuntimeBlocker`
- `firstFailingHop`
- `forcedHostStatus`
- `publicOwnerStatus`
- `verdict`

The pre-smoke follow-up verdict should be exactly one of:

- `followup_ready_for_smoke`
- `hold_rollout`

### 2. Mirror the operator surface for the new artifact

Add a new file-backed route and admin section:

- `GET /internal/persistent-disconnected-runtime-followup/latest`
- `/internal/admin` -> `Latest persistent disconnected runtime follow-up`

The operator surface should render:

- latest timestamp
- pre-follow-up ready count
- post-follow-up ready count
- dominant runtime blocker
- first failing hop
- forced-host status
- public-owner status
- compatibility version
- final follow-up verdict

### 3. Close with one explicit follow-up-plus-smoke verdict

The live closeout should answer one exact question:

After the bounded persistent-runtime follow-up, can the deployed host survive the proven Phase 11 smoke?

If yes, Phase 19 should end with `stabilized_through_smoke`.

If no, the honest result remains `hold_rollout`.

## Suggested Plan Decomposition

### Wave 1

- add the canonical persistent disconnected-runtime follow-up harness
- reuse the Phase 18 parity-clean wrapper chain
- document the exact sync list and live follow-up command

### Wave 2

- add the file-backed latest follow-up route in `control-api`
- add the matching admin section
- regenerate `dist` and cover the new route/admin section with tests

### Wave 3

- redeploy the Phase 19 archive to `192.168.88.250`
- run the live follow-up harness
- confirm the operator surface shows the same latest result
- rerun the exact Phase 11 smoke
- write `19-VERIFICATION.md`
- update roadmap, state, requirements, and project truth with the final verdict

## Risks And Constraints

- The live deployed-host worker inventory remains the source of truth; if it differs from the default nine-worker list, the final verification must record that mismatch explicitly.
- A greener loopback or forced-host branch does not automatically mean the public owner is healthy end-to-end.
- A greener follow-up snapshot does not automatically mean the smoke contract survives.
- Preserve-first rules remain mandatory: no profile deletion, no cookie clearing, no local-storage clearing, no blind full-pool restart, and no mass relogin as the default path.

## Validation Architecture

Automated validation should focus on the new harness and the operator surface:

- PowerShell parse checks for:
  - `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502.ps1`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-persistent-disconnected-runtime-followup.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

Manual validation must remain on the deployed Windows host:

- overlay the Phase 19 archive onto the existing checkout before trusting the live run
- restart `control-api` on `127.0.0.1:8081` from the updated `dist` runtime
- run the exact Phase 19 follow-up command
- confirm `/internal/persistent-disconnected-runtime-followup/latest` or `/internal/admin` matches the artifact
- rerun the exact Phase 11 smoke command
- record whether the host is now `stabilized_through_smoke` or still `hold_rollout`

## Planning Conclusion

Phase 19 is ready to plan now.

The right plan is:

1. add one canonical persistent disconnected-runtime follow-up harness
2. expose the latest follow-up result to operators
3. rerun the proven smoke contract after the live follow-up run
4. end with one explicit `stabilized_through_smoke` or `hold_rollout` verdict
