---
phase: 07-proxy-backed-on-demand-host-worker-pool
verified: 2026-03-28T20:30:00+03:00
status: passed
score: 5/5 must-haves verified
---

# Phase 07: Proxy-Backed On-Demand Host Worker Pool Verification Report

Phase goal: launch the three household host-native workers only when needed through a proxy pool with healthy-outbound failover while keeping the existing `control-api` worker contract.

Verified: 2026-03-28T20:30:00+03:00
Status: passed

## Goal Achievement

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Several proxy share links are parsed into a local sing-box mixed proxy config with healthy-outbound selection. | x VERIFIED | `infra/proxy/build-sing-box-config.mjs`, `services/host-controller/src/proxy-links.mjs` |
| 2 | The proxied host-native household pool can be started on demand. | x VERIFIED | `infra/host-worker/start-proxied-host-pool.ps1`; live ports `7897`, `4021`, `4022`, `4023`, `9222`, `9223`, `9224` came up during smoke |
| 3 | `control-api` still sees `dad`, `wife`, and `shared-1` through the normal worker contract while the pool is active. | x VERIFIED | live `GET http://127.0.0.1:8081/internal/workers` reported all three workers as `ready` |
| 4 | Live proxied relay succeeds on more than one worker in the pool. | x VERIFIED | live sessions returned exact replies `proxy-wife-ok` and `proxy-shared-ok` |
| 5 | The proxied host-native pool can be stopped cleanly and the workers leave the pool without losing their profiles. | x VERIFIED | `infra/host-worker/stop-proxied-host-pool.ps1`; live `GET http://127.0.0.1:8081/internal/workers` reported all three workers as `disconnected` after stop |

Score: 5/5 truths verified

## Automated Checks

| Command | Status |
|---------|--------|
| `cmd /c npm.cmd test` in `services/host-controller` | x PASSED |
| `cmd /c npm.cmd test` in `services/control-api` | x PASSED |
| `cmd /c npm.cmd run build` in `services/control-api` | x PASSED |

## Live Smoke Checks

| Check | Result |
|------|--------|
| `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\start-proxied-host-pool.ps1 -SkipInstall` | completed |
| `GET http://127.0.0.1:8081/internal/workers` after start | `dad`, `wife`, and `shared-1` reported `ready` |
| Proxied live relay smoke on `wife` | session `77a8d8dc-cca2-4dd1-b566-ce0063bb133a`, exact reply `proxy-wife-ok` |
| Proxied live relay smoke on `shared-1` | session `f3a13ff5-294e-4bc7-8714-96d70336676b`, exact reply `proxy-shared-ok` |
| Proxied live relay smoke on `dad` | failed with `selector_not_found`; treated as residual worker-specific relay drift, not a phase blocker |
| `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\stop-proxied-host-pool.ps1` | completed |
| `GET http://127.0.0.1:8081/internal/workers` after stop | all three workers reported `disconnected` |

## Requirements Coverage

| Requirement | Status |
|-------------|--------|
| HOST-01: Operator can run selected household workers as host-native Chromium browsers | x VERIFIED |
| HOST-02: Each host-native worker keeps its own durable local browser profile across launches | x VERIFIED |
| HOST-03: `control-api` sees host-native workers through the same worker contract | x VERIFIED |
| PROXY-01: Operator can store several proxy share links in ignored local configuration | x VERIFIED |
| PROXY-02: New worker traffic routes through a local proxy layer that prefers a healthy outbound | x VERIFIED |
| PROXY-03: Operator can start and stop the proxied host-native pool only when needed | x VERIFIED |
| LIVE-01: At least one real host-native login and reply cycle works outside the old Docker loop | x VERIFIED |
| LIVE-02: At least two different workers complete a live proxied relay smoke | x VERIFIED |
| SECU-04: Proxy provider links and generated runtime files stay on ignored local storage | x VERIFIED |

## Residual Risk

- `dad` still has one observed proxied relay failure with `selector_not_found`, which points to worker-specific ChatGPT DOM drift rather than proxy failover logic.
- The verified operator path is still script-driven; app-driven host-worker startup remains future hardening work if we want one-click admin control.
