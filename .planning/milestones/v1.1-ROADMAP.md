# Roadmap: One Hour With My ChatGPT

## Milestones

- [x] **v1.0 Household MVP** - shipped 2026-03-28, phases `1 -> 6`, archived in [.planning/milestones/v1.0-ROADMAP.md](/d:/OpenAi/.planning/milestones/v1.0-ROADMAP.md)
- [ ] **v1.1 Household Rollout Hardening** - active, focused on host-native fallback, proxy-backed on-demand launch, and real household operation

## Overview

The v1.1 milestone hardens real household rollout after the archived MVP. Instead of expanding product scope, it addresses the main operational risk discovered during live use: Docker-managed browser workers can get trapped in Cloudflare or similar challenge loops, while host-native Chromium browsers behave more like a real household browser. The milestone therefore shifts the fallback path to host-native workers that launch only when needed and route through a local proxy pool built from several provider share links.

## Phases

**Phase Numbering:**
- Integer phases (7, 8, 9): planned milestone work
- Decimal phases (7.1, 7.2): urgent insertions

- [x] **Phase 7: Proxy-backed on-demand host worker pool** - Launch the three household host-native workers only when needed through a proxy pool with healthy-outbound failover
- [x] **Phase 8: Per-chat Temporary Chat isolation and latest reasoning model selection** - Make each new chat start cleanly in Temporary Chat and prefer the latest available reasoning model

## Phase Details

### Phase 7: Proxy-backed on-demand host worker pool

**Goal:** Replace the always-open native browser fallback with a start-on-demand host-native pool that routes browser traffic through a local proxy layer built from several share links and keeps the same `control-api` worker contract.
**Depends on:** Archived milestone `v1.0 Household MVP`
**Requirements:** HOST-01, HOST-02, HOST-03, PROXY-01, PROXY-02, PROXY-03, LIVE-01, LIVE-02, SECU-04
**Success Criteria** (what must be TRUE):
  1. Operator can start and stop the three host-native household workers only when needed.
  2. New worker traffic goes through a local proxy layer that prefers a healthy outbound when one configured proxy is unavailable.
  3. `control-api` still sees the host-native workers through the normal worker contract, and live relay succeeds through the proxied pool.
**Plans:** 1 plan

Plans:
- [x] 07-01: Build the local proxy layer, wire the on-demand host-native worker pool, and validate the rollout with live proxied smoke checks

### Phase 8: Per-chat Temporary Chat isolation and latest reasoning model selection

**Goal:** Make every newly started chat open as a clean dialog boundary through `Temporary Chat` semantics while preferring the latest available reasoning model in ChatGPT.
**Depends on:** Phase 7
**Requirements:** CHATISO-01, CHATISO-02, CHATISO-03, CHATISO-04
**Success Criteria** (what must be TRUE):
  1. Starting a new user chat no longer reuses the previous dialog context on the same worker.
  2. New chats prefer `Temporary Chat` behavior so they stay out of history and do not use or create memories.
  3. New chats prefer the latest available reasoning model instead of a stale previously selected model.
**Plans:** 3 plans

Plans:
- [x] 08-01: Add durable fresh-chat bootstrap state, public snapshot exposure, and send gating in control-api
- [x] 08-02: Add worker bootstrap automation for clean Temporary Chat and preferred reasoning model selection
- [x] 08-03: Add shared-screen preparing UX, disabled composer gating, and operator docs for model drift

## Progress

**Execution Order:**
Current milestone execution order: 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. Proxy-backed on-demand host worker pool | 1/1 | Complete | 2026-03-28 |
| 8. Per-chat Temporary Chat isolation and latest reasoning model selection | 3/3 | Complete | 2026-03-28 |

## Current Status

- Active milestone: `v1.1 Household Rollout Hardening`
- Completed this milestone: proxy-backed host-native worker pool plus per-chat `Temporary Chat` isolation and preferred-model selection
- Current next action: close the milestone if no extra rollout hardening is needed

## Next Up

- `$gsd-complete-milestone`
- or `$gsd-add-phase "App-driven host worker control and relay selector hardening"`
