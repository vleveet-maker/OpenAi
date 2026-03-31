---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 11 waves 1-2 completed; Wave 3 live rollout smoke still requires direct execution on the deployed Windows browser-block host 192.168.88.250
last_updated: "2026-03-31T08:32:53.030Z"
last_activity: 2026-03-31 -- Phase 11 waves 1-2 executed; live rollout smoke pending on deployed Windows host
progress:
  total_phases: 23
  completed_phases: 22
  total_plans: 69
  completed_plans: 68
  percent: 99
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-31)

**Core value:** A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.
**Current focus:** Phase 11 — rollout-smoke-confidence

## Current Position

Phase: 11 (rollout-smoke-confidence) — EXECUTING
Plan: 3 of 3
Milestone: `v1.2 Rollout Stability`
Status: Executing Phase 11 live checkpoint
Last activity: 2026-03-31 -- Phase 11 waves 1-2 executed; live rollout smoke pending on deployed Windows host

Progress: [##########] 99%

## Milestone Snapshot

- Phases completed: `22 / 23`
- Plans completed: `68 / 69`
- Current roadmap:
  - `.planning/ROADMAP.md`
- Current requirements:
  - `.planning/REQUIREMENTS.md`

## Carry-Forward Context

### Decisions

- Browser relay through managed ChatGPT web sessions remains the product shape.
- Manual operator login and reauthentication remain the deliberate safety model.
- Hidden runtime and Docker/Xvfb remain rejected as steady-state rollout runtimes.
- Alternate desktop remains historical runtime debt, not the active rollout gate.
- Compact visible runtime is now the proven rollout baseline for `v1.2`.
- The proven relay/session/bootstrap module now runs on the dedicated remote server instead of staying only on the operator machine.
- The real server topology verdict is now explicit: Linux remote relay plus reverse-tunneled compact-visible Windows workers.
- Deterministic worker-pinned validation is now real and should be treated as the source of truth for runtime evidence.
- Repeatability for `v1.2` is now explicit:
  - `unstable` = not rollout-ready
  - `provisional` = `1/2`
  - `stable` = `2/2`
- Phase 10.6.1.2 is now fully replanned around a separate Windows browser block, not Linux-hosted browsers.
- Phase 10.6.1.2.1 remains historical local confidence evidence; it does not replace the new Windows block deployment path.
- Latest direct Windows block truth is now explicit: `7/7` usable on the current machine in the fresh full direct probe, with all workers stopped again after the run.
- Phase 10.6.1.2.1.1 is now complete: the repeated local timeout was traced to a blocking memory dialog plus an aria-label-only `Temporary Chat` entry, both of which now have targeted mitigation and tests.
- Phase 10.6 confirmed that the extractable module is the `control-api`-centered relay/session/bootstrap layer, while the browser runtime itself remains separate-host.
- Phase 10.6.1 now treats server verification, all-worker session truth, and outside-client ingress truth as three separate checks, not one vague "server works" claim.
- Phase 10.6.1.2.2 is now complete with a preserve-first hold verdict: the deployed Windows Server 9-account block is audited and canary-safe, but its public API edge is still not promotable.
- Phase 10.6.1.2.2.1 is now executed with one precise blocker: preserve-first scripts and outside proof exist, but direct Windows-side `Caddy` execution did not happen during this run.
- The current Windows-side public API topology is now explicit: the intended safe shape is `Caddy -> 127.0.0.1:4011/4010`, not raw public `:4010`.
- Phase 10.6.1.2.2.1.1 is now complete: the direct preserve-first Windows-host `Caddy` pass succeeded on `shared-6`, the promoted HTTP edge is active, and the remaining blocker is reduced to HTTPS/TLS plus one independent outside chat proof.
- Phase 10.6.1.2.2.1.1.1 is now complete with `hold_preserve_accounts`: the preserved Windows edge still works locally, but public `77.66.186.75` currently terminates on Ubuntu `nginx`, so the blocker is exact public-edge ownership rather than TLS ambiguity alone.
- Phase 10.6.1.2.2.1.1.1.1 is now complete with `hold_preserve_accounts`: the ownership map is exact, the preserved Windows edge remains LAN-only, and the real public IP is currently owned by Ubuntu `nginx`, so the remaining blocker is now `split_ingress_owner_conflict`.

### Remaining Rollout Debt

- The main remaining debt before rollout smoke is no longer public-owner unification; that path is now live. The remaining public edge debt is certificate trust hardening for the Ubuntu-owned HTTPS contract.
- Raw public ingress on `77.66.186.75:4010` is no longer treated as the consumer path at all; the deliberate edge exists and is now the only intended public boundary.
- Alternate desktop remains useful historical evidence, but it no longer blocks household rollout planning.
- Edge crash-restore popup handling is now built into the compact-visible lifecycle and should be treated as regression-sensitive runtime behavior.
- Fresh compact-visible proof passed on `dad`, `wife`, `shared-1`, `shared-2`, `shared-3`, and `shared-4`, with all windows closed again afterward.
- `shared-5` is now provisioned as the seventh worker slot with ports `4027/9228`, and its first local proof already passed as `shared-5-ok`.
- Phase 10.6.1.2 is now complete as a packaging and handoff step: the Windows browser block contract, startup assets, and direct seven-worker proof are explicit.
- Rollout-smoke confidence is now the immediate next step; the deployed Windows Server block kept its 9 preserved accounts while Ubuntu became the deliberate public owner and outside canary chat now passes on `shared-6`.

## Accumulated Context

### Roadmap Evolution

- v1.2 started around internal orchestration, selector drift hardening, and rollout smoke confidence.
- Phase 9 completed: internal admin can start and stop the proxied host pool.
- Phase 10 remained partial: selector hardening landed, but live runtime tails remained.
- Phase 10.1 completed: visible auth and hidden runtime were separated explicitly.
- Phase 10.2 completed: hidden runtime and Docker/Xvfb were rejected for Phase 11.
- Phase 10.3 completed: alternate desktop became the leading non-visible runtime direction.
- Phase 10.4 executed: bootstrap telemetry and bounded proof became cleaner, but no worker reached `phase11Ready=true`.
- Phase 10.5 executed: `wife` produced a one-off proof-backed success, but that was not yet repeatability.
- Phase 10.5.1 executed: validation became worker-pinned, repeatability truth became explicit, and Phase 11 stayed blocked because no worker reached `stable (2/2)`.
- Phase 10.5.1.1 inserted after Phase 10.5.1: Alternate desktop repeatability rescue (URGENT)
- Phase 10.5.1.1 executed: visible auth on a fresh `wife` profile still works, but alternate desktop remains blocked by the hand-off/runtime tail
- Phase 10.5.1.1.1 inserted after Phase 10.5.1.1: Compact visible runtime rollout and crash-restore popup hardening (URGENT)
- Phase 10.5.1.1.1 executed: compact visible became the official rollout fallback, popup hardening was formalized, and fresh proof passed on all six official workers
- Phase 10.6 inserted after Phase 10: move the working module to the dedicated remote server, enable autostart, and expose a stable remote API (URGENT)
- Phase 10.6 planned: remote work will extract the proven relay/session/bootstrap layer, add standalone service mode and authenticated API, and end with an explicit topology verdict instead of a fake headless-runtime promise
- Phase 10.6 completed: the Linux remote relay was deployed to `77.66.186.75`, autostart was verified, and live fresh plus continuing dialog calls succeeded through a reverse-tunneled `wife` worker
- Phase 10.6.1 inserted after Phase 10.6: verify the dedicated server, verify all official worker sessions through the real remote topology, and create one deliberate public API path for outside clients
- Phase 10.6.1 executed: server truth and remote worker truth became explicit, and the remaining public-ingress blocker was isolated cleanly
- Phase 10.6.1.1 inserted after Phase 10.6.1: MikroTik public ingress and NAT hardening (URGENT)
- Phase 10.6.1.1 completed: MikroTik NAT now forwards WAN `tcp/80` to the server `nginx` edge, router management services are LAN-restricted, and outside-client proof now reaches the deliberate relay boundary
- Phase 10.6.1.2 inserted after Phase 10.6.1.1 as a Linux browser-hosting idea, then replanned into dedicated Windows browser block deployment after that Linux path was reverted
- `shared-5` provisioned locally as the seventh worker slot so the next runtime migration can move all seven workers together
- Phase 10.6.1.2 replanned: separate Windows browser block deployment for Windows Server, with host-controller, reverse tunnels, and direct seven-worker verification
- Phase 10.6.1.2 executed: Windows browser block packaging is complete, Windows Server startup assets are ready, and a fresh direct proof now shows `7/7 usable` on the current machine with all worker windows closed again after the run
- Phase 10.6.1.2.1 inserted after Phase 10.6.1.2: Local-machine rollout smoke confidence (URGENT)
- Phase 10.6.1.2.1 completed: local seven-worker compact-visible smoke is now rerunnable and explicit
- Phase 10.6.1.2.1.1 inserted after Phase 10.6.1.2.1: Shared-2 and shared-4 bootstrap timeout analysis and mitigation (URGENT)
- Phase 10.6.1.2.1.1 completed: memory-dialog dismissal plus aria-label temporary-entry fallback restored both workers and updated the local snapshot to `7/7 usable`
- Phase 10.6.1.2.2 completed on 2026-03-30 with verdict `hold_preserve_accounts`: the deployed Windows Server 9-account block is freeze-audited, canary/subset proof exists, and shadow API tooling is proven, but public API promotion remains blocked by the deployed Windows edge path
- Phase 10.6.1.2.2.1 inserted after Phase 10.6.1.2.2: Windows Server public API activation and edge reconciliation (URGENT)
- Phase 10.6.1.2.2.1 executed on 2026-03-30 with verdict `hold_preserve_accounts`: outside proof now shows `308` via `Caddy`, the repo has backup/audit/activate/rollback scripts, but direct Windows-side edge execution still remains
- Phase 10.6.1.2.2.1.1 inserted after Phase 10.6.1.2.2.1: Direct Windows Caddy edge cutover and canary proof (URGENT)
- Phase 10.6.1.2.2.1.1 planned on 2026-03-30: next action is one direct Windows-host `Caddy` backup/audit/shadow/promoted pass with canary `shared-6` and explicit rollback
- Phase 10.6.1.2.2.1.1 executed on 2026-03-31 with verdict `safe_but_hold`: direct host backup/audit happened, shadow canary on `shared-6` passed, promoted HTTP proof passed, the old HTTP `308` redirect is gone, and the remaining blocker is now Windows HTTPS/TLS plus one independent outside chat proof
- Phase 10.6.1.2.2.1.1.1 inserted after Phase 10.6.1.2.2.1.1: Windows HTTPS and independent outside chat proof finalization (URGENT)
- Phase 10.6.1.2.2.1.1.1 completed on 2026-03-31 with verdict `hold_preserve_accounts`: the final preserve-first pass proved the public blocker is now `public_edge_only`, because `77.66.186.75` currently lands on Ubuntu `nginx` instead of the preserved Windows `Caddy` edge
- Phase 10.6.1.2.2.1.1.1.1 inserted after Phase 10.6.1.2.2.1.1.1: Public edge ownership and split-ingress reconciliation (URGENT)
- Phase 10.6.1.2.2.1.1.1.1 completed on 2026-03-31 with verdict `hold_preserve_accounts`: public `77.66.186.75` is now explicitly observed on Ubuntu `nginx`, while the preserved Windows `Caddy` edge remains only a LAN-side responder; the next step is one narrow public-owner unification follow-up
- Phase 10.6.1.2.2.1.1.1.1.1 inserted after Phase 10.6.1.2.2.1.1.1.1: Ubuntu public owner reassignment and Windows edge unification (URGENT)
- Phase 10.6.1.2.2.1.1.1.1.1 completed on 2026-03-31 with verdict `safe_to_promote`: Ubuntu now deliberately owns public `77.66.186.75`, proxies the API contract to the preserved Windows edge over LAN HTTP with forced `Host`, and outside canary chat on `shared-6` succeeds without harming the 9-account pool

## Session Continuity

Last session: 2026-03-31T08:32:53.025Z
Stopped at: Phase 11 waves 1-2 completed; Wave 3 live rollout smoke still requires direct execution on the deployed Windows browser-block host 192.168.88.250
Resume file: .planning/phases/11-rollout-smoke-confidence/11-03-PLAN.md
