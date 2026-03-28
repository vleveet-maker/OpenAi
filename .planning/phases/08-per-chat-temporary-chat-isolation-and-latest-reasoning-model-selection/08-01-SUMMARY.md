---
phase: 08-per-chat-temporary-chat-isolation-and-latest-reasoning-model-selection
plan: 01
subsystem: control-api
tags: [sqlite, bootstrap, session-snapshots, send-gating]
provides:
  - durable per-session fresh-chat bootstrap state
  - public snapshot exposure for bootstrap readiness
  - send gating until fresh chat is ready
key-files:
  modified:
    - services/control-api/src/chat/chat-bootstrap-types.ts
    - services/control-api/src/chat/chat-bootstrap-store.ts
    - services/control-api/src/chat/chat-bootstrap-service.ts
    - services/control-api/src/chat/chat-relay-service.ts
    - services/control-api/src/sessions/session-service.ts
    - services/control-api/src/sessions/session-types.ts
    - services/control-api/src/chat/chat-types.ts
    - services/control-api/src/server.ts
    - services/control-api/test/chat-bootstrap-service.test.ts
    - services/control-api/test/public-sessions.test.ts
    - services/control-api/test/public-chat.test.ts
requirements-completed: [CHATISO-01, CHATISO-04]
completed: 2026-03-28
---

# Phase 08 Plan 01: Summary

Control-plane fresh-chat bootstrap now exists as explicit durable state instead of hidden browser side effect.

## Accomplishments

- Added `session_chat_bootstraps` in the control-api SQLite database with `pending`, `ready`, and `failed` lifecycle states.
- Added a dedicated `ChatBootstrapService` that schedules bootstrap when a session activates and rehydrates active sessions after control-api restart.
- Extended public session and conversation snapshots with `chatBootstrap` metadata so the client can see `conversationMode`, `modelLabel`, and `failureCode`.
- Blocked chat send until bootstrap is `ready`, with explicit `chat_bootstrap_pending` and `chat_bootstrap_failed` errors.
- Added backend tests for bootstrap persistence, public snapshot exposure, and send gating.

## Key Decisions

- Treat clean-chat preparation as session-scoped state stored durably in control-api instead of implicit worker memory.
- Schedule bootstrap from `SessionService` activation so the session contract, not the UI, owns readiness.
- Fail safe on send when bootstrap is missing, pending, or failed.

## Verification

- `cmd /c npm.cmd run build` in `services/control-api`
- `cmd /c npm.cmd test` in `services/control-api`

## Residual Risk

- Worker bootstrap success still depends on the real ChatGPT UI selectors implemented in wave 2, so live DOM drift can still move a session into `failed` even though the control-plane contract is now correct.
