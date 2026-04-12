# Phase 18 Research

## Current Baseline

Phase 17 already proved the important truths we must treat as fixed inputs:

- the live deployed-host result is now explicit, not speculative
- the baseline is still `0/9 ready`
- starting the bounded canary `shared-6` only lifts the pool to `1/9 ready`
- after smoke and cleanup the pool falls back to `0/9 ready`
- the dominant runtime blocker is `disconnected`
- the first failing hop is `windows_edge_forced_host`
- the public path `http://77.66.186.75` still returns `502` on `healthz`, `v1/models`, and `v1/chat/completions`
- the latest runtime-investigation route and admin surface already exist and match the Phase 17 artifact

Phase 17 also surfaced a second blocker that must now be treated as part of the remediation scope:

- the deployed host still required compatibility restores after archive overlay in:
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/windows-block/investigate-post-stabilization-runtime-and-public-502.ps1`
  - `infra/windows-block/stabilize-post-remediation-degraded-smoke.ps1`

That means the next gap is no longer diagnosis.

The next gap is one preserve-first remediation branch that does all three of these at once:

1. repairs or honestly reclassifies the explicit `disconnected` baseline
2. repairs or honestly reclassifies the `windows_edge_forced_host` branch
3. syncs the deployed-host compatibility restores back into the repo so the next archive is parity-clean

## Existing Building Blocks We Should Reuse

### Preserve-first wrappers

The repo already has the bounded tooling we should build on instead of replacing:

- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/windows-block/remediate-disconnected-baseline-and-forced-host-edge.ps1`
- `infra/windows-block/stabilize-post-remediation-degraded-smoke.ps1`
- `infra/windows-block/investigate-post-stabilization-runtime-and-public-502.ps1`

These wrappers already encode the safety contract that must stay intact:

- preserve the nine logged-in accounts
- do not delete profiles
- do not clear cookies or local storage
- do not mass relogin
- do not use blind full-pool restart as the default path
- do not widen beyond the bounded canary path unless the host evidence proves it is safe

### Existing operator surfaces

The control plane already has the operator-visibility pattern we should reuse again:

- `GET /internal/rollout-smoke/latest`
- `GET /internal/readiness-recovery/latest`
- `GET /internal/post-recovery-regression/latest`
- `GET /internal/zero-ready-root-cause/latest`
- `GET /internal/disconnected-baseline-remediation/latest`
- `GET /internal/post-remediation-degraded-smoke/latest`
- `GET /internal/post-stabilization-runtime-investigation/latest`
- `/internal/admin`

Phase 18 does not need a new observability pattern.

It should reuse the same file-backed latest route plus admin-section approach.

## What Phase 18 Must Repair

Phase 18 should answer these exact operational questions:

1. Can the repo absorb the deployed-host compatibility restores so the next overlay no longer needs manual script fixes before the live run?
2. Can one preserve-first disconnected-runtime remediation path lift the baseline above the current `0/9 ready` truth without damaging the preserved accounts?
3. After that remediation attempt, does `windows_edge_forced_host` turn green, or does it remain the first failing hop even when loopback canary proof exists?
4. After the parity-synced remediation, does the proven Phase 11 smoke still end in `hold_rollout`, or can the system finally survive the smoke contract?

## What Phase 18 Still Lacks

Four concrete gaps remain:

1. There is no canonical parity marker that covers the post-Phase-17 runtime-remediation script chain after the latest deployed-host compatibility restores.
2. There is no canonical preserve-first remediation harness that starts from the confirmed `disconnected` baseline instead of the earlier broader baseline-remediation branch.
3. There is no dedicated latest operator surface for this exact disconnected-runtime remediation result.
4. There is no final parity-synced remediation-plus-smoke verdict that says the host is `remediated_through_smoke` or still `hold_rollout`.

## Recommended Phase Boundary

Phase 18 should stay narrow and remediation-focused.

It should do all of this:

- sync the deployed-host compatibility restores back into the repo and stamp one explicit compatibility version
- add one canonical preserve-first runtime-remediation harness for the confirmed `disconnected` baseline plus forced-Host edge branch
- persist a durable remediation artifact and `latest.json`
- expose that latest remediation result in `control-api` and `/internal/admin`
- redeploy the parity-synced archive to `192.168.88.250`
- run one live remediation attempt
- rerun the proven Phase 11 smoke
- end with one explicit verdict:
  - `remediated_through_smoke`
  - or `hold_rollout`

It should not do any of this:

- widen beyond the bounded canary path
- treat destructive reset behavior as a normal repair path
- reopen the public-owner architecture as a new redesign effort
- claim household rollout is restored without a fresh smoke rerun

## Recommended Technical Shape

### 1. Sync the deployed-host compatibility restores back into explicit parity

Phase 18 should bring the repo copy back into explicit parity for the exact files that Phase 17 still had to patch after overlay:

- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/windows-block/investigate-post-stabilization-runtime-and-public-502.ps1`
- `infra/windows-block/stabilize-post-remediation-degraded-smoke.ps1`

The phase should stamp one exact compatibility marker:

- `phase18-runtime-remediation-v1`

That marker should appear in the new remediation artifact so future server runs can say exactly which repo/runtime contract produced the evidence.

### 2. Add one canonical disconnected-runtime remediation harness

Create `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1` as the canonical Phase 18 wrapper.

It should default to:

- `SessionBaseUrl=http://127.0.0.1:8080`
- `PublicApiBaseUrl=http://77.66.186.75`
- `InternalBaseUrl=http://127.0.0.1:8081`
- `HostControllerBaseUrl=http://127.0.0.1:4040`
- `WindowsEdgeBaseUrl=http://127.0.0.1`
- `PublicHostHeader=77.66.186.75`
- `CanaryWorkerId=shared-6`
- `RecoveryWaitSeconds=15`
- `EdgeSettleSeconds=10`

It should capture exact stage snapshots named:

- `before_runtime_remediation`
- `after_targeted_reconnect`
- `after_loopback_probe`
- `after_forced_host_probe`
- `after_public_owner_probe`
- `after_canary_stop`

It should reuse the existing recovery, probe, and smoke helpers instead of inventing a second edge dialect.

It should write:

- `.planning/phases/18-deployed-windows-disconnected-runtime-remediation-forced-host-edge-repair-and-runtime-parity-resync/18-REMEDIATION-SUMMARY.json`
- `.planning/phases/18-deployed-windows-disconnected-runtime-remediation-forced-host-edge-repair-and-runtime-parity-resync/18-REMEDIATION-SUMMARY.md`
- `infra/data/disconnected-runtime-remediation/latest.json`

The remediation artifact should expose these exact fields:

- `scriptCompatibilityVersion`
- `preRemediationReadyCount`
- `postRemediationReadyCount`
- `dominantRuntimeBlocker`
- `firstFailingHop`
- `forcedHostStatus`
- `publicOwnerStatus`
- `verdict`

The pre-smoke remediation verdict should be exactly one of:

- `remediated_ready_for_smoke`
- `hold_rollout`

### 3. Surface the latest remediation result for operators

Mirror the established operator pattern again:

- file-backed source of truth at `infra/data/disconnected-runtime-remediation/latest.json`
- one internal route in `control-api`
- one internal admin section that shows:
  - latest timestamp
  - pre-remediation ready count
  - post-remediation ready count
  - dominant runtime blocker
  - first failing hop
  - forced-Host status
  - public-owner status
  - compatibility version
  - final verdict

### 4. Close with one explicit remediation-plus-smoke verdict

The live deployed-host closeout should answer one exact question:

After the parity-synced remediation run, can the deployed host survive the proven Phase 11 smoke contract?

If yes, Phase 18 should end with `remediated_through_smoke`.

If no, the honest result is still `hold_rollout`, but now with parity-synced evidence instead of another live-only compatibility note.

## Suggested Plan Decomposition

### Wave 1

- sync the latest deployed-host compatibility restores back into the repo
- stamp the exact compatibility marker
- add the canonical disconnected-runtime remediation harness
- document the exact repo-to-host sync list and live remediation command

### Wave 2

- add a file-backed latest disconnected-runtime remediation route in `control-api`
- render the latest remediation result in `/internal/admin`
- regenerate the `dist` runtime files and cover the new route/admin section with tests

### Wave 3

- redeploy the parity-synced archive to `192.168.88.250`
- run the live disconnected-runtime remediation harness
- confirm the operator surface shows the same latest remediation artifact
- rerun the proven Phase 11 smoke
- write `18-VERIFICATION.md`
- update roadmap, state, requirements, and project truth with the final verdict

## Risks And Constraints

- The deployed-host inventory remains the source of truth; the repo defaults may still lag the preserved nine-account pool unless the phase records any mismatch explicitly.
- A greener remediation snapshot does not automatically mean the smoke contract survives.
- A green `windows_edge_forced_host` probe does not automatically mean the Ubuntu public owner is healthy end-to-end.
- Preserve-first rules remain mandatory: no profile deletion, no cookie clearing, no local-storage clearing, no blind full-pool restart, and no mass relogin as the default path.

## Validation Architecture

Automated validation should focus on the parity-sync layer, remediation wrapper, and operator surface:

- PowerShell parse checks for:
  - `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/windows-block/investigate-post-stabilization-runtime-and-public-502.ps1`
  - `infra/windows-block/stabilize-post-remediation-degraded-smoke.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-disconnected-runtime-remediation.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

Manual validation must remain on the deployed Windows host:

- overlay the Phase 18 archive onto the existing checkout before trusting the live run
- restart `control-api` on `127.0.0.1:8081` from the updated `dist` runtime
- run the exact Phase 18 remediation harness
- confirm `/internal/disconnected-runtime-remediation/latest` or `/internal/admin` matches the generated artifact
- rerun the exact Phase 11 smoke command
- record whether the host is now truly `remediated_through_smoke` or still `hold_rollout`

## Planning Conclusion

Phase 18 is ready to plan now.

The right plan is:

1. sync the latest deployed-host compatibility restores back into the repo
2. add one canonical preserve-first disconnected-runtime remediation harness
3. expose the latest remediation result to operators
4. rerun the proven smoke contract and record one explicit remediation-or-hold verdict
