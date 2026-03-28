---
phase: 06-stabilize-persistent-browser-profile-recovery-and-live-worker-readiness
plan: 01
subsystem: worker-runtime
tags: [docker, playwright, chromium-profile, recovery]
provides:
  - shell-level cleanup of stale Chromium singleton artifacts before worker startup
  - non-watch runtime startup for browser workers
  - live-verified worker readiness recovery after recreate and restart
key-files:
  modified:
    - infra/worker-runtime/start-worker-runtime.sh
requirements-completed: [WORK-03, WORK-04, OBSV-02]
completed: 2026-03-28
---

# Phase 06 Plan 01: Summary

Worker runtime startup now clears stale Chromium profile lock artifacts before Playwright boots and launches the worker process in non-watch mode, which restores full pool readiness after container recreate and single-worker restart.

## Performance

- Duration: 19 min
- Started: 2026-03-28T09:25:00+03:00
- Completed: 2026-03-28T09:44:00+03:00
- Tasks: 1
- Files modified: 1

## Accomplishments

- Added `cleanup_profile_locks` to the worker runtime entrypoint so stale `Singleton*` artifacts and `Default/LOCK` are removed before browser bootstrap.
- Switched the worker runtime launch from `npm run dev` to `npm run start`, removing watch-mode restarts from the persistent browser path.
- Rebuilt the worker images and verified that the pool returned to `ready` after a full worker recreate and again after restarting `worker-dad`.

## Files Created/Modified

- `infra/worker-runtime/start-worker-runtime.sh` - cleans stale Chromium lock artifacts and starts the worker in non-watch mode

## Decisions Made

- Treat persistent browser workers as runtime services, not file-watched dev processes.
- Prefer shell-level cleanup in the container entrypoint for mounted-profile lock artifacts, because it is applied before Playwright starts.

## Deviations from Plan

None.

## Issues Encountered

- The original failure only reproduced on some profiles, so live Docker recreate and restart checks were needed to prove the fix rather than relying on unit tests alone.

## User Setup Required

None.

## Next Phase Readiness

- The worker pool now survives normal restart and recreate flows without manual profile cleanup.
- Milestone v1.0 can move to closeout once the roadmap/state artifacts reflect this final stabilization.
