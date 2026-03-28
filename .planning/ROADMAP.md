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
- [ ] **Phase 11: Rollout smoke confidence** - blocked pending an alternate-desktop follow-up; rollout smoke must not proceed until a worker records `phase11Ready=true`

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
**Depends on:** Phase 10.3
**Requirements:** CONF-01, CONF-02
**Success Criteria** (what must be TRUE):
  1. Operator can run a repeatable smoke flow that covers readiness, fresh-chat bootstrap, and at least one live relay.
  2. The latest smoke result is visible in operator surfaces or logs without digging through raw process output.
  3. The rollout confidence path is documented clearly enough that it can be rerun whenever ChatGPT UI drift is suspected.
**Current status:** Blocked after Phase 10.3. Rollout confidence resumes only after an alternate-desktop stabilization follow-up gets at least one worker to `phase11Ready=true`.

## Progress

**Execution Order:**
Current milestone execution order: 9 -> 10 -> 10.1 -> 10.2 -> 10.3 -> 11

| Phase | Requirements | Status | Completed |
|-------|--------------|--------|-----------|
| 9. Internal host-pool orchestration | ORCH-01, ORCH-02, ORCH-03 | Complete | 2026-03-28 |
| 10. ChatGPT UI drift hardening | STAB-01, STAB-02, STAB-03 | In progress | - |
| 10.1 Hidden runtime after manual login | HIDE-01, HIDE-02, HIDE-03 | Complete | 2026-03-28 |
| 10.2 Hidden runtime reliability review and alternative browser runtime decision | RREV-01, RREV-02, RREV-03 | Complete | 2026-03-28 |
| 10.3 Alternative non-visible native browser runtime design | NVRT-01, NVRT-02, NVRT-03 | Complete | 2026-03-28 |
| 11. Rollout smoke confidence | CONF-01, CONF-02 | Blocked | - |

## Current Status

- Active milestone: `v1.2 Rollout Stability`
- Current next action: insert an alternate-desktop stabilization follow-up before `Phase 11`
- Carry-forward debt from `v1.1`: current ChatGPT `Temporary Chat`/model-picker live recheck is now joined by a harder blocker: the current non-visible runtime still has not produced `phase11Ready=true`

## Next Up

- `$gsd-insert-phase 10.4 "Alternate desktop auth and bootstrap stabilization"`
- then return to `Phase 11` only after the follow-up proves `phase11Ready=true`
