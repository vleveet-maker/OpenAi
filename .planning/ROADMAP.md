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
- [ ] **Phase 10: ChatGPT UI drift hardening** - active; relay and fresh-chat bootstrap now pass live on `wife` and `shared-1`, while `dad` still needs manual reauth before the final three-worker proof
- [ ] **Phase 11: Rollout smoke confidence** - Add a repeatable operator smoke path and visible readiness evidence before real household use

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
**Current status:** Selector centralization is complete and live probes pass on `wife` plus `shared-1`; `dad` is currently blocked on manual reauthentication with `bootstrap_auth_required`.

### Phase 11: Rollout smoke confidence

**Goal:** Give the operator a repeatable confidence check before the household begins using the pool after changes or drift.
**Depends on:** Phase 10
**Requirements:** CONF-01, CONF-02
**Success Criteria** (what must be TRUE):
  1. Operator can run a repeatable smoke flow that covers readiness, fresh-chat bootstrap, and at least one live relay.
  2. The latest smoke result is visible in operator surfaces or logs without digging through raw process output.
  3. The rollout confidence path is documented clearly enough that it can be rerun whenever ChatGPT UI drift is suspected.

## Progress

**Execution Order:**
Current milestone execution order: 9 -> 10 -> 11

| Phase | Requirements | Status | Completed |
|-------|--------------|--------|-----------|
| 9. Internal host-pool orchestration | ORCH-01, ORCH-02, ORCH-03 | Complete | 2026-03-28 |
| 10. ChatGPT UI drift hardening | STAB-01, STAB-02, STAB-03 | In progress | - |
| 11. Rollout smoke confidence | CONF-01, CONF-02 | Not started | - |

## Current Status

- Active milestone: `v1.2 Rollout Stability`
- Current next action: finish the `dad` manual reauth tail and rerun the targeted Phase 10 relay probe
- Carry-forward debt from `v1.1`: `dad` selector drift and current ChatGPT `Temporary Chat`/model-picker live recheck

## Next Up

- reauthenticate `dad` in ChatGPT, then rerun `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\test-host-worker-relay.ps1 -WorkerId dad -TimeoutSeconds 180`
- `$gsd-execute-phase 10`
