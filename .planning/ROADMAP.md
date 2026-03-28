# Roadmap: One Hour With My ChatGPT

## Archived Milestones

- [x] **v1.0 Household MVP** - shipped 2026-03-28, phases `1 -> 6`, archived in [.planning/milestones/v1.0-ROADMAP.md](/d:/OpenAi/.planning/milestones/v1.0-ROADMAP.md)
- [x] **v1.1 Household Rollout Hardening** - shipped 2026-03-28, phases `7 -> 8`, archived in [.planning/milestones/v1.1-ROADMAP.md](/d:/OpenAi/.planning/milestones/v1.1-ROADMAP.md)

## Current State

- No active milestone is open right now.
- The last shipped milestone proved host-native fallback, proxy-backed on-demand launch, and per-chat clean `Temporary Chat` bootstrap.
- The remaining known debt is rollout-specific rather than core-product missing scope.

## Carry-Forward Debt

- `dad` still has one observed proxied relay `selector_not_found` issue that looks like worker-specific ChatGPT DOM drift.
- Live smoke against the current production ChatGPT `Temporary Chat` and model-picker UI is still worth repeating when the next milestone begins.
- One-click internal-admin orchestration for host-native workers remains a future ergonomics improvement, not a shipping blocker.

## Next Up

- `$gsd-new-milestone`
- or review the archived v1.1 scope in [.planning/milestones/v1.1-ROADMAP.md](/d:/OpenAi/.planning/milestones/v1.1-ROADMAP.md) before choosing the next milestone theme
