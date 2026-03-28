---
phase: 10-chatgpt-ui-drift-hardening
plan: 01
subsystem: worker-agent-selector-foundation
tags: [worker-agent, selectors, drift, failure-codes]
provides:
  - centralized relay and bootstrap selector maps
  - granular relay and bootstrap drift failure codes
  - one-place maintenance for current ChatGPT UI aliases
key-files:
  modified:
    - workers/agent/src/chat-relay/selector-map.ts
    - workers/agent/src/chat-relay/relay-types.ts
    - workers/agent/src/chat-bootstrap/bootstrap-selector-map.ts
    - workers/agent/src/chat-bootstrap/bootstrap-types.ts
    - workers/agent/test/relay-selector-map.test.ts
    - workers/agent/test/bootstrap-selector-map.test.ts
requirements-completed: [STAB-03]
completed: 2026-03-28
---

# Phase 10 Plan 01: Summary

Phase 10 now starts from a centralized selector contract instead of scattered UI assumptions inside runner code.

## Accomplishments

- Replaced anonymous relay selector arrays with named groups for composer, send, assistant-turn capture, and generating indicators.
- Added exact worker relay failure codes such as `composer_selector_not_found`, `send_button_selector_not_found`, and `assistant_turn_selector_not_found`.
- Centralized bootstrap entry points for `New chat`, `Temporary Chat`, confirmation markers, model-picker buttons, and model options.
- Added selector-map coverage so current-ui aliases and exact failure-code vocabulary are regression-tested before runner logic changes.

## Key Decisions

- Keep selector maintenance in dedicated map files so future ChatGPT UI drift does not require searching through unrelated runtime code.
- Prefer refined failure codes over generic `selector_not_found` so live triage can distinguish auth, composer, temporary-entry, and model-picker problems.
- Treat localized or aliased current-ui patterns as selector-map data, not as special cases buried in click logic.

## Verification

- `cmd /c npm.cmd test --prefix workers/agent`
- `cmd /c npm.cmd run build --prefix workers/agent`

## Residual Risk

- Centralization reduces maintenance cost, but it does not by itself prove the live household workers are authenticated or that current ChatGPT UI transitions still succeed end-to-end.
