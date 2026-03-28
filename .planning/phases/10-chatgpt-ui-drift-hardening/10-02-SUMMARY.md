---
phase: 10-chatgpt-ui-drift-hardening
plan: 02
subsystem: relay-hardening
tags: [worker-agent, control-api, relay, live-probe]
provides:
  - hardened relay selectors for the current ChatGPT composer path
  - preserved granular relay failures through control-api
  - targeted host-native live relay probe script
key-files:
  modified:
    - workers/agent/src/chat-relay/relay-runner.ts
    - workers/agent/test/relay-runner.test.ts
    - services/control-api/src/chat/worker-relay-client.ts
    - services/control-api/test/chat-relay-service.test.ts
    - infra/host-worker/test-host-worker-relay.ps1
requirements-completed: [STAB-03]
completed: 2026-03-28
---

# Phase 10 Plan 02: Summary

Relay hardening now produces actionable live evidence instead of opaque current-ui failures.

## Accomplishments

- Updated relay-runner to use the centralized selector groups and return exact relay drift failures instead of flattening everything into `selector_not_found`.
- Preserved refined relay failure codes across worker transport parsing and control-api retry or terminal-failure handling.
- Added `infra/host-worker/test-host-worker-relay.ps1` as a maintainer-only probe that creates a session, waits for bootstrap readiness, sends an exact-reply prompt, and fails fast on bootstrap or relay errors.
- Used the live probe path to confirm that the current logged-out `dad` profile is now classified as `bootstrap_auth_required` instead of a misleading selector-drift error.

## Key Decisions

- Keep the live probe narrow and maintainer-oriented so it helps drift triage without stealing Phase 11 rollout-smoke scope.
- Preserve exact worker failure codes through the control plane so operator evidence stays useful after transport parsing.
- Treat `bootstrap_auth_required` as a first-class live result so authentication loss is not mistaken for DOM drift.

## Verification

- `cmd /c npm.cmd test --prefix workers/agent`
- `cmd /c npm.cmd run build --prefix workers/agent`
- `cmd /c npm.cmd test --prefix services/control-api`
- `cmd /c npm.cmd run build --prefix services/control-api`
- `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\test-host-worker-relay.ps1 -WorkerId dad -TimeoutSeconds 180` -> `bootstrap_auth_required`

## Residual Risk

- The targeted live probe is strong enough for triage, but live relay success on `dad` still depends on manual reauthentication of that specific household profile.
