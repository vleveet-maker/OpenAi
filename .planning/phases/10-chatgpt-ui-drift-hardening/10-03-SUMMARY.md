---
phase: 10-chatgpt-ui-drift-hardening
plan: 03
subsystem: temporary-chat-bootstrap
tags: [worker-agent, temporary-chat, model-selection, localization, live-ui]
provides:
  - localized Temporary Chat entry handling
  - onboarding-aware temporary bootstrap flow
  - stable preferred-model selection through current model-switcher test ids
key-files:
  modified:
    - workers/agent/src/chat-bootstrap/bootstrap-selector-map.ts
    - workers/agent/src/chat-bootstrap/temporary-chat-runner.ts
    - workers/agent/src/server.ts
    - workers/agent/test/bootstrap-selector-map.test.ts
    - workers/agent/test/temporary-chat-runner.test.ts
    - docs/internal-worker-ops.md
    - docs/host-native-worker.md
requirements-completed: [STAB-02, STAB-03]
completed: 2026-03-28
---

# Phase 10 Plan 03: Summary

Fresh-chat bootstrap is now hardened against the current localized ChatGPT UI instead of assuming an English-only `Temporary Chat` and a simple model picker.

## Accomplishments

- Added localized `Temporary Chat` selector support, including the live Russian `aria-label="Включить временный чат"` path.
- Added onboarding-aware handling for the current `modal-temporary-chat-onboarding` flow with a localized `Продолжить` button.
- Tightened temporary confirmation around real post-click markers such as `temporary-chat-label` and the enabled temporary-state button instead of treating the original entry button as proof.
- Added model-option fallback through stable `data-testid` tokens like `model-switcher-gpt-5-4-thinking`, which matches the current localized model menu more reliably than exact visible-text matching.
- Confirmed live bootstrap and relay success on logged-in household workers `wife` and `shared-1` with the targeted probe script and exact reply `smoke-ok`.

## Key Decisions

- Treat localization drift as a first-class concern in selector maintenance instead of assuming the ChatGPT UI will stay English.
- Handle onboarding transitions explicitly because a successful Temporary Chat click can still be blocked by a modal before model selection is reachable.
- Prefer model-switcher test ids over localized visible text when the live menu shows translated labels like `Thinking` plus descriptive copy.

## Verification

- `cmd /c npm.cmd test --prefix workers/agent`
- `cmd /c npm.cmd run build --prefix workers/agent`
- `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\test-host-worker-relay.ps1 -WorkerId wife -TimeoutSeconds 180` -> success, `smoke-ok`
- `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\test-host-worker-relay.ps1 -WorkerId shared-1 -TimeoutSeconds 180` -> success, `smoke-ok`

## Residual Risk

- `dad` still requires manual ChatGPT reauthentication, so full three-worker live confidence is not complete yet even though the current DOM drift path is fixed on the two logged-in workers.
