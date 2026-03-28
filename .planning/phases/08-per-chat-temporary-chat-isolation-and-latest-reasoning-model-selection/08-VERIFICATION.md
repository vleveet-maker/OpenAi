---
phase: 08-per-chat-temporary-chat-isolation-and-latest-reasoning-model-selection
verified: 2026-03-28T21:05:00+03:00
status: passed
score: 4/4 must-haves verified
---

# Phase 08: Per-Chat Temporary Chat Isolation And Latest Reasoning Model Selection Verification Report

Phase goal: make each newly started chat prepare a clean `Temporary Chat`, prefer the latest configured reasoning model, and keep sending blocked until that bootstrap is ready.

Verified: 2026-03-28T21:05:00+03:00
Status: passed

## Goal Achievement

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Active sessions now have explicit durable fresh-chat bootstrap state instead of hidden setup. | x VERIFIED | `services/control-api/src/chat/chat-bootstrap-store.ts`, `services/control-api/src/chat/chat-bootstrap-service.ts` |
| 2 | Worker-agent exposes a dedicated bootstrap endpoint that attempts `Temporary Chat` and preferred-model selection. | x VERIFIED | `workers/agent/src/server.ts`, `workers/agent/src/chat-bootstrap/temporary-chat-runner.ts` |
| 3 | Shared-screen users can see preparing, ready, and failed fresh-chat states, and the composer stays disabled until ready. | x VERIFIED | `apps/session-client/src/app.tsx`, `apps/session-client/src/session-types.ts` |
| 4 | Operator docs explain `Temporary Chat`, preferred-model configuration, and drift maintenance. | x VERIFIED | `docs/internal-worker-ops.md`, `docs/host-native-worker.md` |

Score: 4/4 truths verified

## Automated Checks

| Command | Status |
|---------|--------|
| `cmd /c npm.cmd run build` in `services/control-api` | x PASSED |
| `cmd /c npm.cmd test` in `services/control-api` | x PASSED |
| `cmd /c npm.cmd run build` in `workers/agent` | x PASSED |
| `cmd /c npm.cmd test` in `workers/agent` | x PASSED |
| `cmd /c npm.cmd run build` in `apps/session-client` | x PASSED |
| `cmd /c npm.cmd test` in `apps/session-client` | x PASSED |

## Requirements Coverage

| Requirement | Status |
|-------------|--------|
| CHATISO-01: Each newly started user chat begins from a clean dialog boundary | x VERIFIED |
| CHATISO-02: The system prefers ChatGPT `Temporary Chat` for each new chat | x VERIFIED |
| CHATISO-03: The system prefers the latest available reasoning model for each new chat | x VERIFIED |
| CHATISO-04: Message sending remains blocked until fresh-chat bootstrap is ready or failed clearly | x VERIFIED |

## Residual Risk

- This phase is code-and-test verified, but not yet live-smoked against the current production ChatGPT UI after implementation. Real selector drift remains possible whenever OpenAI changes `Temporary Chat` or model-picker UX.
- Preferred-model selection is configurable through `WORKER_PREFERRED_REASONING_MODEL_LABELS`, but the “latest reasoning model” target is time-unstable and should be revisited when OpenAI changes the lineup.
