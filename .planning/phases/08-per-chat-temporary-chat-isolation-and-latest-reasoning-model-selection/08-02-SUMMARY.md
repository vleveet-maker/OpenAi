---
phase: 08-per-chat-temporary-chat-isolation-and-latest-reasoning-model-selection
plan: 02
subsystem: worker-agent
tags: [temporary-chat, playwright, model-selection, bootstrap-endpoint]
provides:
  - dedicated worker bootstrap endpoint for fresh chat setup
  - Temporary Chat and preferred-model browser automation
  - structured bootstrap failure mapping
key-files:
  modified:
    - workers/agent/src/server.ts
    - workers/agent/src/chat-bootstrap/bootstrap-types.ts
    - workers/agent/src/chat-bootstrap/bootstrap-selector-map.ts
    - workers/agent/src/chat-bootstrap/temporary-chat-runner.ts
    - workers/agent/test/temporary-chat-runner.test.ts
    - workers/agent/test/bootstrap-selector-map.test.ts
    - workers/agent/test/browser-access-runtime.test.ts
requirements-completed: [CHATISO-01, CHATISO-02, CHATISO-03]
completed: 2026-03-28
---

# Phase 08 Plan 02: Summary

Worker-agent now exposes a dedicated fresh-chat bootstrap contract and can attempt `Temporary Chat` plus preferred reasoning-model selection before relay starts.

## Accomplishments

- Added `POST /internal/chat/bootstrap` to worker-agent with structured `status`, `conversationMode`, `modelLabel`, `failureCode`, and `pageUrl`.
- Added `WORKER_PREFERRED_REASONING_MODEL_LABELS` parsing with default `["GPT-5.4 Thinking"]`.
- Implemented a bootstrap runner that normalizes to the ChatGPT start page, clicks `New Chat`, enables `Temporary Chat`, opens the model picker, and selects the first available preferred model label.
- Added structured failure codes for selector drift, auth-required states, Temporary Chat unavailability, missing preferred model, and navigation failures.
- Added worker tests for success path, auth failure mapping, Temporary Chat failure, model availability failure, selector regex behavior, and endpoint wiring.

## Key Decisions

- Keep bootstrap as a dedicated worker primitive instead of folding it into the first relay submission.
- Use configurable preferred-model labels instead of hardcoding a forever-static model name.
- Fail safely when Temporary Chat or preferred-model selection cannot be confirmed.

## Verification

- `cmd /c npm.cmd run build` in `workers/agent`
- `cmd /c npm.cmd test` in `workers/agent`

## Residual Risk

- Real ChatGPT DOM and naming can still drift independently of tests, so a live smoke remains valuable when OpenAI changes Temporary Chat or model-picker UX.
