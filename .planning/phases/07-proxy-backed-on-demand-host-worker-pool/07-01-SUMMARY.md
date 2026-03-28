---
phase: 07-proxy-backed-on-demand-host-worker-pool
plan: 01
subsystem: host-native-runtime
tags: [windows, chromium, proxy, sing-box, on-demand]
provides:
  - on-demand proxied launch for the three host-native household workers
  - local share-link parsing and sing-box mixed proxy generation with healthy-outbound selection
  - verified start and stop scripts for the host-native worker pool
key-files:
  modified:
    - infra/proxy/build-sing-box-config.mjs
    - infra/host-worker/start-proxied-host-pool.ps1
    - infra/host-worker/stop-proxied-host-pool.ps1
    - docs/host-native-worker.md
requirements-completed: [HOST-01, HOST-02, HOST-03, PROXY-01, PROXY-02, PROXY-03, LIVE-01, LIVE-02, SECU-04]
completed: 2026-03-28
---

# Phase 07 Plan 01: Summary

The household host-native browser fallback is now an on-demand proxied pool instead of three always-open native browser windows.

## Performance

- Duration: 1 session
- Completed: 2026-03-28
- Tasks: 1
- Files modified: 8 tracked paths plus ignored local proxy data

## Accomplishments

- Added a local sing-box runtime that parses VLESS, Trojan, and Shadowsocks share links from ignored local configuration and builds a mixed proxy with `urltest` outbound selection.
- Added one-command PowerShell scripts to start and stop the full three-worker host-native household pool only when it is needed.
- Kept the existing `control-api` worker contract intact so the app still sees `dad`, `wife`, and `shared-1` as ordinary workers.
- Updated the host-native runbook to document the verified operator path: start proxied pool, sign in if needed, use the app, then stop the pool again when idle.

## Files Created/Modified

- `infra/proxy/install-sing-box.ps1` - installs the local sing-box binary on demand
- `infra/proxy/start-sing-box.ps1` - starts the mixed proxy on `127.0.0.1:7897`
- `infra/proxy/build-sing-box-config.mjs` - generates sing-box config from ignored local share links
- `infra/host-worker/start-proxied-host-pool.ps1` - launches sing-box plus the three host-native workers
- `infra/host-worker/stop-proxied-host-pool.ps1` - stops the workers and the local proxy process
- `infra/docker-compose.host-native.yml` - keeps `control-api` pointed at host-native worker agents
- `docs/host-native-worker.md` - records the verified proxied on-demand operator workflow

## Decisions Made

- Treat host-native household workers as a real on-demand operator pool rather than a permanently open local browser cluster.
- Keep proxy links out of tracked repo state by storing them only in ignored local files and generating runtime config locally.
- Prefer a verified script-driven operator path over prematurely claiming that `control-api` can already start the host-native pool by itself.

## Deviations from Plan

- A local `host-controller` service was scaffolded as future groundwork, but it was not promoted to the verified operator path because end-to-end app-driven host-worker startup was not proven stable enough in this round.

## Issues Encountered

- One proxied live relay smoke on `dad` failed with `selector_not_found`, which looks like worker-specific ChatGPT DOM drift rather than a proxy failover problem.

## User Setup Required

- Keep the real provider share links in `infra/data/proxy/share-links.local.json`.
- Start the pool with `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\start-proxied-host-pool.ps1 -SkipInstall`.
- Stop it again with `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\stop-proxied-host-pool.ps1`.

## Next Phase Readiness

- The household can now run the three native browsers only when needed and spread sessions across them through the existing scheduler.
- If we continue this milestone instead of closing it, the most logical follow-up is app-driven start and stop plus relay-selector hardening for the remaining `dad` edge case.
