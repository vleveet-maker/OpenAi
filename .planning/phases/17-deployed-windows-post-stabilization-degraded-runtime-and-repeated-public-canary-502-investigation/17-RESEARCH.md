# Phase 17 Research

## Current Baseline

Phase 16 already proved the important structural truths:

- the repo/runtime parity archive is now real
- the canonical post-remediation stabilization wrapper is real
- the latest-stabilization route and internal admin surface are real
- BOM-tolerant latest-state parsing is now back in the repo

The live deployed-host outcome is still negative:

- the parity-synced stabilization run started from only `1/9 ready`
- the final smoke snapshot fell back to `0/9 ready`
- the pool stayed `degraded`
- the public canary on `shared-6` again returned `502` on `healthz`, `v1/models`, and `v1/chat/completions`
- cleanup still left `shared-6` stopped and `0` active listening workers

That means the next blocker is no longer:

- missing smoke tooling
- missing recovery tooling
- missing remediation tooling
- missing stabilization tooling
- missing latest-route visibility
- or simple repo-vs-runtime parity

The blocker is now the runtime itself after stabilization.

## Existing Building Blocks We Should Reuse

### Preserve-first wrappers

The repo already has the bounded wrappers we should build on instead of replacing:

- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/test-rollout-smoke.ps1`
- `infra/windows-block/recover-browser-block-readiness.ps1`
- `infra/windows-block/remediate-disconnected-baseline-and-forced-host-edge.ps1`
- `infra/windows-block/stabilize-post-remediation-degraded-smoke.ps1`

These wrappers already encode the safety contract that must stay intact:

- preserve logged-in accounts
- do not delete profiles
- do not clear cookies or local storage
- do not mass relogin
- do not widen beyond the bounded canary path by default

### Existing operator surfaces

The control plane already has the visibility pattern we should reuse again:

- `GET /internal/rollout-smoke/latest`
- `GET /internal/readiness-recovery/latest`
- `GET /internal/post-recovery-regression/latest`
- `GET /internal/zero-ready-root-cause/latest`
- `GET /internal/disconnected-baseline-remediation/latest`
- `GET /internal/post-remediation-degraded-smoke/latest`
- `/internal/admin`

### Existing live truth

The current durable evidence is already enough to narrow Phase 17 sharply:

- Phase 12 proved the pool can recover to `9/9 ready`
- Phase 13 proved the post-recovery baseline can still already be `0/9 ready`
- Phase 14 proved `loopback_api` can stay green while the first failing hop is `windows_edge_forced_host`
- Phase 15 proved the forced-host/public-owner remediation still ends in `hold_rollout`
- Phase 16 proved parity-sync plus bounded stabilization still ends in `hold_rollout`

So the next gap is not whether the general architecture exists.

The next gap is which runtime component collapses after stabilization and how that collapse lines up with the repeated public `502`.

## What Phase 17 Must Answer

Phase 17 should answer these exact operational questions:

1. Why does the parity-synced post-stabilization path only reach `1/9 ready` before smoke and then fall back to `0/9 ready`?
2. At the moment the repeated public canary returns `502`, what is the actual runtime state of the canary worker, its local listener, and the host-controller view?
3. Is the repeated public `502` caused by the same underlying runtime collapse that drives the `1/9 -> 0/9` regression, or are they still separate layers?
4. Which exact runtime component should the next remediation phase target:
   - worker/browser lifecycle
   - local listener availability
   - host-controller/runtime coordination
   - or the forced-host/public-owner edge branch

## What Phase 17 Still Lacks

Four concrete gaps remain:

1. There is no canonical artifact that correlates ready-count transitions with local process and listener evidence.
2. There is no durable capture of canary worker runtime flags at the same time the public `502` repeats.
3. There is no dedicated latest-runtime-investigation surface equivalent to the earlier recovery, smoke, remediation, and stabilization surfaces.
4. There is no final verdict that says the runtime blocker is now confirmed with a dominant blocker class and first failing hop, or that rollout still remains held because the evidence is still incomplete.

## Recommended Phase Boundary

Phase 17 should stay narrow and investigative.

It should do all of this:

- add one canonical post-stabilization runtime-investigation harness
- correlate host-controller truth, internal worker truth, and local listener/process evidence across a bounded canary path
- record hop results for:
  - `loopback_api`
  - `windows_edge_forced_host`
  - `ubuntu_public_owner`
- persist one durable latest runtime-investigation artifact
- expose that latest artifact through an internal route and admin section
- end with one explicit verdict:
  - `runtime_blocker_confirmed`
  - or `hold_rollout`

It should not do any of this:

- widen beyond the bounded canary path
- claim rollout is restored
- reopen broader architecture changes
- use destructive reset behavior as the default diagnostic path

## Recommended Technical Shape

### 1. Add one canonical post-stabilization runtime investigation harness

Create `infra/windows-block/investigate-post-stabilization-runtime-and-public-502.ps1` as the canonical Phase 17 wrapper.

It should:

- start from the current post-stabilization degraded baseline
- capture stage snapshots named:
  - `before_runtime_probe`
  - `after_canary_start`
  - `after_loopback_probe`
  - `after_public_probe`
  - `after_smoke_settle`
  - `after_cleanup`
- derive per-worker runtime blocker classes from:
  - host-controller `/health`
  - `/internal/host-pool`
  - `/internal/workers`
  - `/internal/observability/summary`
- capture local listener/process evidence for:
  - worker-agent ports `4021..4029`
  - `4040`
  - `8080`
  - `8081`
- reuse the existing stabilization and public-probe helpers instead of inventing a second smoke contract
- write:
  - `.planning/phases/17-deployed-windows-post-stabilization-degraded-runtime-and-repeated-public-canary-502-investigation/17-RUNTIME-INVESTIGATION-SUMMARY.json`
  - `.planning/phases/17-deployed-windows-post-stabilization-degraded-runtime-and-repeated-public-canary-502-investigation/17-RUNTIME-INVESTIGATION-SUMMARY.md`
  - `infra/data/post-stabilization-runtime-investigation/latest.json`

### 2. Make the artifact name the runtime blocker explicitly

The Phase 17 artifact should expose these exact fields:

- `scriptCompatibilityVersion`
- `preInvestigationReadyCount`
- `postCanaryReadyCount`
- `finalReadyCount`
- `dominantRuntimeBlocker`
- `firstFailingHop`
- `verdict`

It should also record canary runtime facts strongly enough that the next remediation can target the right layer without rereading raw terminal logs.

### 3. Surface the latest runtime investigation for operators

Mirror the established operator pattern again:

- file-backed source of truth at `infra/data/post-stabilization-runtime-investigation/latest.json`
- one internal route in `control-api`
- one internal admin section that shows:
  - latest timestamp
  - pre-investigation ready count
  - post-canary ready count
  - final ready count
  - dominant runtime blocker
  - first failing hop
  - compatibility version
  - final verdict

### 4. Close with one explicit runtime-blocker verdict

The live deployed-host closeout should answer one exact question:

Do we now know which runtime layer collapses after stabilization and which hop fails first when the public canary repeats `502`?

If yes, Phase 17 should end with `runtime_blocker_confirmed`.

If no, the honest result is still `hold_rollout`, but with stronger runtime evidence than the current `1/9 -> 0/9` summary alone.

## Suggested Plan Decomposition

### Wave 1

- add the canonical post-stabilization runtime investigation harness
- reuse the existing stabilization/probe helpers and capture listener/process evidence
- document the exact repo-to-host sync list and live command

### Wave 2

- add a file-backed latest runtime-investigation route in `control-api`
- render the latest runtime investigation in `/internal/admin`
- cover the new route and admin section with tests

### Wave 3

- run the live post-stabilization runtime investigation on `192.168.88.250`
- confirm the operator surface shows the same latest result
- write `17-VERIFICATION.md`
- update roadmap, state, requirements, and project truth with the final verdict

## Risks And Constraints

- The deployed host inventory remains the source of truth; the repo default worker set may still lag the preserved nine-account pool.
- A repeated public `502` can still be downstream of a runtime collapse instead of the original cause, so the phase must record both layers.
- A single canary transition to `1/9 ready` is not enough to claim pool recovery.
- Preserve-first rules remain mandatory: no profile deletion, cookie clearing, local-storage clearing, blind full-pool restart, or mass relogin as the default diagnostic path.

## Validation Architecture

Automated validation should focus on the local script and operator-surface layers:

- PowerShell parse checks for:
  - `infra/windows-block/investigate-post-stabilization-runtime-and-public-502.ps1`
  - `infra/windows-block/stabilize-post-remediation-degraded-smoke.ps1`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/test-rollout-smoke.ps1`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-post-stabilization-runtime-investigation.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

Manual validation must remain on the deployed Windows host:

- sync the Phase 17 archive and restart `control-api`
- run the exact Phase 17 runtime-investigation harness
- confirm `/internal/post-stabilization-runtime-investigation/latest` or `/internal/admin` matches the generated artifact
- record whether the runtime blocker is now explicit enough to drive the next remediation phase

## Planning Conclusion

Phase 17 is ready to plan now.

The right plan is:

1. capture the exact runtime and listener state around the `1/9 -> 0/9` collapse
2. correlate that collapse with the repeated public-canary `502`
3. expose the latest runtime investigation result to operators
4. end with one explicit `runtime_blocker_confirmed` or `hold_rollout` verdict
