---
phase: 10-chatgpt-ui-drift-hardening
verified: 2026-03-28T17:02:30+03:00
status: partial
score: 2/3 must-haves verified
---

# Phase 10: ChatGPT UI Drift Hardening Verification Report

Phase goal: bring relay and fresh-chat bootstrap back to a predictable state against the current ChatGPT UI, including the residual `dad` edge case.

Verified: 2026-03-28T17:02:30+03:00
Status: partial

## Goal Achievement

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Selector and drift-sensitive browser automation paths are now centralized enough that relay and bootstrap fixes live in dedicated selector-map files with exact failure codes. | x VERIFIED | `workers/agent/src/chat-relay/selector-map.ts`, `workers/agent/src/chat-bootstrap/bootstrap-selector-map.ts`, `workers/agent/src/chat-relay/relay-types.ts`, `workers/agent/src/chat-bootstrap/bootstrap-types.ts` |
| 2 | Fresh-chat bootstrap succeeds against the current localized `Temporary Chat` and reasoning-model picker UI on logged-in workers. | x VERIFIED | Live probe success on `wife` and `shared-1`; current-ui markers observed: `aria-label=\"Включить временный чат\"`, `data-testid=\"modal-temporary-chat-onboarding\"`, `data-testid=\"temporary-chat-label\"`, `data-testid=\"model-switcher-gpt-5-4-thinking\"` |
| 3 | Proxied live relay succeeds on all three household workers, including `dad`. | ~ PARTIAL | `wife` and `shared-1` succeeded with exact reply `smoke-ok`; `dad` now fails as `bootstrap_auth_required`, which proves the residual edge case is auth/profile state, not the old generic selector drift path |

Score: 2/3 truths verified

## Automated Checks

| Command | Status |
|---------|--------|
| `cmd /c npm.cmd test --prefix workers/agent` | x PASSED |
| `cmd /c npm.cmd run build --prefix workers/agent` | x PASSED |
| `cmd /c npm.cmd test --prefix services/control-api` | x PASSED |
| `cmd /c npm.cmd run build --prefix services/control-api` | x PASSED |

## Live Checks

| Probe | Result |
|-------|--------|
| `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\test-host-worker-relay.ps1 -WorkerId wife -TimeoutSeconds 180` | x PASSED -> bootstrap ready, relay reply `smoke-ok` |
| `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\test-host-worker-relay.ps1 -WorkerId shared-1 -TimeoutSeconds 180` | x PASSED -> bootstrap ready, relay reply `smoke-ok` |
| `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\test-host-worker-relay.ps1 -WorkerId dad -TimeoutSeconds 180` | ~ PARTIAL -> `bootstrap_auth_required` |

## Requirements Coverage

| Requirement | Status |
|-------------|--------|
| STAB-01: Proxied live relay succeeds on all three household workers against the current ChatGPT UI, including `dad` | ~ PARTIAL - `wife` and `shared-1` verified live; `dad` still requires manual reauth |
| STAB-02: Fresh-chat bootstrap succeeds against the current `Temporary Chat` and reasoning-model picker UI on a logged-in worker | x VERIFIED |
| STAB-03: Selector and drift-sensitive browser automation paths are centralized enough that fixes stay maintainable | x VERIFIED |

## Residual Risk

- `dad` remains a real manual blocker for Phase 10 completion because its current profile now lands in `bootstrap_auth_required` and needs operator reauthentication before the final three-worker relay proof can be rerun.
- The current ChatGPT UI is live-verified on two logged-in workers, but OpenAI can still change `Temporary Chat` onboarding or model-switcher semantics again at any time.
- Parallel targeted probes can interfere with FIFO routing and leave noisy temporary sessions behind, so Phase 10 live verification should stay sequential per worker.
