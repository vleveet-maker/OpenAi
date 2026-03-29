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
- [ ] **Phase 10: ChatGPT UI drift hardening** - active; selector hardening landed, but live hidden-runtime validation now shows all three workers falling into Cloudflare challenge instead of stable ChatGPT bootstrap
- [x] **Phase 10.1: Hidden runtime after manual login** - (INSERTED) completed 2026-03-28; explicit visible-auth and hidden-runtime paths now exist, plus a canonical hidden-runtime validation probe
- [x] **Phase 10.2: Hidden runtime reliability review and alternative browser runtime decision** - (INSERTED) completed 2026-03-28; control-plane truth is explicit, hidden-runtime evidence is recorded, and Phase 11 is now blocked by an explicit runtime decision
- [x] **Phase 10.3: Alternative non-visible native browser runtime design** - (INSERTED) completed 2026-03-28; alternate desktop runtime foundation and control-plane integration landed, but no worker passed the bounded live proof
- [ ] **Phase 10.4: Alternate desktop auth and bootstrap stabilization** - (INSERTED) executed 2026-03-29 with a negative runtime decision: proof now cleanly distinguishes `dad` auth loss from `wife`/`shared-1` navigation bootstrap failure, but no worker reached `phase11Ready=true`
- [ ] **Phase 10.5: Alternate desktop navigation rescue and auth renewal** - (INSERTED) executed 2026-03-29; `wife` produced the first proof-backed `phase11Ready=true` path in alternate desktop, while `dad` auth renewal and `shared-1` assignment-timeout cleanup remain explicit debt
- [ ] **Phase 10.5.1: Repeatable alternate desktop stability gate** - (INSERTED) executed 2026-03-29; validation is now worker-pinned and repeatability truth is explicit, but `wife` failed the same navigation bootstrap step twice in a row and no worker reached `stable (2/2)`
- [ ] **Phase 10.5.1.1: Alternate desktop repeatability rescue** - (INSERTED) executed 2026-03-29; fresh proof confirmed that visible auth still works on `wife`, but durable and fresh-profile alternate-desktop paths both still fall back to `bootstrap_navigation_failed@navigation`, so Phase 11 remains blocked
- [ ] **Phase 11: Rollout smoke confidence** - blocked after the negative 10.5.1.1 rescue decision; rollout smoke should resume only after a new follow-up stabilizes or replaces the alternate-desktop hand-off/runtime and produces at least one `stable (2/2)` worker

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
**Current status:** Selector centralization is complete, but live validation still has one open ChatGPT UI tail: on the alternate-desktop runtime, `dad` currently needs reauth and `wife` reached `temporary_confirmation_not_found` during `Temporary Chat` bootstrap.

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
**Depends on:** Phase 10.5.1.1
**Requirements:** CONF-01, CONF-02
**Success Criteria** (what must be TRUE):
  1. Operator can run a repeatable smoke flow that covers readiness, fresh-chat bootstrap, and at least one live relay.
  2. The latest smoke result is visible in operator surfaces or logs without digging through raw process output.
  3. The rollout confidence path is documented clearly enough that it can be rerun whenever ChatGPT UI drift is suspected.
**Current status:** Blocked on Phase 10.5.1.1. The repeatability gate is now explicit, but no worker is stable yet; rollout smoke planning resumes only after the inserted rescue follow-up.

## Progress

**Execution Order:**
Current milestone execution order: 9 -> 10 -> 10.1 -> 10.2 -> 10.3 -> 10.4 -> 10.5 -> 10.5.1 -> 10.5.1.1 -> 11

| Phase | Requirements | Status | Completed |
|-------|--------------|--------|-----------|
| 9. Internal host-pool orchestration | ORCH-01, ORCH-02, ORCH-03 | Complete | 2026-03-28 |
| 10. ChatGPT UI drift hardening | STAB-01, STAB-02, STAB-03 | In progress | - |
| 10.1 Hidden runtime after manual login | HIDE-01, HIDE-02, HIDE-03 | Complete | 2026-03-28 |
| 10.2 Hidden runtime reliability review and alternative browser runtime decision | RREV-01, RREV-02, RREV-03 | Complete | 2026-03-28 |
| 10.3 Alternative non-visible native browser runtime design | NVRT-01, NVRT-02, NVRT-03 | Complete | 2026-03-28 |
| 10.4 Alternate desktop auth and bootstrap stabilization | ADST-01, ADST-02, ADST-03 | Partial | 2026-03-29 |
| 10.5 Alternate desktop navigation rescue and auth renewal | ADNR-01, ADNR-02, ADNR-03 | Partial | 2026-03-29 |
| 10.5.1 Repeatable alternate desktop stability gate | RSG-01, RSG-02, RSG-03 | Partial | 2026-03-29 |
| 10.5.1.1 Alternate desktop repeatability rescue | ADRR-01, ADNR-02, RSG-02 | Partial | 2026-03-29 |
| 11. Rollout smoke confidence | CONF-01, CONF-02 | Blocked on 10.5.1.1 | - |

## Current Status

- Active milestone: `v1.2 Rollout Stability`
- Current next action: insert the follow-up after `Phase 10.5.1.1` before any `Phase 11` work
- Carry-forward debt from `Phase 10.5.1.1`: `wife` visible auth works but alternate desktop still fails after hand-off; `shared-1` still shares the navigation bootstrap tail; `dad` still needs auth renewal

## Next Up

- `$gsd-insert-phase 10.5.1.2 "Alternate desktop handoff stabilization or runtime replacement"`
- then resume `Phase 11` only after at least one worker proves repeatable non-visible stability
