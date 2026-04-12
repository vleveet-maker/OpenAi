# Roadmap: One Hour With My ChatGPT

## Archived Milestones

- [x] **v1.0 Household MVP** - shipped 2026-03-28, phases `1 -> 6`, archived in [.planning/milestones/v1.0-ROADMAP.md](/d:/OpenAi/.planning/milestones/v1.0-ROADMAP.md)
- [x] **v1.1 Household Rollout Hardening** - shipped 2026-03-28, phases `7 -> 8`, archived in [.planning/milestones/v1.1-ROADMAP.md](/d:/OpenAi/.planning/milestones/v1.1-ROADMAP.md)

## Active Milestone

- [ ] **v1.2 Rollout Stability** - active, focused on internal host-pool orchestration, ChatGPT UI drift hardening, and repeatable rollout confidence

## Overview

The `v1.2` milestone stays tightly focused on rollout stability. The core household product already works, but the operator path still depends on scripts, and the most drift-sensitive ChatGPT UI behaviors still need another hardening pass before the system feels routine and low-stress. Instead of expanding product scope, this milestone makes host-native operation more controllable, selector maintenance more deliberate, and rollout readiness easier to confirm before real use.

## Phases

**Phase Numbering:**
- Integer phases continue from the previous milestone (`9`, `10`, `11`)
- Decimal phases (`9.1`, `10.1`) remain available for urgent insertions

- [x] **Phase 9: Internal host-pool orchestration** - completed 2026-03-28, moved proxied host-native pool lifecycle control into the internal admin surface with clearer failure reporting
- [x] **Phase 10: ChatGPT UI drift hardening** - completed 2026-03-29 through follow-up evidence; selector hardening plus fresh compact-visible proof now confirm current ChatGPT relay on `dad`, `wife`, and `shared-1`
- [x] **Phase 10.6: Remote server deployment, autostart, and external relay API** - (INSERTED) completed 2026-03-29; the Linux remote relay now runs under systemd on `77.66.186.75`, and live relay proof succeeded through a reverse-tunneled compact-visible worker
- [x] **Phase 10.6.1: Remote relay server verification and public API readiness** - (INSERTED) completed 2026-03-29 through follow-up evidence; server truth, worker truth, and the deliberate public API edge are now all explicit
- [x] **Phase 10.1: Hidden runtime after manual login** - (INSERTED) completed 2026-03-28; explicit visible-auth and hidden-runtime paths now exist, plus a canonical hidden-runtime validation probe
- [x] **Phase 10.2: Hidden runtime reliability review and alternative browser runtime decision** - (INSERTED) completed 2026-03-28; control-plane truth is explicit, hidden-runtime evidence is recorded, and Phase 11 is now blocked by an explicit runtime decision
- [x] **Phase 10.3: Alternative non-visible native browser runtime design** - (INSERTED) completed 2026-03-28; alternate desktop runtime foundation and control-plane integration landed, but no worker passed the bounded live proof
- [ ] **Phase 10.4: Alternate desktop auth and bootstrap stabilization** - (INSERTED) executed 2026-03-29 with a negative runtime decision: proof now cleanly distinguishes `dad` auth loss from `wife`/`shared-1` navigation bootstrap failure, but no worker reached `phase11Ready=true`
- [ ] **Phase 10.5: Alternate desktop navigation rescue and auth renewal** - (INSERTED) executed 2026-03-29; `wife` produced the first proof-backed `phase11Ready=true` path in alternate desktop, while `dad` auth renewal and `shared-1` assignment-timeout cleanup remain explicit debt
- [ ] **Phase 10.5.1: Repeatable alternate desktop stability gate** - (INSERTED) executed 2026-03-29; validation is now worker-pinned and repeatability truth is explicit, but `wife` failed the same navigation bootstrap step twice in a row and no worker reached `stable (2/2)`
- [ ] **Phase 10.5.1.1: Alternate desktop repeatability rescue** - (INSERTED) executed 2026-03-29; fresh proof confirmed that visible auth still works on `wife`, but durable and fresh-profile alternate-desktop paths both still fall back to `bootstrap_navigation_failed@navigation`, so Phase 11 remains blocked
- [x] **Phase 10.5.1.1.1: Compact visible runtime rollout and crash-restore popup hardening** - (INSERTED) completed 2026-03-29; compact visible is now the official rollout fallback and fresh proof passed on all six official workers
- [x] **Phase 10.6.1.2: Dedicated Windows browser block deployment** - (INSERTED) completed 2026-03-30; the seven-worker compact-visible runtime is now packaged as a separate Windows block with Windows Server startup assets, stable Linux relay handoff, and a fresh `7/7 usable` direct matrix on the current machine
- [x] **Phase 10.6.1.2.1: Local-machine rollout smoke confidence** - (INSERTED) completed 2026-03-30; local seven-worker compact-visible smoke now has a repeatable command and explicit worker matrix, and follow-up evidence now brings the current operator-PC snapshot to `7/7` usable
- [x] **Phase 10.6.1.2.1.1: Shared-2 and shared-4 bootstrap timeout analysis and mitigation** - (INSERTED) completed 2026-03-30; repeated timeout evidence is now explained by a memory dialog plus an aria-label-only Temporary Chat entry, and both workers now pass live compact-visible proof
- [x] **Phase 10.6.1.2.2: Deployed Windows Server account-preserving stabilization and API cutover** - (INSERTED) completed 2026-03-30 with `hold_preserve_accounts`; the live 9-account Windows Server block is now freeze-audited, canary/subset safe-start proof exists, and shadow API tooling is proven, but Windows-side public API promotion is still on hold
- [ ] **Phase 10.6.1.2.2.1: Windows Server public API activation and edge reconciliation** - (INSERTED) executed 2026-03-30 with `hold_preserve_accounts`; preserve-first edge scripts and outside proof now exist, but the deployed Windows host still needs one direct `Caddy` execution pass before the public API edge can be promoted safely
- [x] **Phase 10.6.1.2.2.1.1: Direct Windows Caddy edge cutover and canary proof** - (INSERTED) completed 2026-03-31 with `safe_but_hold`; direct Windows-host backup/audit, shadow canary, and promoted HTTP proof passed preserve-first on `shared-6`, but HTTPS/TLS and one fully independent outside chat proof still remain
- [x] **Phase 10.6.1.2.2.1.1.1: Windows HTTPS and independent outside chat proof finalization** - (INSERTED) completed 2026-03-31 with `hold_preserve_accounts`; the final follow-up proved that the preserved Windows edge itself still works locally, but the real public IP `77.66.186.75` currently terminates on Ubuntu `nginx` instead of Windows `Caddy`, so the blocker is now exact public-edge ownership
- [x] **Phase 10.6.1.2.2.1.1.1.1: Public edge ownership and split-ingress reconciliation** - (INSERTED) completed 2026-03-31 with `hold_preserve_accounts`; the preserved Windows edge is still healthy on LAN, but the real public IP `77.66.186.75` is currently owned by Ubuntu `nginx`, so the blocker is now exact public-owner conflict outside the browser/runtime layer
- [x] **Phase 10.6.1.2.2.1.1.1.1.1: Ubuntu public owner reassignment and Windows edge unification** - (INSERTED) completed 2026-03-31 with `safe_to_promote`; Ubuntu now deliberately owns public `77.66.186.75`, the conflicting raw-IP `ascii-art` path is removed, and the canary `shared-6` path succeeds through the unified public owner
- [x] **Phase 11: Rollout smoke confidence** - completed 2026-03-31 with `hold_rollout`; the repeatable smoke flow and latest-smoke operator surface are now real, but household use remains held because the readiness snapshot stayed at `0/9 ready` and `9/9 disconnected`
- [x] **Phase 12: Deployed Windows browser-block readiness recovery and reconnect stabilization** - completed 2026-03-31 with `hold_rollout`; the live preserve-first recovery restored the 9-account pool to `9/9 ready` and kept the public canary green, but the required post-recovery smoke rerun still regressed to `0/9 ready` and `9/9 disconnected`
- [x] **Phase 13: Deployed Windows post-recovery smoke regression investigation and stabilization** - completed 2026-03-31 with `hold_rollout`; the live regression artifact, repo-to-runtime parity, and internal latest-regression surface are now proven, but rollout remains held because the post-recovery baseline stayed at `0/9 ready`, only `shared-6` briefly reached `1/9 ready`, and the final public canary returned `502` on all three public checks
- [x] **Phase 14: Deployed Windows zero-ready post-recovery baseline and public-canary 502 root-cause investigation** - completed 2026-03-31 with `root_cause_confirmed`; the zero-ready baseline is now explicitly `0/9 ready`, `9/9 disconnected`, `loopback_api` stays green, the first failing hop is `windows_edge_forced_host`, and the Ubuntu public owner still returns `502`
- [x] **Phase 15: Deployed Windows disconnected baseline and forced-host edge remediation** - completed 2026-04-01 with `hold_rollout`; the preserve-first remediation harness, latest-remediation operator surface, and post-remediation smoke rerun are now all real, but rollout remains held because forced-host still fails, public canary still returns `502`, and the final smoke settles at only `1/9 ready`
- [x] **Phase 16: Deployed Windows runtime parity sync and post-remediation degraded smoke stabilization** - completed 2026-04-01 with `hold_rollout`; the parity-synced archive, canonical stabilization harness, latest-stabilization route, and internal admin surface are now all real, but rollout remains held because the deployed host only reached `1/9 ready` before smoke, regressed to `0/9 ready` by the final smoke snapshot, stayed `degraded`, and the public canary on `shared-6` again returned `502`
- [x] **Phase 17: Deployed Windows post-stabilization degraded runtime and repeated public-canary 502 investigation** - completed 2026-04-01 with `runtime_blocker_confirmed`; the live deployed-host investigation artifact, internal latest route, and admin surface now all agree that the dominant runtime blocker is `disconnected` and the first failing hop is `windows_edge_forced_host`
- [x] **Phase 18: Deployed Windows disconnected runtime remediation, forced-host edge repair, and runtime parity resync** - completed 2026-04-01 with `hold_rollout`; the parity-synced remediation artifact, operator surface, and required post-remediation smoke rerun are now all real, but rollout remains held because remediation stayed at `0/9 ready` and the final smoke still settled at only `1/9 ready` with public canary `502/502/502`
- [x] **Phase 19: Deployed Windows persistent disconnected runtime and forced-host public-502 remediation follow-up** - completed 2026-04-01 with `hold_rollout`; the live follow-up artifact, operator surface, and required smoke rerun are now all real, but rollout remains held because the follow-up stayed at `0/9 ready`, the dominant blocker remained `disconnected`, the first failing hop remained `windows_edge_forced_host`, and the final smoke still settled at only `1/9 ready` with public canary `502/502/502`
- [x] **Phase 20: Deployed Windows runtime parity backport and persistent disconnected-runtime public-502 remediation** - completed 2026-04-01 with `hold_rollout`; the parity-clean archive, latest-remediation operator surface, and exact smoke rerun are now all real, but rollout remains held because remediation stayed at `0/9 ready` and the final smoke still settled at only `1/9 ready` with public canary `502/502/502`
- [x] **Phase 21: Deployed Windows disconnected runtime and windows_edge_forced_host public-owner 502 remediation after parity-clean proof** - completed 2026-04-01 with `hold_rollout`; the live post-parity remediation plus exact smoke rerun are now both real, but the runtime still stayed `0/9 -> 0/9 ready` before smoke and the rerun still ended at only `1/9 ready` with public canary `502/502/502`
- [x] **Phase 22: Deployed Windows post-phase21 disconnected runtime and windows_edge_forced_host public-owner 502 remediation follow-up** - completed 2026-04-01 with `hold_rollout`; the live follow-up artifact plus operator surface are now proven, but the exact smoke rerun still settled at `after_settle` with only `1/9 ready`, a degraded pool, and public canary `502/502/502`
- [x] **Phase 23: Deployed Windows post-phase22 smoke-wrapper parity recovery and persistent disconnected-runtime forced-host public-owner 502 remediation** - completed 2026-04-02 with `hold_rollout`; the live parity-remediation artifact, operator surface, and exact smoke rerun are now all real, but the deployed host still needed post-overlay compatibility restores and the smoke still settled at `1/9 ready` with public canary `502/502/502`
- [x] **Phase 24: Deployed Windows post-phase23 exact smoke-wrapper compat backport and persistent disconnected-runtime forced-host public-owner 502 remediation** - completed 2026-04-02 with `hold_rollout`; the live compat-remediation artifact, operator surface, and exact smoke rerun are now all real, but the exact smoke still settled at `after_settle` with `1/9 ready`, a degraded pool, and public canary `503/503/503`
- [ ] **Phase 25: Deployed Windows post-phase24 live-fix smoke-wrapper backport and persistent disconnected-runtime forced-host public-owner 503 remediation** - planned 2026-04-12 from live Ubuntu and Windows evidence; the canonical public path is now `Ubuntu nginx -> 127.0.0.1:4010`, reverse SSH tunnels are the critical external-chat dependency, and the next step is to backport that live truth before one authenticated external smoke verdict

## Phase Details

### Phase 9: Internal host-pool orchestration

**Goal:** Let the household operator start and stop the proxied host-native pool from the internal admin UI while keeping lifecycle visibility and failure reporting explicit.
**Depends on:** Archived milestone `v1.1 Household Rollout Hardening`
**Requirements:** ORCH-01, ORCH-02, ORCH-03
**Success Criteria** (what must be TRUE):
  1. Internal admin can trigger proxied host-pool start without dropping into PowerShell manually.
  2. Internal admin can trigger proxied host-pool stop and the resulting worker states are visible.
  3. Lifecycle failures show actionable status instead of leaving the operator guessing whether the failure is in the controller, browser, or worker layer.

### Phase 10: ChatGPT UI drift hardening

**Goal:** Bring relay and fresh-chat bootstrap back to a predictable state against the current ChatGPT UI, including the residual `dad` edge case.
**Depends on:** Phase 9
**Requirements:** STAB-01, STAB-02, STAB-03
**Success Criteria** (what must be TRUE):
  1. Relay succeeds on all three household workers against the current ChatGPT UI, including `dad`.
  2. Fresh-chat bootstrap still reaches `Temporary Chat` plus the preferred reasoning model on a logged-in worker.
  3. Selector updates for relay and bootstrap live in centralized, maintainable code paths instead of fragmented browser-specific patches.
**Current status:** Completed on 2026-03-29 through follow-up evidence. Selector centralization is complete, fresh compact-visible proof now confirms current ChatGPT relay on `dad`, `wife`, and `shared-1`, and fresh-chat bootstrap on the current localized UI succeeds on the official six-worker compact-visible pool.

### Phase 10.6: Remote server deployment, autostart, and external relay API (INSERTED)

**Goal:** Extract the proven relay/session/bootstrap module to the dedicated remote server, put it under autostart, and expose an authenticated remote API so the rest of the product can use it remotely without pretending the unproven browser runtime has already been replaced.
**Requirements**: REMOTE-01, REMOTE-02, REMOTE-03, REMOTE-04
**Depends on:** Phase 10.5.1.1.1
**Plans:** 3 plans

**Current status:** Completed on 2026-03-29. Wave 1 and Wave 2 landed locally, then Wave 3 deployed the service to `77.66.186.75`, verified `systemd` autostart, and proved fresh plus continuing remote relay through a reverse-tunneled `wife` worker. Raw public `:4010` ingress is still not the trusted consumer path, but the topology verdict is now explicit and evidence-backed.

**Success Criteria** (what must be TRUE):
  1. The proven relay module can run as a standalone remote service with clear env contract and deployment assets for the target host.
  2. The remote service exposes a documented authenticated HTTP API for health, ask, and end-dialog flows, and it can be started automatically after reboot.
  3. The phase ends with a written topology verdict that says exactly how the remote service reaches the runtime layer, or exactly why that topology is still blocked.

Plans:
- [x] `10.6-01-PLAN.md` - standalone remote-relay mode, target-host audit assets, and deploy/autostart contract
- [x] `10.6-02-PLAN.md` - authenticated remote relay API and standalone service wiring
- [x] `10.6-03-PLAN.md` - SSH deployment, live remote smoke, and final topology verdict

### Phase 10.6.1: Remote relay server verification and public API readiness (INSERTED)

**Goal:** Turn the working remote relay into a verifiable and intentionally consumable service by checking the server shape, checking every official worker over the real remote topology, and putting one deliberate external ingress/API boundary in front of it.
**Requirements**: EXTAPI-01, EXTAPI-02, EXTAPI-03, EXTAPI-04
**Depends on:** Phase 10.6
**Plans:** 3 plans

**Current status:** Completed on 2026-03-29 through follow-up evidence from `Phase 10.6.1.1`. The relay server is repeatably verifiable, the six official workers were re-audited through the real remote topology, and the deliberate nginx public boundary is now also reachable from outside clients through the MikroTik NAT path.

**Success Criteria** (what must be TRUE):
  1. The operator can rerun a deliberate server verification path and see truthful status for process health, autostart, ingress truth, and current topology.
  2. Every official worker session (`dad`, `wife`, `shared-1`, `shared-2`, `shared-3`, `shared-4`) is checked against the real remote relay path and classified clearly.
  3. The service has one deliberate external ingress/API path for other clients, plus written auth and usage docs that do not expose internal admin or hidden runtime details.

Plans:
- [x] `10.6.1-01-PLAN.md` - server verification path, service truth, and operator audit artifacts
- [x] `10.6.1-02-PLAN.md` - full worker/session audit through the remote topology
- [x] `10.6.1-03-PLAN.md` - deliberate external ingress, public API contract, and operator/client docs

### Phase 10.6.1.1: MikroTik public ingress and NAT hardening (INSERTED)

**Goal:** Move the remote relay from "healthy on the box" to "reachable from outside" by auditing the MikroTik boundary in front of `192.168.88.2`, defining one deliberate NAT path to the server `nginx` edge, and proving whether the public IP now reaches that edge.
**Requirements**: MTIK-01, MTIK-02, MTIK-03, MTIK-04
**Depends on:** Phase 10.6.1
**Plans:** 3 plans

**Current status:** Completed on 2026-03-29. Router/server truth is explicit, the deliberate `owmcgp-public-relay-http` NAT rule now forwards WAN `tcp/80` to `192.168.88.2:80`, RouterOS management services are restricted to `192.168.88.0/24`, and outside-client proof now reaches the deliberate relay edge on `http://77.66.186.75`.

**Success Criteria** (what must be TRUE):
  1. The project can prove which MikroTik services, routes, and firewall/NAT rules currently govern public ingress to `192.168.88.2`.
  2. One deliberate public path forwards the relay edge to the server `nginx` boundary instead of leaving the public IP behavior ambiguous.
  3. Outside-client proof shows that `77.66.186.75` now reaches our intended edge, or the phase ends with one precise router/upstream blocker classification.

Plans:
- [x] `10.6.1.1-01-PLAN.md` - router/server audit path and explicit MikroTik truth
- [x] `10.6.1.1-02-PLAN.md` - deliberate NAT path plus management-surface hardening
- [x] `10.6.1.1-03-PLAN.md` - outside-client proof and final ingress verdict

### Phase 10.6.1.2: Dedicated Windows browser block deployment (INSERTED)

**Goal:** Package the real seven-worker browser runtime as a separate Windows browser block that can be deployed on a Windows Server, keep Linux as the deliberate relay/API edge, and remove the remaining "this exact operator PC" assumption from the runtime path.
**Depends on:** Phase 10.6.1.1
**Requirements:** WINBLK-01, WINBLK-02, WINBLK-03, WINBLK-04
**Plans:** 3 plans
**Success Criteria** (what must be TRUE):
  1. The seven-worker browser runtime can be deployed onto a dedicated Windows Server block instead of the operator laptop, while Linux keeps the public relay/API role.
  2. Deployment assets exist for Windows logon autostart, reverse SSH tunnels, and operator manual login/reauth without writing secrets into the repo.
  3. The phase ends with a truthful seven-worker matrix for the Windows block and an explicit readiness verdict instead of assuming all seven profiles are equally stable.
**Current status:** Completed on 2026-03-30. The Linux browser-runtime path remains reverted, the seven-worker runtime is now packaged as a separate Windows browser block with startup and reverse-tunnel assets for Windows Server, and the latest direct matrix on the current machine is `7/7 usable`. This phase prepares honest Windows Server handoff; it does not falsely claim that the cutover has already happened.

Plans:
- [x] `10.6.1.2-01-PLAN.md` - Windows browser block runtime contract, deployment assets, and logon-autostart shape
- [x] `10.6.1.2-02-PLAN.md` - reverse-tunnel/API integration, Windows Server handoff docs, and control-plane truth
- [x] `10.6.1.2-03-PLAN.md` - direct seven-worker matrix, flakiness classification, and readiness verdict

### Phase 10.6.1.2.1: Local-machine rollout smoke confidence (INSERTED)

**Goal:** Capture one honest local-machine rollout-confidence snapshot on top of the current seven-worker `compact visible` baseline, so the operator can tell whether this PC is still usable for real chat traffic while the dedicated Windows browser block deployment is paused.
**Requirements**: LSMOKE-01, LSMOKE-02, LSMOKE-03
**Depends on:** Phase 10.5.1.1.1
**Plans:** 3 plans
**Current status:** Completed on 2026-03-30. This local-only confidence follow-up reran worker-by-worker smoke on the full seven-worker set, recorded one explicit matrix artifact, and documented how to rerun the same proof again. Follow-up phase `10.6.1.2.1.1` then restored the last two failing workers, so the local compact-visible pool became `7/7` usable at that moment. It does **not** replace the dedicated Windows browser block dependency for Phase 11.

**Success Criteria** (what must be TRUE):
  1. The operator has one repeatable local command that runs worker-by-worker `compact visible -> Temporary Chat -> GPT-5.4 Thinking -> relay` proof across all seven local workers.
  2. The latest local smoke result is recorded as a worker matrix with explicit `usable` / `unusable` truth instead of relying on memory or one-off terminal output.
  3. Internal operator docs explain how to rerun the local smoke path while the dedicated Windows browser block deployment remains paused or busy.

Plans:
- [x] `10.6.1.2.1-01-PLAN.md` - local smoke wrapper, seven-worker inventory, and operator rerun contract
- [x] `10.6.1.2.1-02-PLAN.md` - live seven-worker local compact-visible smoke matrix and artifact capture
- [x] `10.6.1.2.1-03-PLAN.md` - local confidence verdict, operator docs, and explicit note that server migration still remains separate

### Phase 10.6.1.2.1.1: Shared-2 and shared-4 bootstrap timeout analysis and mitigation (INSERTED)

**Goal:** Isolate why `shared-2` and `shared-4` time out during local `Temporary Chat` bootstrap, land a bounded mitigation if possible, and leave truthful tests and evidence even if one or both profiles still need manual recovery.
**Requirements**: BTMIT-01, BTMIT-02, BTMIT-03
**Depends on:** Phase 10.6.1.2.1
**Plans:** 3 plans
**Current status:** Completed on 2026-03-30. Wave 1 proved that both workers were landing on a blocking memory dialog instead of a dead profile. Wave 2 added a bounded bootstrap mitigation for dismissing that dialog and recognizing an aria-label-only `???????? ????????? ???` entry. Wave 3 reran both workers successfully, updated the local matrix to `7/7`, and closed this branch as mitigated rather than leaving it as vague flakiness.

**Success Criteria** (what must be TRUE):
  1. The project has one explicit explanation for the repeated `shared-2` and `shared-4` timeout branch, based on browser-surface evidence instead of guesswork.
  2. A bounded mitigation either restores one or both workers or records the exact remaining blocker branch in code and docs.
  3. Tests and verification artifacts cover the identified timeout/branch behavior so the same tail is not rediscovered from scratch.

Plans:
- [x] `10.6.1.2.1.1-01-PLAN.md` - capture browser-surface evidence and classify the repeated timeout branch
- [x] `10.6.1.2.1.1-02-PLAN.md` - implement bounded mitigation and add targeted bootstrap tests
- [x] `10.6.1.2.1.1-03-PLAN.md` - rerun shared-2/shared-4 proof, update matrix, and record final verdict

### Phase 10.6.1.2.2: Deployed Windows Server account-preserving stabilization and API cutover (INSERTED)

**Goal:** Safely evolve the already-deployed Windows Server browser block that now holds nine logged-in ChatGPT accounts, without treating it like a disposable host. The phase must establish a freeze point, reconcile deployed code against repo truth, stage any uplift through canary validation, and prepare a deliberate public API cutover path without risking mass account loss.
**Depends on:** Phase 10.6.1.2
**Requirements:** WSAFE-01, WSAFE-02, WSAFE-03, WSAFE-04
**Plans:** 3 plans
**Success Criteria** (what must be TRUE):
  1. The deployed Windows Server block is audited and version-mapped truthfully, and the repo has an explicit non-destructive operating contract for the nine live accounts.
  2. Any uplift from repo code to the deployed server is staged through freeze, backup, single-worker canary, and small-subset validation before the full nine-worker pool is touched.
  3. Public API enablement on that server has an explicit shadow/cutover/rollback path, and the phase ends with a truthful nine-worker matrix plus a preserve-vs-proceed verdict.
**Current status:** Completed on 2026-03-30 with a preserve-first hold verdict. The deployed Windows Server block now has a freeze-point audit, explicit backup/rollback contract, canary `shared-6` proof, subset `shared-5/shared-7` proof, and a locally proven shadow API path. The phase intentionally stops short of public promotion because the deployed host still shows `:4010 closed` and `80/443` currently resolve into a `Caddy` redirect path instead of a verified Windows-side relay edge.

Plans:
- [x] `10.6.1.2.2-01-PLAN.md` - deployed-server freeze point, version reconciliation, and non-destructive backup contract
- [x] `10.6.1.2.2-02-PLAN.md` - canary-safe runtime/API uplift path and explicit rollback controls
- [x] `10.6.1.2.2-03-PLAN.md` - staged nine-worker validation matrix, API cutover verdict, and operator handoff

### Phase 10.6.1.2.2.1: Windows Server public API activation and edge reconciliation (INSERTED)

**Goal:** Activate the deployed Windows Server public API edge safely by reconciling the current `Caddy`/`:4010` mismatch, proving a shadow path first, and only then deciding whether the public edge can be promoted without risking the 9 live accounts.
**Requirements**: WEDGE-01, WEDGE-02, WEDGE-03, WEDGE-04
**Depends on:** Phase 10.6.1.2.2
**Plans:** 3 plans

**Current status:** Executed on 2026-03-30 with verdict `hold_preserve_accounts`. The repo now contains preserve-first backup/audit/activate/rollback scripts and the public outside proof is explicit, but the deployed Windows Server still needs one direct host-level `Caddy` execution pass before a shadow canary and promoted-edge proof can happen safely.

**Success Criteria** (what must be TRUE):
  1. The deployed Windows Server edge has one explicit and backed-up truth source that says what owns `80/443`, what owns `4010`, and how to roll back safely.
  2. A shadow Windows-side API path can be proven locally and through the chosen edge path on one allowlisted canary worker before any broader public promotion is attempted.
  3. The phase ends with outside-client proof for `healthz`, `v1/models`, and one canary `v1/chat/completions` request, or with one precise preserve-first blocker verdict.

Plans:
- [x] `10.6.1.2.2.1-01-PLAN.md` - deployed Windows edge audit, backup, and preserve-first contract
- [x] `10.6.1.2.2.1-02-PLAN.md` - shadow edge activation, rollbackable Caddy reconciliation, and canary-safe scripts
- [x] `10.6.1.2.2.1-03-PLAN.md` - external proof, cutover verdict, and operator handoff

### Phase 10.6.1.2.2.1.1: Direct Windows Caddy edge cutover and canary proof (INSERTED)

**Goal:** Execute the already-prepared preserve-first Windows edge scripts directly on the deployed Windows Server, prove a shadow canary on `shared-6`, and then either prove or roll back the promoted `Caddy` path with outside-client evidence.
**Requirements**: WCUT-01, WCUT-02, WCUT-03, WCUT-04
**Depends on:** Phase 10.6.1.2.2.1
**Plans:** 3 plans

**Current status:** Completed on 2026-03-31 with verdict `safe_but_hold`. The direct Windows-host preserve-first pass is now done: backup/audit happened, shadow canary on `shared-6` passed, promoted HTTP proof passed, and the 9 live accounts were preserved. The remaining blocker is now narrow: Windows HTTPS/TLS still fails and one fully independent outside-NAT `POST /v1/chat/completions` proof is still missing.

**Success Criteria** (what must be TRUE):
  1. The deployed Windows Server has one direct host-level audit and backup pass that records the real `Caddy` service/config truth and exact rollback point before edge changes.
  2. A shadow `Caddy -> 127.0.0.1:4011` path is proven on allowlisted canary `shared-6` without broad-starting or relogging the remaining 9-account pool.
  3. The promoted `Caddy -> 127.0.0.1:4010` path is either proven end-to-end from outside clients or rolled back cleanly with one precise preserve-first blocker verdict.

Plans:
- [x] `10.6.1.2.2.1.1-01-PLAN.md` - direct Windows host audit, exact Caddy ownership, and preserve-first rollback point
- [x] `10.6.1.2.2.1.1-02-PLAN.md` - shadow canary execution and promoted cutover helper path on the deployed Windows host
- [x] `10.6.1.2.2.1.1-03-PLAN.md` - external proof, promoted-edge verdict, and Phase 11 unblock/hold decision

### Phase 10.6.1.2.2.1.1.1: Windows HTTPS and independent outside chat proof finalization (INSERTED)

**Goal:** Finish the public-edge story preserve-first by reconciling the Windows HTTPS/public-contract path and proving one truly independent outside-client chat call without endangering the already-preserved 9-account pool.
**Requirements**: WTLS-01, WTLS-02, WTLS-03, WTLS-04
**Depends on:** Phase 10.6.1.2.2.1.1
**Plans:** 3 plans

**Current status:** Completed on 2026-03-31 with verdict `hold_preserve_accounts`. The phase removed the final ambiguity, but not in the way we wanted: the preserved Windows edge still works locally, while the real public IP `77.66.186.75` currently lands on Ubuntu `nginx` and returns `404`. That means the remaining blocker is no longer TLS alone and no longer the browser accounts. It is now exact public-edge ownership and split-ingress reconciliation.

**Success Criteria** (what must be TRUE):
  1. The project knows the exact final public contract for the Windows edge, including whether HTTPS is truly supported now, intentionally deferred, or blocked by one exact deployed-host constraint.
  2. The already-working public HTTP edge is not destabilized while reconciling the final HTTPS/public path, and the 9-account pool remains preserve-first with canary-only proof on `shared-6`.
  3. One truly independent outside-client `POST /v1/chat/completions` either succeeds through the final public edge or reduces the remaining uncertainty to one exact blocker that explicitly controls whether Phase 11 can resume.

Plans:
- [x] `10.6.1.2.2.1.1.1-01-PLAN.md` - exact Windows-host TLS/public-contract truth, rollback point, and helper alignment
- [x] `10.6.1.2.2.1.1.1-02-PLAN.md` - bounded HTTPS/public-edge reconciliation and canary-safe proof path
- [x] `10.6.1.2.2.1.1.1-03-PLAN.md` - independent outside-client chat proof and final Phase 11 verdict

### Phase 10.6.1.2.2.1.1.1.1: Public edge ownership and split-ingress reconciliation (INSERTED)

**Goal:** Reconcile the exact owner of public `77.66.186.75` preserve-first, so the project stops guessing whether Ubuntu `nginx`, MikroTik ingress, or the preserved Windows `Caddy` host is responsible for the public API contract.
**Requirements**: PEDGE-01, PEDGE-02, PEDGE-03, PEDGE-04
**Depends on:** Phase 10.6.1.2.2.1.1.1
**Plans:** 3 plans

**Current status:** Completed on 2026-03-31 with verdict `hold_preserve_accounts`. The phase did exactly what it needed to do: it removed the last ownership ambiguity without touching the preserved 9-account browser block. Outside-client proof, Ubuntu-side config truth, and Windows-LAN `Caddy` truth now all agree that the real public IP is currently owned by Ubuntu `nginx`, while Windows `Caddy` remains only a LAN-side edge. The blocker is therefore now exact: `split_ingress_owner_conflict`.

**Success Criteria** (what must be TRUE):
  1. The project has one explicit ownership map for public `77.66.186.75` across MikroTik/NAT, Ubuntu `nginx`, and the preserved Windows `Caddy` host.
  2. One deliberate public owner path is either reconciled preserve-first or reduced to one exact upstream blocker without broad intervention on the 9 live accounts.
  3. Canary `shared-6` proof confirms the final owner serves `healthz`, `v1/models`, and one worker-backed chat path, or the phase records one exact non-runtime blocker that still controls `Phase 11`.

Plans:
- [x] `10.6.1.2.2.1.1.1.1-01-PLAN.md` - ownership audit across public IP, Ubuntu responder, Windows edge, and current ingress chain
- [x] `10.6.1.2.2.1.1.1.1-02-PLAN.md` - preserve-first deliberate-owner reconciliation and canary-safe public contract proof
- [x] `10.6.1.2.2.1.1.1.1-03-PLAN.md` - independent outside verification, final verdict, and Phase 11 unblock/hold decision

### Phase 10.6.1.2.2.1.1.1.1.1: Ubuntu public owner reassignment and Windows edge unification (INSERTED)

**Goal:** Keep Ubuntu as the deliberate public owner of `77.66.186.75`, reassign the conflicting owner path preserve-first, and unify the Windows public API edge behind that owner without risking the preserved 9-account browser block.
**Requirements**: UOWN-01, UOWN-02, UOWN-03, UOWN-04
**Depends on:** Phase 10.6.1.2.2.1.1.1.1
**Plans:** 3 plans

**Current status:** Completed on 2026-03-31 with `safe_to_promote`. Ubuntu stayed the deliberate public owner, the conflicting raw-IP `ascii-art` path was removed, the Windows API edge is now unified behind Ubuntu over LAN HTTP with forced `Host: 77.66.186.75`, and outside canary proof on `shared-6` now passes on `healthz`, `v1/models`, and real chat.

**Success Criteria** (what must be TRUE):
  1. Ubuntu becomes the deliberate public owner of `77.66.186.75` for the API contract without breaking unrelated Ubuntu hostname-based sites.
  2. The Windows API edge is unified behind that owner path without exposing raw `4040`, worker-agent ports, or raw public `:4010`.
  3. Canary `shared-6` proves the unified public path on `healthz`, `v1/models`, and one worker-backed chat call, or the phase reduces failure to one exact blocker that explicitly controls `Phase 11`.

Plans:
- [x] `10.6.1.2.2.1.1.1.1.1-01-PLAN.md` - owner strategy, rollback-safe Ubuntu assets, and repo-backed unification path
- [x] `10.6.1.2.2.1.1.1.1.1-02-PLAN.md` - preserve-first Ubuntu owner reassignment and canary `shared-6` proof
- [x] `10.6.1.2.2.1.1.1.1.1-03-PLAN.md` - outside verification, final verdict, and Phase 11 unblock/hold decision

### Phase 10.4: Alternate desktop auth and bootstrap stabilization (INSERTED)

**Goal:** Stabilize alternate-desktop auth recovery and fresh-chat bootstrap enough to produce at least one rollout-ready worker on the selected non-visible native runtime.
**Requirements**: ADST-01, ADST-02, ADST-03
**Depends on:** Phase 10.3
**Plans:** 3 plans

**Current status:** Executed on 2026-03-29. Wave 1 separated bootstrap truth from relay truth, Wave 2 added composer-gated bootstrap plus validation-pending admin semantics, and Wave 3 recorded a negative unblock decision: `dad -> auth_required@auth_check`, `wife -> bootstrap_navigation_failed@navigation`, `shared-1 -> bootstrap_navigation_failed@navigation`.
**Success Criteria** (what must be TRUE):
  1. At least one alternate-desktop worker completes visible auth or uses an already-valid profile, returns to non-visible runtime, and remains routable without routine visible browser windows.
  2. Fresh-chat bootstrap on the selected runtime survives the current `Temporary Chat` confirmation and composer-unlock path well enough for at least one worker to record `phase11Ready=true`.
  3. Control-plane and operator evidence distinguish auth recovery failure from bootstrap drift clearly enough that Phase 11 can resume or stay blocked on written proof instead of guesswork.

Plans:
- [x] `10.4-01-PLAN.md` - bootstrap truth, worker diagnostics, and control-plane evidence separation
- [x] `10.4-02-PLAN.md` - alternate-desktop auth and `Temporary Chat` bootstrap stabilization
- [x] `10.4-03-PLAN.md` - bounded proof, operator docs, and explicit Phase 11 unblock decision

### Phase 10.5: Alternate desktop navigation rescue and auth renewal (INSERTED)

**Goal:** Rescue the selected `alternate_desktop` runtime one more time by fixing the current navigation/bootstrap tail on non-auth workers, giving `dad` a first-class auth-renewal validation path, and ending with a written unblock-or-stay-blocked decision for Phase 11.
**Requirements**: ADNR-01, ADNR-02, ADNR-03
**Depends on:** Phase 10.4
**Plans:** 3 plans

**Current status:** Executed on 2026-03-29. Wave 1 landed bounded navigation rescue with branch-level evidence, Wave 2 moved non-visible validation into host-controller/control-api/internal admin, and Wave 3 produced the first proof-backed passing worker on `wife`. That one-off success is now historical evidence only: Phase 10.5.1 re-gated rollout because repeatability was not proven.
**Success Criteria** (what must be TRUE):
  1. At least one non-auth-blocked alternate-desktop worker can escape the current `bootstrap_navigation_failed` tail and reach usable fresh-chat bootstrap or full `phase11Ready=true`.
  2. `dad` can move through visible auth, return to `alternate_desktop`, and be revalidated through a control-plane path instead of staying only as `bootstrap_auth_required`.
  3. Phase 10.5 ends with a worker-by-worker written decision that either names a `phase11Ready=true` worker or keeps Phase 11 blocked with an explicit remaining tail.

Plans:
- [x] `10.5-01-PLAN.md` - alternate-desktop navigation rescue ladder and worker-agent evidence hardening
- [x] `10.5-02-PLAN.md` - host-controller/control-api validation wiring and dad auth-renewal flow
- [x] `10.5-03-PLAN.md` - bounded rescue proof, operator docs, and final Phase 11 unblock decision

### Phase 10.5.1: Repeatable alternate desktop stability gate (INSERTED)

**Goal:** Prove that at least one alternate-desktop worker remains repeatably usable across consecutive non-visible validations, instead of relying on a one-off successful pass.
**Requirements**: RSG-01, RSG-02, RSG-03
**Depends on:** Phase 10.5
**Plans:** 3 plans

**Current status:** Executed on 2026-03-29 with a negative repeatability decision. Validation is now deterministic and the repeatability gate is visible, but the repeated live proof ended with `wife -> bootstrap_navigation_failed@navigation` twice in a row, `dad -> bootstrap_auth_required@auth_check`, and `shared-1 -> bootstrap_navigation_failed@navigation`.
**Success Criteria** (what must be TRUE):
  1. Validation and proof can target one named worker deterministically, without assignment-timeout noise from the shared pool.
  2. At least one worker reaches a repeatable gate of two consecutive non-visible validation passes with a real relay success, and that gate resets on failure.
  3. Operator/admin state and milestone artifacts distinguish a one-off passing worker from a repeatably stable worker, so Phase 11 only resumes from repeated proof.

Plans:
- [x] `10.5.1-01-PLAN.md` - targeted validation isolation and worker-pinned proof path
- [x] `10.5.1-02-PLAN.md` - repeatability gate state, counters, and operator truth
- [x] `10.5.1-03-PLAN.md` - bounded repeated proof, docs, and final unblock decision

### Phase 10.5.1.1: Alternate desktop repeatability rescue (INSERTED)

**Goal:** Rescue alternate-desktop repeatability one more time by fixing the current navigation-bootstrap tail on non-auth workers, turning `dad` auth renewal into a control-plane path, and ending with a fresh repeated proof instead of recycling old success.
**Requirements**: ADRR-01, ADNR-02, RSG-02
**Depends on:** Phase 10.5.1
**Plans:** 3 plans

**Current status:** Executed on 2026-03-29 with a negative unblock decision. `wife` durable proof still failed twice at `bootstrap_navigation_failed @ navigation`, `shared-1` matched the same tail, and `dad` remained `bootstrap_auth_required @ auth_check`. One temporary fresh-profile diagnostic on `wife` confirmed that visible auth still works and reaches `Temporary Chat` with `GPT-5.4 Thinking`, but the same profile still failed after the alternate-desktop hand-off.
**Success Criteria** (what must be TRUE):
  1. At least one non-auth-blocked alternate-desktop worker (`wife` or `shared-1`) can exit the current `bootstrap_navigation_failed @ navigation` tail through a bounded rescue ladder instead of immediately failing at navigation.
  2. `dad` can move through visible auth renewal and return to alternate-desktop validation through internal admin and control-plane routes, not only via manual PowerShell recovery.
  3. The phase ends with a fresh repeated proof that either names one `stable (2/2)` worker or keeps Phase 11 blocked with precise branch-level evidence.

Plans:
- [x] `10.5.1.1-01-PLAN.md` - alternate-desktop navigation rescue ladder and bootstrap branch evidence
- [x] `10.5.1.1-02-PLAN.md` - dad auth-renewal control-plane path and operator truth
- [x] `10.5.1.1-03-PLAN.md` - repeated rescue proof, docs, and final Phase 11 unblock decision

### Phase 10.5.1.1.1: Compact visible runtime rollout and crash-restore popup hardening (INSERTED)

**Goal:** Formalize compact visible runtime as the current rollout fallback, harden startup/stop against Edge crash-restore popups, and prove whether this path is stable enough to resume rollout-smoke work.
**Requirements**: CVRT-01, CVRT-02, CVRT-03
**Depends on:** Phase 10.5.1.1
**Plans:** 3 plans

**Current status:** Completed on 2026-03-29. Compact visible is now the formal rollout fallback, popup-safe lifecycle is explicit, and fresh worker-by-worker proof passed on the official six-worker pool.

**Success Criteria** (what must be TRUE):
  1. Compact visible runtime is a first-class operator/runtime path with small corner-window placement and truthful worker/runtime reporting instead of an ad-hoc emergency mode.
  2. Browser start and stop flows suppress the `Restore pages` crash bubble without wiping durable login state or forcing manual cleanup after each run.
  3. The phase ends with written proof that compact visible runtime provides a real rollout baseline for Phase 11.

Plans:
- [x] `10.5.1.1.1-01-PLAN.md` - compact-visible runtime and operator/control-plane formalization
- [x] `10.5.1.1.1-02-PLAN.md` - official worker-pool rollout and crash-restore popup hardening
- [x] `10.5.1.1.1-03-PLAN.md` - compact-visible proof, docs, and fresh Phase 11 decision

### Phase 10.3: Alternative non-visible native browser runtime design (INSERTED)

**Goal:** Design and prove a replacement same-session non-visible native browser runtime that keeps routine ChatGPT windows off the operator's main desktop without falling back to the rejected headless or Docker/Xvfb paths.
**Requirements**: NVRT-01, NVRT-02, NVRT-03
**Depends on:** Phase 10.2
**Plans:** 3 plans

**Success Criteria** (what must be TRUE):
  1. The project has one concrete replacement runtime path for steady-state use, based on a same-session alternate Windows desktop rather than the rejected `hidden_runtime` or `docker_headed_xvfb` paths.
  2. Internal operator flows can move a worker from `visible_auth` into that replacement runtime explicitly and report it truthfully.
  3. Phase 10.3 ends with a live accept/reject runtime decision that either unblocks Phase 11 or keeps it blocked with fresh evidence.

**Completed:** 2026-03-28
**Current status:** Completed with decision `keep_phase_11_blocked_pending_alternate_desktop_followup`. `host_alternate_desktop` is now the leading non-visible native direction, but no worker produced `phase11Ready=true`; live evidence includes `dad -> bootstrap_auth_required`, `wife -> temporary_confirmation_not_found`, and `shared-1 -> assignment timeout`.

Plans:
- [x] `10.3-01-PLAN.md` - alternate-desktop launcher contract and worker runtime foundation
- [x] `10.3-02-PLAN.md` - host-controller, control-api, and internal admin integration for the new runtime
- [x] `10.3-03-PLAN.md` - bounded live proof, operator docs, and final runtime decision artifact

### Phase 10.1: Hidden runtime after manual login (INSERTED)

**Goal:** Split host-native workers into an explicit visible-auth path and a hidden steady-state path so manual ChatGPT login stays interactive, but routine household use no longer opens browser windows on the operator desktop.
**Requirements:** HIDE-01, HIDE-02, HIDE-03
**Depends on:** Phase 10
**Plans:** 3 plans

**Success Criteria** (what must be TRUE):
  1. Operator can start one host worker in visible auth mode for manual login or reauthentication and then switch that same durable profile into hidden runtime.
  2. Pool start and routine relay use hidden runtime by default and do not open visible browser windows on the desktop.
  3. If hidden runtime later reports `reauth_required` or `bootstrap_auth_required`, the system never silently reopens windows and instead surfaces manual-reauth plus runtime-reliability-review status clearly.

**Completed:** 2026-03-28
**Current status:** Runtime split, operator controls, and hidden-runtime validation tooling are complete. The next live step is to run the new hidden-runtime probe during rollout smoke confidence.

Plans:
- [x] `10.1-01-PLAN.md` - Runtime split in host-controller, scripts, and worker-agent
- [x] `10.1-02-PLAN.md` - control-api visibility, manual-auth transitions, and internal admin controls
- [x] `10.1-03-PLAN.md` - hidden-runtime validation probe, operator docs, and reliability review rules

### Phase 10.2: Hidden runtime reliability review and alternative browser runtime decision (INSERTED)

**Goal:** Decide, with live evidence, whether the current hidden/headless runtime can be stabilized for ChatGPT household use or whether v1.2 must pivot to a more reliable non-visible browser runtime before rollout confidence work continues.
**Requirements**: RREV-01, RREV-02, RREV-03
**Depends on:** Phase 10.1
**Plans:** 3 plans

**Success Criteria** (what must be TRUE):
  1. The project has a clear evidence-backed answer on whether the current hidden runtime is viable after manual login on durable profiles.
  2. Control-plane status for pool and workers is trustworthy enough that rollout decisions are not made on false `ready` or stale `idle` signals.
  3. If the current hidden runtime is not viable, the milestone has a concrete alternative browser runtime decision before Phase 11 proceeds.

**Completed:** 2026-03-28
**Current status:** Completed with decision `block_phase_11_pending_new_runtime_design`. Current host hidden runtime produced challenge or startup-failure evidence, and the explicit `docker_headed_xvfb` candidate also returned `bootstrap_challenge_detected` on live bootstrap. Phase 11 must wait for a follow-up runtime design phase.

Plans:
- [ ] `10.2-01-PLAN.md` - truthful pool and worker state instead of false ready/idle signals
- [ ] `10.2-02-PLAN.md` - challenge-classified evidence path and one bounded hidden-runtime rescue attempt
- [ ] `10.2-03-PLAN.md` - Docker/Xvfb alternative runtime candidate and final runtime decision artifact

### Phase 11: Rollout smoke confidence

**Goal:** Give the operator a repeatable confidence check before the household begins using the pool after changes or drift.
**Depends on:** Phase 10.6.1.2.2.1.1.1
**Requirements:** CONF-01, CONF-02
**Success Criteria** (what must be TRUE):
  1. Operator can run a repeatable smoke flow that covers readiness, fresh-chat bootstrap, and at least one live relay.
  2. The latest smoke result is visible in operator surfaces or logs without digging through raw process output.
  3. The rollout confidence path is documented clearly enough that it can be rerun whenever ChatGPT UI drift is suspected.
**Current status:** Completed on 2026-03-31 with verdict `hold_rollout`. Wave 1 added the repeatable `test-rollout-smoke.ps1` wrapper plus rerun docs, Wave 2 added the file-backed latest-smoke route and internal admin surface, and Wave 3 ran the real smoke on the deployed Windows browser-block host. The public canary on `shared-6` passed and the operator surface matched the same latest result, but household use remains held because the readiness snapshot stayed degraded at `0/9 ready` and `9/9 disconnected`.

## Progress

**Execution Order:**
Current milestone execution order: 9 -> 10 -> 10.1 -> 10.2 -> 10.3 -> 10.4 -> 10.5 -> 10.5.1 -> 10.5.1.1 -> 10.5.1.1.1 -> 10.6 -> 10.6.1 -> 10.6.1.1 -> 10.6.1.2 -> 10.6.1.2.2 -> 10.6.1.2.2.1 -> 10.6.1.2.2.1.1 -> 11 -> 12 -> 13 -> 14 -> 15 -> 16 -> 17 -> 18

| Phase | Requirements | Status | Completed |
|-------|--------------|--------|-----------|
| 9. Internal host-pool orchestration | ORCH-01, ORCH-02, ORCH-03 | Complete | 2026-03-28 |
| 10. ChatGPT UI drift hardening | STAB-01, STAB-02, STAB-03 | Complete | 2026-03-29 |
| 10.6 Remote server deployment, autostart, and external relay API | REMOTE-01, REMOTE-02, REMOTE-03, REMOTE-04 | Complete | 2026-03-29 |
| 10.6.1 Remote relay server verification and public API readiness | EXTAPI-01, EXTAPI-02, EXTAPI-03, EXTAPI-04 | Complete | 2026-03-29 |
| 10.6.1.1 MikroTik public ingress and NAT hardening | MTIK-01, MTIK-02, MTIK-03, MTIK-04 | Complete | 2026-03-29 |
| 10.1 Hidden runtime after manual login | HIDE-01, HIDE-02, HIDE-03 | Complete | 2026-03-28 |
| 10.2 Hidden runtime reliability review and alternative browser runtime decision | RREV-01, RREV-02, RREV-03 | Complete | 2026-03-28 |
| 10.3 Alternative non-visible native browser runtime design | NVRT-01, NVRT-02, NVRT-03 | Complete | 2026-03-28 |
| 10.4 Alternate desktop auth and bootstrap stabilization | ADST-01, ADST-02, ADST-03 | Partial | 2026-03-29 |
| 10.5 Alternate desktop navigation rescue and auth renewal | ADNR-01, ADNR-02, ADNR-03 | Partial | 2026-03-29 |
| 10.5.1 Repeatable alternate desktop stability gate | RSG-01, RSG-02, RSG-03 | Partial | 2026-03-29 |
| 10.5.1.1 Alternate desktop repeatability rescue | ADRR-01, ADNR-02, RSG-02 | Partial | 2026-03-29 |
| 10.5.1.1.1 Compact visible runtime rollout and crash-restore popup hardening | CVRT-01, CVRT-02, CVRT-03 | Complete | 2026-03-29 |
| 10.6.1.2 Dedicated Windows browser block deployment | WINBLK-01, WINBLK-02, WINBLK-03, WINBLK-04 | Complete | 2026-03-30 |
| 10.6.1.2.2 Deployed Windows Server account-preserving stabilization and API cutover | WSAFE-01, WSAFE-02, WSAFE-03, WSAFE-04 | Complete (hold verdict) | 2026-03-30 |
| 10.6.1.2.2.1 Windows Server public API activation and edge reconciliation | WEDGE-01, WEDGE-02, WEDGE-03, WEDGE-04 | Partial | 2026-03-30 |
| 10.6.1.2.2.1.1 Direct Windows Caddy edge cutover and canary proof | WCUT-01, WCUT-02, WCUT-03, WCUT-04 | Complete (`safe_but_hold`) | 2026-03-31 |
| 10.6.1.2.2.1.1.1.1 Public edge ownership and split-ingress reconciliation | PEDGE-01, PEDGE-02, PEDGE-03, PEDGE-04 | Complete (`hold_preserve_accounts`) | 2026-03-31 |
| 11. Rollout smoke confidence | CONF-01, CONF-02 | Complete (`hold_rollout`) | 2026-03-31 |
| 12. Deployed Windows browser-block readiness recovery and reconnect stabilization | WREC-01, WREC-02, WREC-03, WREC-04 | Complete (`hold_rollout`) | 2026-03-31 |
| 13. Deployed Windows post-recovery smoke regression investigation and stabilization | WREG-01, WREG-02, WREG-03, WREG-04 | Complete (`hold_rollout`) | 2026-03-31 |
| 14. Deployed Windows zero-ready post-recovery baseline and public-canary 502 root-cause investigation | WROOT-01, WROOT-02, WROOT-03, WROOT-04 | Complete (`root_cause_confirmed`) | 2026-03-31 |
| 15. Deployed Windows disconnected baseline and forced-host edge remediation | WREM-01, WREM-02, WREM-03, WREM-04 | Complete (`hold_rollout`) | 2026-04-01 |
| 16. Deployed Windows runtime parity sync and post-remediation degraded smoke stabilization | WPAR-01, WPAR-02, WPAR-03, WPAR-04 | Complete (`hold_rollout`) | 2026-04-01 |
| 17. Deployed Windows post-stabilization degraded runtime and repeated public-canary 502 investigation | WRTI-01, WRTI-02, WRTI-03, WRTI-04 | Complete (`runtime_blocker_confirmed`) | 2026-04-01 |
| 18. Deployed Windows disconnected runtime remediation, forced-host edge repair, and runtime parity resync | WREP-01, WREP-02, WREP-03, WREP-04 | Complete (`hold_rollout`) | 2026-04-01 |
| 19. Deployed Windows persistent disconnected runtime and forced-host public-502 remediation follow-up | WFUP-01, WFUP-02, WFUP-03, WFUP-04 | Complete (`hold_rollout`) | 2026-04-01 |
| 20. Deployed Windows runtime parity backport and persistent disconnected-runtime public-502 remediation | WPARB-01, WPARB-02, WPARB-03, WPARB-04 | Complete (`hold_rollout`) | 2026-04-01 |
| 21. Deployed Windows disconnected runtime and windows_edge_forced_host public-owner 502 remediation after parity-clean proof | WPCP-01, WPCP-02, WPCP-03, WPCP-04 | Complete (`hold_rollout`) | 2026-04-01 |
| 22. Deployed Windows post-phase21 disconnected runtime and windows_edge_forced_host public-owner 502 remediation follow-up | WPFU-01, WPFU-02, WPFU-03, WPFU-04 | Complete (`hold_rollout`) | 2026-04-01 |
| 23. Deployed Windows post-phase22 smoke-wrapper parity recovery and persistent disconnected-runtime forced-host public-owner 502 remediation | WSPR-01, WSPR-02, WSPR-03, WSPR-04 | Complete (`hold_rollout`) | 2026-04-02 |
| 24. Deployed Windows post-phase23 exact smoke-wrapper compat backport and persistent disconnected-runtime forced-host public-owner 502 remediation | WSCB-01, WSCB-02, WSCB-03, WSCB-04 | Complete (`hold_rollout`) | 2026-04-02 |
| 25. Deployed Windows post-phase24 live-fix smoke-wrapper backport and persistent disconnected-runtime forced-host public-owner 503 remediation | WLFB-01, WLFB-02, WLFB-03, WLFB-04 | In Progress (`2/3`, live `25-03` pending) | 2026-04-12 |

## Current Status

- Active milestone: `v1.2 Rollout Stability`
- Current next action: run live `25-03` for Phase 25 on the deployed Ubuntu and Windows hosts
  - New live truth from 2026-04-12: the public API on `77.66.186.75` is already externally reachable through Ubuntu `nginx`, `healthz` returns `200`, `v1/models` returns `401` without a bearer token and `200` with a bearer token, and external chat now succeeds again after reverse SSH tunnels were restored
  - The real active topology is now `internet -> MikroTik -> Ubuntu nginx -> 127.0.0.1:4010`; the repo copy that still assumes `Ubuntu -> 192.168.88.250:80` is stale
  - The Windows host `192.168.88.250` no longer has an active `Caddy` edge in the live path: `80/443` do not listen there, `Get-Service *caddy*` returns no service, and `Get-Process caddy` returns no process
  - The actual live blocker that broke external chat was a dead reverse SSH tunnel from the Windows browser block to Ubuntu, not a broken public `nginx` path and not a broken MikroTik public ingress rule
  - After the tunnel recovery, Ubuntu again exposed `127.0.0.1:14021..14027` and `127.0.0.1:14040`, `readyz` returned `7/7 ready`, and the external chat smoke returned `200` with `ping-ok` on worker `shared-2`
  - Carry-forward debt from the completed smoke, recovery, remediation, and stabilization work: compact visible remains the official runtime fallback, the 9-account Windows block remains preserved, raw `4040`, worker-agent ports, and raw `:4010` stay private, public ownership is deliberately unified through Ubuntu, and the remaining rollout blocker is now the runtime itself rather than missing tooling or operator visibility
  - Phase 16 is now fully complete: the deployed host ran the parity-synced stabilization command, `GET /internal/post-remediation-degraded-smoke/latest` returned latest, `/internal/admin` showed the same stabilization surface, and the repo now also carries BOM-tolerant latest-state parsing after the live route surfaced one BOM issue in `latest.json`
  - Phase 17 is now fully complete: the deployed host ran the bounded runtime investigation, `GET /internal/post-stabilization-runtime-investigation/latest` returned latest, `/internal/admin` showed the same runtime-investigation surface, and the final verdict is `runtime_blocker_confirmed`
  - Phase 18 is now fully complete: the deployed host ran the live remediation harness, confirmed `GET /internal/disconnected-runtime-remediation/latest` plus `/internal/admin`, reran the exact Phase 11 smoke, and ended with final verdict `hold_rollout`
  - The final Phase 18 truth is explicit: remediation stayed `0/9 ready`, the final smoke settled at `after_settle` with pool `degraded` and only `1/9 ready`, and the public canary on `shared-6` still returned `502/502/502`
  - The repo now backports string-or-object `Worker.status` normalization into the runtime-critical Windows wrappers so the next archive no longer depends on the old `status.detail`-only assumption
  - Phase 19 is now fully complete: the deployed host overlaid the archive, restarted `control-api`, ran the live follow-up harness, confirmed `GET /internal/persistent-disconnected-runtime-followup/latest` plus `/internal/admin`, and reran the exact Phase 11 smoke with final verdict `hold_rollout`
  - The final Phase 19 truth is explicit: the follow-up stayed `0/9 -> 0/9 ready`, the dominant blocker remained `disconnected`, the first failing hop remained `windows_edge_forced_host`, the public owner still returned `502`, and the rerun smoke still ended at `after_settle` with only `1/9 ready`
  - The deployed host still needed compatibility restores in `probe-public-api.ps1`, `recover-browser-block-readiness.ps1`, `remediate-disconnected-runtime-and-forced-host-edge.ps1`, `remediate-persistent-disconnected-runtime-and-public-502.ps1`, `test-rollout-smoke.ps1`, and `test-host-worker-relay.ps1`; those raw runtime fixes are not yet synced back into this checkout verbatim
  - Phase 20 is now fully complete: the deployed host overlaid the parity-clean archive, restarted `control-api`, ran the live remediation harness, confirmed `GET /internal/runtime-parity-backport-remediation/latest` plus `/internal/admin`, and reran the exact Phase 11 smoke with final verdict `hold_rollout`
  - The final Phase 20 truth is explicit: remediation stayed `0/9 -> 0/9 ready`, the dominant blocker remained `disconnected`, the first failing hop remained `windows_edge_forced_host`, both forced-host plus public-owner checks stayed red, and the rerun smoke still ended at `after_settle` with only `1/9 ready` and public canary `502/502/502`
  - Unlike the earlier follow-up phases, the live Phase 20 run did not report any new post-overlay server-only compatibility restore after the archive overlay, so repo/runtime parity is now proven for this wrapper chain even though rollout remains held
  - Phase 21 is now fully complete: the deployed host overlaid the archive, restarted `control-api`, ran the exact post-parity remediation harness, confirmed both `GET /internal/post-parity-disconnected-runtime-remediation/latest` and `/internal/admin`, and reran the exact Phase 11 smoke
  - The final Phase 21 truth is explicit: remediation stayed `0/9 -> 0/9 ready`, the dominant blocker stayed `disconnected`, the first failing hop stayed `windows_edge_forced_host`, both forced-host plus public-owner checks stayed red, and the rerun smoke still ended at `after_settle` with only `1/9 ready` plus public canary `502/502/502`
  - The smoke rerun required restoring `test-rollout-smoke.ps1` to a probe-compatible call scheme because the checkpoint archive only contained Phase 21 checkpoint artifacts; the repo now backports a guard so the smoke wrapper no longer crashes when the probe payload omits `chatCompletions`
- Phase 22 is now fully complete: the deployed host overlaid the archive, restarted `control-api`, ran the exact post-Phase-21 follow-up harness, confirmed `GET /internal/post-phase21-disconnected-runtime-followup/latest` plus `/internal/admin`, and reran the exact Phase 11 smoke with final verdict `hold_rollout`
- The final Phase 22 truth is explicit: the follow-up stayed `0/9 -> 0/9 ready`, the dominant blocker stayed `disconnected`, the first failing hop stayed `windows_edge_forced_host`, `loopbackStatus` stayed green while forced-host plus public-owner stayed red, and the rerun smoke still ended at `after_settle` with only `1/9 ready` plus public canary `502/502/502`
- The successful smoke rerun used the current server-working `test-rollout-smoke.ps1` because the checkpoint archive `phase22-live-followup-checkpoint-sync-20260401-224716.zip` carried a stale smoke-wrapper copy; that raw smoke-wrapper diff is not synced back verbatim into this checkout
- Phase 23 is now fully complete: the deployed host overlaid the archive, restarted `control-api`, ran the exact parity-remediation harness, confirmed `GET /internal/post-phase22-smoke-wrapper-parity-remediation/latest` plus `/internal/admin`, and reran the exact Phase 11 smoke with final verdict `hold_rollout`
- Phase 24 local Waves 1-2 are now complete: the repo backports the exact smoke-wrapper compat marker into the smoke-critical chain, ships the canonical Phase 24 remediation harness, serves `GET /internal/post-phase23-exact-smoke-wrapper-compat-remediation/latest`, and renders the same latest artifact in `/internal/admin`
- Local Phase 24 verification is green before the live handoff: PowerShell parser checks passed, `npm.cmd --prefix services/control-api test` passed with `28` files and `122` tests, and `npm.cmd --prefix services/control-api run build` passed
- Phase 24 live remediation is now also complete on `192.168.88.250`: the archive was overlaid, `control-api` restarted, the exact remediation command wrote `24-COMPAT-REMEDIATION-SUMMARY.json/.md`, and both `GET /internal/post-phase23-exact-smoke-wrapper-compat-remediation/latest` plus `/internal/admin` matched the live artifact
- The live Phase 24 remediation still needed post-overlay compatibility restores in `probe-public-api.ps1`, `recover-browser-block-readiness.ps1`, `test-rollout-smoke.ps1`, `remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1`, `remediate-post-phase23-exact-smoke-wrapper-compat-and-persistent-disconnected-runtime.ps1`, and `test-host-worker-relay.ps1`, so the exact smoke rerun must use the current server-working copy and Phase 24 is not ready for closeout yet
- Phase 24 is now fully complete: the deployed host reran the exact smoke on the current Phase 24-compatible server-working `test-rollout-smoke.ps1`, and the final truth stayed negative at `after_settle`, pool `degraded`, `1/9 ready`, and public canary `503/503/503`
- Phase 24 closed with a truthful negative compat verdict: the remediation artifact stayed `archive_chain_ready`, but the smoke rerun still depended on post-overlay live fixes, so exact compat backport is still unresolved and rollout remains held

## Next Up

- keep rollout preserve-first and avoid widening beyond the bounded canary path while reverse tunnels remain a runtime-critical dependency for external chat
- execute Phase 25 next, because the remaining work is now narrow: backport the exact live reverse-tunnel and topology fixes, then rerun authenticated external smoke on the current canonical public path
- treat the recovered external API as fixed input: public `77.66.186.75` already works through Ubuntu `nginx -> 127.0.0.1:4010`, so do not reopen the retired Windows `Caddy` edge branch unless fresh evidence forces it
- use the completed Phase 24 truth plus the new tunnel recovery evidence as the baseline and target durable external readiness rather than another broad public-edge investigation
- keep the repo and deployment assets aligned with the real live path so the next overlay does not silently roll the tunnel fix or the Ubuntu-local upstream backward

### Phase 12: Deployed Windows browser-block readiness recovery and reconnect stabilization

**Goal:** Explain and recover the degraded `0/9 ready`, `9/9 disconnected` snapshot on the preserve-first Windows browser-block host, then rerun the proven rollout smoke to decide whether household rollout can resume.
**Depends on:** Phase 11
**Requirements**: WREC-01, WREC-02, WREC-03, WREC-04
**Success Criteria** (what must be TRUE):
  1. Operator can capture one preserve-first recovery snapshot that names exact worker blocker classes instead of another opaque disconnected count.
  2. Bounded reconnect work can keep recovered workers running without profile deletion, cookie clearing, blind full-pool restart, or mass relogin as the default path.
  3. The latest readiness-recovery result is visible in an operator surface or durable file-backed artifact before rollout-smoke reruns.
  4. The phase ends with a rerun of the proven Phase 11 smoke and one explicit verdict about whether rollout can resume or remains held by named workers.
**Current status:** Completed on 2026-03-31 with verdict `hold_rollout`. Wave 1 added the preserve-first recovery wrapper and artifact contract, Wave 2 added the file-backed latest-recovery route plus internal admin visibility, and Wave 3 ran the live recovery plus the required post-recovery smoke rerun on the deployed Windows host. The recovery artifact proved `recovered` with `9/9 ready`, but the rerun smoke still regressed the snapshot to `0/9 ready` and `9/9 disconnected`, so household rollout remains held.
**Plans:** 3 plans

Plans:
- [x] `12-01-PLAN.md` - preserve-first readiness-recovery wrapper plus docs and artifact contract
- [x] `12-02-PLAN.md` - file-backed latest-recovery route and internal admin visibility
- [x] `12-03-PLAN.md` - live deployed-host recovery, smoke rerun, and final rollout verdict

### Phase 13: Deployed Windows post-recovery smoke regression investigation and stabilization

**Goal:** Explain why the recovered `9/9 ready` Windows pool still regresses during the post-recovery smoke path, bring the repo and deployed-host script behavior back into parity, and prove whether one bounded stabilization mode keeps the preserve-first pool healthy through smoke.
**Requirements**: WREG-01, WREG-02, WREG-03, WREG-04
**Depends on:** Phase 12
**Success Criteria** (what must be TRUE):
  1. Operator can capture one durable stage-by-stage artifact that shows how the pool moves from recovery into smoke, including the exact first regression stage instead of only the final `0/9 ready`, `9/9 disconnected` snapshot.
  2. The repo copy of the relay, recovery, and smoke scripts is explicit enough to match the deployed-host execution path, so Phase 13 evidence is not based on hidden script drift.
  3. The latest post-recovery regression/stabilization result is visible in an operator surface or durable file-backed artifact before any new rollout claim.
  4. The phase ends with one explicit verdict that says whether a bounded stabilization mode keeps the preserved nine-account pool healthy through smoke or whether rollout remains held by exact stage evidence.
**Current status:** Completed on 2026-03-31 with verdict `hold_rollout`. The deployed host wrote the Phase 13 regression artifacts and proved that this run never restored a healthy post-recovery baseline (`after_recovery = 0/9 ready`, `after_canary_start = 1/9 ready` on `shared-6` only, `after_settle = 0/9 ready`, public canary `502/502/502`). The final Phase 13 wrapper copies were synced back into the repo, the archive was redeployed to the host, `GET /internal/post-recovery-regression/latest` now returns `200`, and `/internal/admin` renders the same latest result, so the remaining blocker is runtime stability rather than hidden script drift or missing operator visibility.
**Plans:** 3 plans

Plans:
- [x] `13-01-PLAN.md` - stage-by-stage regression harness, compatibility contract, and repo-to-host sync docs
- [x] `13-02-PLAN.md` - file-backed latest regression route and internal admin visibility
- [x] `13-03-PLAN.md` - live deployed-host regression run, operator-surface confirmation, and final stabilization verdict

### Phase 14: Deployed Windows zero-ready post-recovery baseline and public-canary 502 root-cause investigation

**Goal:** Explain why the preserved deployed Windows pool can already be `0/9 ready` after the post-recovery path and identify the first failing hop in the later public-canary `502` branch, so the next rollout decision is grounded in exact root-cause evidence instead of another vague degraded snapshot.
**Requirements**: WROOT-01, WROOT-02, WROOT-03, WROOT-04
**Depends on:** Phase 13
**Plans:** 3 plans

**Current status:** Completed on 2026-03-31 with verdict `root_cause_confirmed`. Wave 3 ran on the deployed Windows browser-block host and made the remaining rollout blocker exact: the baseline stayed at `0/9 ready`, `9/9 disconnected`, `loopback_api` remained green with `200/200/200`, the first failing hop was `windows_edge_forced_host`, and the Ubuntu public owner `http://77.66.186.75` still returned `502` on `healthz`, `v1/models`, and `v1/chat/completions` with `Server: nginx/1.18.0 (Ubuntu)`. `GET /internal/zero-ready-root-cause/latest` and `/internal/admin` showed the same latest artifact, the canary `shared-6` was stopped again after the bounded probe, and the repo copy of `investigate-zero-ready-root-cause.ps1` now includes the named-parameter compat fix required by the deployed host.

**Success Criteria** (what must be TRUE):
  1. Operator can capture one durable zero-ready baseline artifact that names exact worker blocker classes instead of only saying `0/9 ready`.
  2. The public canary path records the first failing hop explicitly across Windows loopback API, Windows edge with forced public `Host`, and the Ubuntu public owner.
  3. The latest zero-ready root-cause result is visible in an internal operator surface or durable file-backed artifact before any new rollout claim.
  4. The phase ends with one explicit verdict that names the dominant blocker class plus the first failing hop, or honestly keeps rollout on hold if the evidence is still inconclusive.

Plans:
- [x] `14-01-PLAN.md` - zero-ready root-cause harness, hop-aware probe evidence, and repo-to-host sync contract
- [x] `14-02-PLAN.md` - file-backed latest root-cause route and internal admin visibility
- [x] `14-03-PLAN.md` - live deployed-host root-cause run, operator-surface confirmation, and final verdict

### Phase 15: Deployed Windows disconnected baseline and forced-host edge remediation

**Goal:** Restore the preserve-first nine-account Windows browser-block from the current disconnected zero-ready baseline, repair or explicitly reclassify the `windows_edge_forced_host` branch, and prove the result against a fresh rollout-smoke rerun instead of stopping at root-cause diagnosis.
**Requirements**: WREM-01, WREM-02, WREM-03, WREM-04
**Depends on:** Phase 14
**Plans:** 3 plans
**Current status:** Completed on 2026-04-01 with verdict `hold_rollout`. The live remediation run and operator-surface confirmation are both now proven on the deployed host, and the exact post-remediation Phase 11 smoke rerun also happened. The remediation artifact still held at `0/9 ready`, only `shared-6` temporarily recovered and passed `loopback_api`, `windows_edge_forced_host` remained `transport_error`, `ubuntu_public_owner` remained `502`, and the final smoke still settled at only `1/9 ready` with a degraded pool and public canary `502/502/502`.

**Success Criteria** (what must be TRUE):
  1. One preserve-first remediation flow can move the live host from the current `0/9 ready`, `9/9 disconnected` baseline into an explicit recovered-or-still-blocked snapshot without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin.
  2. The remediation artifact records the exact post-repair truth for both `windows_edge_forced_host` and the Ubuntu public owner instead of collapsing them back into one vague public `502`.
  3. The latest remediation result is visible through an internal operator surface before the smoke rerun begins.
  4. The phase ends with a rerun of the proven Phase 11 smoke and one explicit verdict `remediated_through_smoke` or `hold_rollout`.

Plans:
- [x] `15-01-PLAN.md` - preserve-first disconnected-baseline remediation harness, durable artifact contract, and repo-to-host sync docs
- [x] `15-02-PLAN.md` - file-backed latest-remediation route and internal admin visibility
- [x] `15-03-PLAN.md` - live deployed-host remediation run, smoke rerun, and final rollout verdict

### Phase 16: Deployed Windows runtime parity sync and post-remediation degraded smoke stabilization

**Goal:** Sync the deployed Windows host hotfixes back into the repo, restore repo-vs-runtime parity across `control-api` and the smoke/remediation wrappers, and prove whether one bounded post-remediation stabilization run can survive the degraded smoke contract.
**Requirements**: WPAR-01, WPAR-02, WPAR-03, WPAR-04
**Depends on:** Phase 15
**Plans:** 3 plans

**Current status:** Completed on 2026-04-01 with verdict `hold_rollout`. Wave 1 synced the runtime-critical PowerShell behavior back into the repo, stamped the explicit compatibility marker `phase16-runtime-parity-sync-v1`, added the canonical post-remediation degraded-smoke stabilization harness, and updated the exact sync docs. Wave 2 exposed the latest stabilization result in `control-api` and `/internal/admin`, added coverage for the new operator surface, and regenerated the runtime files that the deployed host actually runs from `dist`. Wave 3 overlaid the parity-synced archive onto the deployed host, restarted `control-api`, ran the bounded stabilization command, and confirmed `GET /internal/post-remediation-degraded-smoke/latest` plus `/internal/admin`. The final live truth still held rollout: pre-smoke ready was only `1/9`, final smoke ready fell to `0/9`, the pool remained `degraded`, and the public canary on `shared-6` again returned `502`. The live route also surfaced a BOM issue in `latest.json`, and the repo now backports BOM-tolerant latest-state parsing for future archives.

**Success Criteria** (what must be TRUE):
  1. The repo copy of the runtime-critical `control-api` and PowerShell files matches the deployed-host execution path closely enough that a new archive no longer depends on manual server-only hotfixes.
  2. The project can capture one durable post-remediation degraded-smoke stabilization artifact that records pre-smoke readiness, final smoke readiness, pool status, and public-canary truth instead of only another terminal `1/9 ready` note.
  3. The latest post-remediation degraded-smoke stabilization result is visible through an internal operator surface or durable file-backed artifact before any new rollout claim.
  4. The phase ends with one explicit verdict that says whether parity-synced bounded stabilization produced `stabilized_through_smoke` or whether rollout still remains `hold_rollout`.

Plans:
- [x] `16-01-PLAN.md` - runtime parity sync for the live PowerShell path, canonical stabilization harness, and repo-to-host sync docs
- [x] `16-02-PLAN.md` - file-backed latest stabilization route, admin visibility, and runtime build parity
- [x] `16-03-PLAN.md` - live parity-synced redeploy, bounded stabilization run, operator-surface confirmation, and final verdict

### Phase 17: Deployed Windows post-stabilization degraded runtime and repeated public-canary 502 investigation

**Goal:** Capture durable component-level runtime evidence for why the parity-synced deployed Windows host still collapses from `1/9 ready` to `0/9 ready` and why the repeated public canary on `shared-6` still ends in `502`, so the next remediation phase targets the real failing runtime layer instead of repeating smoke.
**Requirements**: WRTI-01, WRTI-02, WRTI-03, WRTI-04
**Depends on:** Phase 16
**Plans:** 3 plans
**Current status:** Completed on 2026-04-01 with verdict `runtime_blocker_confirmed`. Wave 1 added the canonical runtime-investigation harness plus the exact sync docs, Wave 2 exposed the latest runtime-investigation result in `control-api` and `/internal/admin`, and Wave 3 ran the live deployed-host investigation on `192.168.88.250`. The final truth is now explicit: baseline `0/9 ready`, temporary `1/9 ready` after canary `shared-6`, final `0/9 ready` after smoke and cleanup, dominant runtime blocker `disconnected`, first failing hop `windows_edge_forced_host`, and public `http://77.66.186.75` still returning `502` on `healthz`, `v1/models`, and `v1/chat/completions`.

**Success Criteria** (what must be TRUE):
  1. One durable artifact correlates post-stabilization ready-count transitions with host-controller truth, internal worker truth, and local listener/process evidence instead of only another degraded snapshot.
  2. The repeated public-canary `502` branch records the first failing hop together with canary runtime facts strongly enough to target the next remediation phase.
  3. The latest post-stabilization runtime investigation result is visible through an internal operator surface or durable file-backed artifact before any new remediation claim.
  4. The phase ends with one explicit verdict `runtime_blocker_confirmed` or `hold_rollout`.

Plans:
- [x] `17-01-PLAN.md` - canonical runtime-investigation harness, listener/process evidence, and repo-to-host sync docs
- [x] `17-02-PLAN.md` - file-backed latest runtime-investigation route and internal admin visibility
- [x] `17-03-PLAN.md` - live deployed-host runtime investigation, operator-surface confirmation, and final verdict

### Phase 18: Deployed Windows disconnected runtime remediation, forced-host edge repair, and runtime parity resync

**Goal:** Repair the confirmed `disconnected` runtime baseline and `windows_edge_forced_host` branch through one preserve-first remediation path, while syncing the latest deployed-host compatibility restores back into the repo before the next smoke-backed rollout verdict.
**Requirements**: WREP-01, WREP-02, WREP-03, WREP-04
**Depends on:** Phase 17
**Plans:** 3 plans

**Current status:** Completed on 2026-04-01 with verdict `hold_rollout`. Wave 1 synced the runtime-critical wrapper chain back to the repo under `phase18-runtime-remediation-v1`, added the canonical disconnected-runtime remediation harness, and updated the exact sync docs. Wave 2 added the file-backed latest-remediation route plus the matching `/internal/admin` section, extended coverage, and rebuilt the `dist` runtime that the deployed host serves. Wave 3 overlaid the archive on the deployed host, restarted `control-api`, ran the live remediation harness, confirmed the latest route plus admin section, and reran the exact Phase 11 smoke. The remediation still held at `0/9 ready`, the dominant blocker remained `disconnected`, the first failing hop remained `windows_edge_forced_host`, and the smoke still ended at `after_settle` with pool `degraded`, only `1/9 ready`, and a public canary `502/502/502`. The repo now also backports the string-or-object `Worker.status` compatibility that the deployed host had to restore during the smoke rerun.

**Success Criteria** (what must be TRUE):
  1. The repo copy of the runtime-critical PowerShell and `control-api` files matches the deployed-host execution path closely enough that the next remediation archive no longer depends on manual server-only compatibility fixes.
  2. One preserve-first remediation flow records before/after ready counts plus separate truth for `windows_edge_forced_host` and `ubuntu_public_owner` without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin.
  3. The latest disconnected-runtime remediation result is visible through an internal operator surface or durable file-backed artifact before the smoke rerun begins.
  4. The phase ends with a rerun of the proven Phase 11 smoke and one explicit verdict `remediated_through_smoke` or `hold_rollout`.

Plans:
- [x] `18-01-PLAN.md` - parity-resync for the runtime-critical wrapper chain, canonical remediation harness, and exact sync docs
- [x] `18-02-PLAN.md` - file-backed latest disconnected-runtime remediation route, admin visibility, and runtime build parity
- [x] `18-03-PLAN.md` - live parity-synced remediation run, smoke rerun, operator-surface confirmation, and final verdict

### Phase 19: Deployed Windows persistent disconnected runtime and forced-host public-502 remediation follow-up

**Goal:** Reuse the Phase 18 parity-clean wrapper chain for one narrower preserve-first follow-up that keeps the bounded canary alive through the runtime, forced-host, and public-owner checks, then reruns the exact smoke contract to decide whether the still-disconnected Windows host can finally stabilize.
**Requirements**: WFUP-01, WFUP-02, WFUP-03, WFUP-04
**Depends on:** Phase 18
**Plans:** 3 plans

**Current status:** Completed on 2026-04-01 with verdict `hold_rollout`. Wave 1 added the canonical persistent disconnected-runtime follow-up harness plus exact sync docs on top of the Phase 18 parity-clean chain. Wave 2 exposed the latest follow-up result in `control-api` and `/internal/admin`, added coverage, and rebuilt `dist`. Wave 3 overlaid the archive on the deployed Windows host, restarted `control-api`, ran the live follow-up harness, confirmed the latest route plus admin section, and reran the exact Phase 11 smoke. The final truth remained negative: the follow-up stayed `0/9 ready`, the dominant blocker remained `disconnected`, the first failing hop remained `windows_edge_forced_host`, the public owner still returned `502`, and the rerun smoke still ended at `after_settle` with only `1/9 ready` and public canary `502/502/502`. The deployed host also needed compatibility restores in `probe-public-api.ps1`, `recover-browser-block-readiness.ps1`, `remediate-disconnected-runtime-and-forced-host-edge.ps1`, `remediate-persistent-disconnected-runtime-and-public-502.ps1`, `test-rollout-smoke.ps1`, and `test-host-worker-relay.ps1`; those raw runtime fixes are not yet synced back into this checkout verbatim.

**Success Criteria** (what must be TRUE):
  1. One canonical preserve-first follow-up harness records the persistent disconnected-runtime branch and the forced-host/public-owner branch under one explicit compatibility version without reintroducing the old wrapper drift.
  2. One durable follow-up artifact records before/after ready counts plus separate truth for `windows_edge_forced_host` and `ubuntu_public_owner` without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin.
  3. The latest persistent disconnected-runtime follow-up result is visible through an internal operator surface or durable file-backed artifact before the smoke rerun begins.
  4. The phase ends with a rerun of the proven Phase 11 smoke and one explicit verdict `stabilized_through_smoke` or `hold_rollout`.

Plans:
- [x] `19-01-PLAN.md` - canonical persistent follow-up harness, durable artifact contract, and exact sync docs
- [x] `19-02-PLAN.md` - file-backed latest follow-up route, admin visibility, and runtime build parity
- [x] `19-03-PLAN.md` - live deployed-host follow-up run, smoke rerun, operator-surface confirmation, and final verdict

### Phase 20: Deployed Windows runtime parity backport and persistent disconnected-runtime public-502 remediation

**Goal:** Sync the exact deployed-host compatibility restores back into the repo, rerun one preserve-first remediation on that parity-clean chain, and decide whether the persistent disconnected-runtime plus public `502` branch can finally survive the proven smoke contract without server-only hotfixes.
**Requirements**: WPARB-01, WPARB-02, WPARB-03, WPARB-04
**Depends on:** Phase 19
**Plans:** 3 plans

**Current status:** Completed on 2026-04-01 with verdict `hold_rollout`. Wave 1 backported the six deployed-host compatibility restores into the repo under `phase20-runtime-parity-backport-v1`, added the canonical parity-clean remediation wrapper, and updated the exact sync docs. Wave 2 added the file-backed latest remediation route plus matching admin section to `control-api`, extended coverage, and rebuilt the `dist` runtime the deployed host actually starts. Wave 3 overlaid the parity-clean archive on `192.168.88.250`, restarted `control-api`, ran the exact remediation command, confirmed `GET /internal/runtime-parity-backport-remediation/latest` plus `/internal/admin`, and reran the exact Phase 11 smoke. The final truth remained negative: remediation stayed `0/9 -> 0/9 ready`, the dominant blocker remained `disconnected`, the first failing hop remained `windows_edge_forced_host`, both forced-host plus public-owner checks stayed red, and the rerun smoke still ended at `after_settle` with only `1/9 ready` and public canary `502/502/502`. Unlike the earlier follow-up phases, the live Phase 20 run did not report any new post-overlay server-only compatibility restore after the archive overlay, so this phase closes the repo/runtime parity loop even though rollout remains held.

**Success Criteria** (what must be TRUE):
  1. The repo copy of the runtime-critical PowerShell and relay helper files includes the exact deployed-host compatibility restores from Phase 19 under one explicit compatibility marker, so the next archive does not depend on live server-only script edits.
  2. One preserve-first parity-clean remediation flow records before/after ready counts plus separate truth for `windows_edge_forced_host` and `ubuntu_public_owner` without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin.
  3. The latest Phase 20 remediation result is visible through an internal operator surface or durable file-backed artifact before the smoke rerun begins.
  4. The phase ends with one live parity-clean remediation run plus one exact rerun of the proven Phase 11 smoke, and records exactly one final verdict `remediated_through_smoke` or `hold_rollout`.

Plans:
- [x] `20-01-PLAN.md` - backport the exact deployed-host compatibility restores, add the parity-clean remediation wrapper, and document the sync contract
- [x] `20-02-PLAN.md` - expose the latest runtime parity backport remediation artifact in control-api and the internal admin surface
- [x] `20-03-PLAN.md` - redeploy the parity-clean archive, run the live remediation plus smoke rerun, and record the final verdict

### Phase 21: Deployed Windows disconnected runtime and windows_edge_forced_host public-owner 502 remediation after parity-clean proof

**Goal:** Stabilize the deployed Windows browser-block after the parity-clean proof from Phase 20 by targeting the still-disconnected runtime baseline plus the `windows_edge_forced_host` / public-owner `502` branch through one preserve-first remediation path that must still survive a fresh smoke rerun.
**Requirements**: WPCP-01, WPCP-02, WPCP-03, WPCP-04
**Depends on:** Phase 20
**Plans:** 3 plans
**Success Criteria** (what must be TRUE):
  1. One preserve-first remediation flow can move or honestly reclassify the current `0/9 ready` disconnected baseline and record exact before/after truth without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin.
  2. The same phase artifact records separate post-remediation truth for `windows_edge_forced_host` and the public-owner `502` branch, so the first failing hop and any downstream public-owner failure stay explicit instead of collapsing back into one vague public `502`.
  3. The latest Phase 21 remediation result is visible through an internal operator surface or durable file-backed artifact before the smoke rerun begins.
  4. The phase ends with one rerun of the proven Phase 11 smoke and one explicit verdict `remediated_through_smoke` or `hold_rollout`.
**Current status:** Completed on 2026-04-01 with verdict `hold_rollout`. Wave 1 added the canonical post-parity remediation harness and exact sync docs. Wave 2 added the file-backed latest route plus the matching `/internal/admin` section, extended coverage, and rebuilt the runtime the deployed host serves. Wave 3 overlaid the archive on the deployed host, restarted `control-api`, ran the exact remediation harness, confirmed `GET /internal/post-parity-disconnected-runtime-remediation/latest` plus `/internal/admin`, and reran the exact Phase 11 smoke. The remediation still held at `0/9 -> 0/9 ready`, the dominant blocker stayed `disconnected`, the first failing hop stayed `windows_edge_forced_host`, and the rerun smoke still ended at `after_settle` with pool `degraded`, only `1/9 ready`, and a public canary `502/502/502`. The smoke rerun required restoring `test-rollout-smoke.ps1` to a probe-compatible call scheme because the checkpoint archive only contained Phase 21 checkpoint artifacts; the repo now backports a guard so the smoke wrapper no longer crashes when `chatCompletions` is absent.

Plans:
- [x] `21-01-PLAN.md` - canonical post-parity remediation harness, durable artifact contract, and exact sync docs
- [x] `21-02-PLAN.md` - file-backed latest post-parity remediation route, internal admin visibility, and runtime build parity
- [x] `21-03-PLAN.md` - live deployed-host remediation run, smoke rerun, operator-surface confirmation, and final verdict

### Phase 22: Deployed Windows post-phase21 disconnected runtime and windows_edge_forced_host public-owner 502 remediation follow-up

**Goal:** Run one more preserve-first remediation follow-up after the now-complete Phase 21 proof, keep the disconnected runtime plus `windows_edge_forced_host` / public-owner `502` branch explicit, and decide again whether the host can finally survive the proven smoke contract.
**Requirements**: WPFU-01, WPFU-02, WPFU-03, WPFU-04
**Depends on:** Phase 21
**Plans:** 3 plans
**Current status:** Completed on 2026-04-01 with verdict `hold_rollout`. Wave 1 added the canonical post-Phase-21 follow-up harness and exact sync docs on top of the completed Phase 21 chain. Wave 2 exposed the latest follow-up result in `control-api` and `/internal/admin`, added route/admin coverage, and rebuilt `dist`. Wave 3 overlaid the archive on `192.168.88.250`, restarted `control-api`, ran the exact live follow-up harness, confirmed `GET /internal/post-phase21-disconnected-runtime-followup/latest` plus `/internal/admin`, and reran the exact Phase 11 smoke. The follow-up still stayed at `0/9 -> 0/9 ready`, the dominant blocker stayed `disconnected`, the first failing hop stayed `windows_edge_forced_host`, `loopbackStatus` stayed green while forced-host plus public-owner stayed red, and the smoke still ended at `after_settle` with pool `degraded`, only `1/9 ready`, and public canary `502/502/502`. Technical note: the successful smoke rerun used the current server-working `test-rollout-smoke.ps1` because the checkpoint archive `phase22-live-followup-checkpoint-sync-20260401-224716.zip` carried a stale smoke-wrapper copy.

**Success Criteria** (what must be TRUE):
  1. One preserve-first follow-up flow can move or honestly reclassify the current `0/9 ready` disconnected baseline and record exact before/after truth without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin.
  2. The same phase artifact records loopback, forced-host, and public-owner truth separately, so the first failing hop and any downstream owner failure stay explicit instead of collapsing back into one vague public `502`.
  3. The latest Phase 22 follow-up result is visible through an internal operator surface or durable file-backed artifact before the smoke rerun begins.
  4. The phase ends with one rerun of the proven Phase 11 smoke and one explicit verdict `stabilized_through_smoke` or `hold_rollout`.

Plans:
- [x] `22-01-PLAN.md` - canonical post-Phase-21 follow-up harness, durable artifact contract, and exact sync docs
- [x] `22-02-PLAN.md` - file-backed latest post-Phase-21 follow-up route, internal admin visibility, and runtime build parity
- [x] `22-03-PLAN.md` - live deployed-host follow-up run, smoke rerun, operator-surface confirmation, and final verdict

### Phase 23: Deployed Windows post-phase22 smoke-wrapper parity recovery and persistent disconnected-runtime forced-host public-owner 502 remediation

**Goal:** Recover the smoke-wrapper parity gap exposed by the stale Phase 22 checkpoint archive, keep the persistent disconnected runtime plus `windows_edge_forced_host` / public-owner `502` branch explicit, and prove whether a parity-clean rerun can finally survive the exact smoke contract.
**Requirements**: WSPR-01, WSPR-02, WSPR-03, WSPR-04
**Depends on:** Phase 22
**Plans:** 3 plans
**Current status:** Completed on 2026-04-02 with verdict `hold_rollout`. Wave 1 restored the smoke-wrapper parity contract, added the canonical post-Phase-22 remediation harness, and updated the exact sync docs. Wave 2 exposed the latest parity-remediation result in `control-api` and `/internal/admin`, added route/admin coverage, and rebuilt `dist`. Wave 3 overlaid the archive on `192.168.88.250`, restarted `control-api`, ran the exact remediation command, confirmed both `GET /internal/post-phase22-smoke-wrapper-parity-remediation/latest` plus `/internal/admin`, and reran the exact Phase 11 smoke. The final truth remained negative: remediation stayed `0/9 -> 0/9 ready`, the dominant blocker stayed `disconnected`, the first failing hop stayed `windows_edge_forced_host`, loopback stayed green while forced-host plus public-owner stayed red, and the exact smoke still ended at `after_settle` with pool `degraded`, only `1/9 ready`, and public canary `502/502/502`. Technical note: the smoke rerun succeeded only on the current phase-23-compatible server-working copy because the deployed host still needed post-overlay compatibility restores in `probe-public-api.ps1`, `test-rollout-smoke.ps1`, and `remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1`.

**Success Criteria** (what must be TRUE):
  1. The repo and archive smoke-critical chain stay in explicit parity so the next archive no longer rolls `test-rollout-smoke.ps1` backward.
  2. One preserve-first Phase 23 remediation artifact records before/after ready counts plus loopback, forced-host, and public-owner truth without destructive reset behavior.
  3. The latest parity-remediation result is visible through the internal operator surface before the smoke rerun begins.
  4. The exact smoke rerun on the archive-overlaid wrapper ends with one explicit verdict `parity_recovered_through_smoke` or `hold_rollout`.

Plans:
- [x] `23-01-PLAN.md` - smoke-wrapper parity recovery, canonical post-Phase-22 remediation harness, and exact sync docs
- [x] `23-02-PLAN.md` - file-backed latest post-Phase-22 parity-remediation route, internal admin visibility, and runtime build parity
- [x] `23-03-PLAN.md` - live parity-clean remediation run, archive-overlaid smoke rerun, operator-surface confirmation, and final verdict

### Phase 24: Deployed Windows post-phase23 exact smoke-wrapper compat backport and persistent disconnected-runtime forced-host public-owner 502 remediation

**Goal:** Backport the exact deployed-host smoke-wrapper compatibility behavior into the repo and archive, keep the persistent disconnected runtime plus `windows_edge_forced_host` / public-owner `502` branch explicit, and prove whether the archive-overlaid scripts can finally survive the exact smoke contract without another live-only fix.
**Requirements**: WSCB-01, WSCB-02, WSCB-03, WSCB-04
**Depends on:** Phase 23
**Plans:** 3 plans
**Current status:** Completed on 2026-04-02 with verdict `hold_rollout`. Wave 1 backported the exact smoke-wrapper compat marker and canonical remediation harness, Wave 2 exposed the latest exact-compat result in `control-api` and `/internal/admin`, and Wave 3 overlaid the archive, ran the live remediation command, confirmed the operator surface, and reran the exact smoke. The final truth stayed negative: remediation remained `0/9 -> 0/9 ready`, the runtime blocker remained `disconnected`, the first failing hop remained `windows_edge_forced_host`, the smoke still ended at `after_settle` with only `1/9 ready`, and the public canary on `shared-6` now returned `503/503/503`. Technical note: the exact smoke rerun still required the current server-working post-overlay fixes, so exact compat backport is not yet resolved.

Plans:
- [x] `24-01-PLAN.md` - exact smoke-wrapper compat backport, canonical Phase 24 remediation harness, and exact sync docs
- [x] `24-02-PLAN.md` - file-backed latest exact compat remediation route, internal admin visibility, and runtime build parity
- [x] `24-03-PLAN.md` - live deployed-host compat-clean remediation run, exact smoke rerun, operator-surface confirmation, and final verdict

### Phase 25: Deployed Windows post-phase24 live-fix smoke-wrapper backport and persistent disconnected-runtime forced-host public-owner 503 remediation

**Goal:** Backport the exact deployed-host reverse-tunnel and live smoke fixes into the repo and archive, align the repo with the real canonical public path `Ubuntu nginx -> 127.0.0.1:4010`, and prove that authenticated external API use survives repeatable smoke without ad-hoc server-only fixes.
**Requirements**: WLFB-01, WLFB-02, WLFB-03, WLFB-04
**Depends on:** Phase 24
**Plans:** 3 plans
  **Current status:** Local Waves 1 and 2 are complete. The repo now backports the live reverse-tunnel supervision fixes, the docs/archive now treat `Ubuntu nginx -> 127.0.0.1:4010` as the canonical public path, and `control-api` now serves `GET /internal/post-phase24-external-api-readiness/latest` plus the matching `/internal/admin` section. Live `25-03` is still pending on the deployed Ubuntu and Windows hosts.

**Success Criteria** (what must be TRUE):
  1. The repo and archive copy of the runtime-critical chain carries the exact deployed-host live fixes forward so the next overlay no longer depends on post-overlay manual tunnel or smoke-script restores.
  2. One preserve-first Phase 25 readiness artifact records reverse-tunnel health, ready-worker truth, and canonical upstream truth without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin.
  3. The latest Phase 25 external-readiness result is visible through an internal operator surface or durable file-backed artifact before the final smoke claim.
  4. The phase ends with authenticated external smoke for `/healthz`, `/v1/models`, and `/v1/chat/completions` and one explicit verdict `externally_ready` or `hold_rollout`.

Plans:
  - [x] `25-01-PLAN.md` - reverse-tunnel live-fix backport, canonical upstream sync, and exact deployment docs
  - [x] `25-02-PLAN.md` - file-backed latest external-readiness route, internal admin visibility, and runtime build parity
  - [ ] `25-03-PLAN.md` - live deployed-host tunnel verification, authenticated external smoke, operator-surface confirmation, and final verdict
