# Phase 20 Research

## Current Baseline

Phase 19 already proved the important truths we must now treat as fixed input:

- the deployed-host follow-up harness is real
- `GET /internal/persistent-disconnected-runtime-followup/latest` and `/internal/admin` both work
- the follow-up still stayed at `0/9 ready`
- the dominant runtime blocker still stayed `disconnected`
- the first failing hop still stayed `windows_edge_forced_host`
- the public owner still returned `502`
- the required smoke rerun still ended with `hold_rollout`
- the final smoke still settled at `after_settle` with only `1/9 ready`

Phase 19 also surfaced the exact next blocker we must now treat as part of scope:

- the deployed host still required compatibility restores after overlay in:
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/recover-browser-block-readiness.ps1`
  - `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`
  - `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/host-worker/test-host-worker-relay.ps1`

That means the next gap is no longer follow-up visibility.

The next gap is one preserve-first remediation branch that does both of these at once:

1. syncs the exact deployed-host compatibility restores back into the repo so the next archive is parity-clean
2. reruns the persistent disconnected-runtime plus public `502` remediation path on that parity-clean chain instead of depending on live server-only hotfixes

## Existing Building Blocks We Should Reuse

### Preserve-first wrapper chain

The repo already has the runtime-critical scripts we should reuse instead of replacing:

- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`
- `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/host-worker/test-host-worker-relay.ps1`

These scripts already encode the safety contract that must stay intact:

- preserve the nine logged-in accounts
- do not delete profiles
- do not clear cookies or local storage
- do not mass relogin
- do not use blind full-pool restart as the default path
- do not widen beyond the bounded canary path unless the host evidence proves it is safe

### Existing operator-surface pattern

The control plane already has the visibility pattern we should reuse again:

- file-backed `latest.json`
- one internal `GET /internal/.../latest` route
- one matching section in `/internal/admin`

Phase 20 does not need a new observability model.

It needs one new phase-specific artifact and latest surface for the parity-backport remediation run.

## What Phase 20 Must Answer

Phase 20 should answer these exact operational questions:

1. Can the repo absorb the six deployed-host compatibility restores so the next overlay no longer needs manual script edits before the live run?
2. After that parity-clean redeploy, does the persistent disconnected-runtime remediation path still start from the same `0/9 ready` truth or produce a different baseline?
3. On the parity-clean chain, does `windows_edge_forced_host` still remain the first failing hop, or does the branch reclassify?
4. After the parity-clean remediation run, does the proven Phase 11 smoke still end in `hold_rollout`, or can the host finally survive smoke without live-only hotfixes?

## What Phase 20 Still Lacks

Four concrete gaps remain:

1. There is no canonical Phase 20 compatibility marker covering the exact deployed-host fixes surfaced by Phase 19.
2. There is no dedicated phase artifact for a parity-clean remediation rerun of the persistent disconnected-runtime plus public `502` branch.
3. There is no dedicated latest operator surface for that parity-clean remediation result.
4. There is no final parity-clean remediation-plus-smoke verdict that says the host is `remediated_through_smoke` or still `hold_rollout`.

## Recommended Phase Boundary

Phase 20 should stay narrow and preserve-first.

It should do all of this:

- sync the exact deployed-host compatibility restores back into the repo and stamp one explicit compatibility version
- add one canonical parity-clean remediation harness for the persistent disconnected-runtime plus public `502` branch
- persist a durable remediation artifact and `latest.json`
- expose that latest remediation result in `control-api` and `/internal/admin`
- redeploy the parity-clean archive to `192.168.88.250`
- run one live remediation attempt
- rerun the proven Phase 11 smoke
- end with one explicit verdict:
  - `remediated_through_smoke`
  - or `hold_rollout`

It should not do any of this:

- invent a new greenfield remediation branch unrelated to the Phase 19 path
- widen beyond the bounded canary path
- treat destructive reset behavior as a normal repair path
- claim household rollout is restored without a fresh smoke rerun

## Recommended Technical Shape

### 1. Sync the exact deployed-host compatibility restores back into explicit parity

Phase 20 should bring the repo copy back into explicit parity for the exact files that still needed live fixes after the Phase 19 overlay:

- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`
- `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/host-worker/test-host-worker-relay.ps1`

The phase should stamp one exact compatibility marker:

- `phase20-runtime-parity-backport-v1`

That marker should appear in the Phase 20 remediation artifact so future server runs can say exactly which repo/runtime contract produced the evidence.

### 2. Add one canonical parity-clean remediation harness

Create:

- `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502-parity.ps1`

This wrapper should:

- start from the already-confirmed persistent disconnected baseline
- reuse the now parity-clean Phase 19 chain instead of inventing a new branch
- keep the bounded canary `shared-6` alive long enough to probe loopback, forced-host, and public-owner in one bounded run
- capture exact stage snapshots named:
  - `before_parity_remediation`
  - `after_runtime_parity_assertion`
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

- `.planning/phases/20-deployed-windows-runtime-parity-backport-and-persistent-disconnected-runtime-public-502-remediation/20-REMEDIATION-SUMMARY.json`
- `.planning/phases/20-deployed-windows-runtime-parity-backport-and-persistent-disconnected-runtime-public-502-remediation/20-REMEDIATION-SUMMARY.md`
- `infra/data/runtime-parity-backport-remediation/latest.json`

The artifact should expose these exact fields:

- `scriptCompatibilityVersion`
- `parityBackportFiles`
- `preRemediationReadyCount`
- `postRemediationReadyCount`
- `dominantRuntimeBlocker`
- `firstFailingHop`
- `forcedHostStatus`
- `publicOwnerStatus`
- `verdict`

The pre-smoke remediation verdict should be exactly one of:

- `parity_backport_ready_for_smoke`
- `hold_rollout`

### 3. Surface the latest parity-backport remediation result for operators

Mirror the established operator pattern again:

- file-backed source of truth at `infra/data/runtime-parity-backport-remediation/latest.json`
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

### 4. Close with one explicit remediation-plus-smoke verdict

The live deployed-host closeout should answer one exact question:

After the parity-clean remediation run, can the deployed host survive the proven Phase 11 smoke contract without live-only hotfixes?

If yes, Phase 20 should end with `remediated_through_smoke`.

If no, the honest result is still `hold_rollout`, but now with parity-clean evidence instead of another server-only patch note.

## Suggested Plan Decomposition

### Wave 1

- sync the six deployed-host compatibility restores back into the repo
- stamp the exact compatibility marker
- add the canonical Phase 20 parity-clean remediation harness
- document the exact repo-to-host sync list and live remediation command

### Wave 2

- add a file-backed latest parity-backport remediation route in `control-api`
- render the latest remediation result in `/internal/admin`
- regenerate the `dist` runtime files and cover the new route/admin section with tests

### Wave 3

- redeploy the parity-clean archive to `192.168.88.250`
- run the live Phase 20 remediation harness
- confirm the operator surface shows the same latest remediation artifact
- rerun the proven Phase 11 smoke
- write `20-VERIFICATION.md`
- update roadmap, state, requirements, and project truth with the final verdict

## Risks And Constraints

- The deployed-host inventory remains the source of truth; if it differs from the default nine-worker list, the final verification must record that mismatch explicitly.
- A parity-clean archive does not automatically mean the runtime itself is healthy.
- A greener forced-host branch does not automatically mean the Ubuntu public owner is healthy end-to-end.
- Preserve-first rules remain mandatory: no profile deletion, no cookie clearing, no local-storage clearing, no blind full-pool restart, and no mass relogin as the default path.

## Validation Architecture

Automated validation should focus on the parity-backport layer, the new remediation wrapper, and the operator surface:

- PowerShell parse checks for:
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/recover-browser-block-readiness.ps1`
  - `infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1`
  - `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502.ps1`
  - `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502-parity.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
  - `infra/host-worker/test-host-worker-relay.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-runtime-parity-backport-remediation.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

Manual validation must remain on the deployed Windows host:

- overlay the Phase 20 archive onto the existing checkout before trusting the live run
- restart `control-api` on `127.0.0.1:8081` from the updated `dist` runtime
- run the exact Phase 20 remediation harness
- confirm `/internal/runtime-parity-backport-remediation/latest` or `/internal/admin` matches the generated artifact
- rerun the exact Phase 11 smoke command
- record whether the host is now truly `remediated_through_smoke` or still `hold_rollout`

## Planning Conclusion

Phase 20 is ready to plan now.

The right plan is:

1. sync the exact deployed-host compatibility restores back into the repo
2. add one canonical preserve-first parity-clean remediation harness
3. expose the latest remediation result to operators
4. rerun the proven smoke contract and record one explicit remediation-or-hold verdict
