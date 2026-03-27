---
phase: 04-resilience-and-reconnect
plan: 01
subsystem: relay-backend
tags: [sqlite, retry, dedup, relay, playwright]
provides:
  - durable relay job state keyed by assistant placeholder id
  - bounded retry orchestration for transient pre-submit failures
  - public relay status snapshots for reconnecting client UI
key-files:
  modified:
    - services/control-api/src/chat/chat-types.ts
    - services/control-api/src/chat/chat-store.ts
    - services/control-api/src/chat/chat-relay-service.ts
    - services/control-api/src/chat/worker-relay-client.ts
    - services/control-api/src/routes/public-chat.ts
    - workers/agent/src/chat-relay/relay-types.ts
    - workers/agent/src/chat-relay/relay-runner.ts
    - services/control-api/test/chat-relay-service.test.ts
    - services/control-api/test/public-chat.test.ts
    - workers/agent/test/relay-runner.test.ts
requirements-completed: [RELY-01, RELY-02]
completed: 2026-03-27
---

# Phase 04 Plan 01: Summary

Durable relay-job state now sits beside session message history in SQLite, which lets `control-api` retry only safe pre-submit failures without creating duplicate user messages. The public conversation snapshot also exposes relay status, attempt count, and last failure details so the client can render retry or failure states from authoritative backend data.

The worker relay contract was expanded with `failureClass`, `failureStage`, and `submittedAt`. `control-api` uses that signal to retry only transient dispatch failures before submit acknowledgement, with explicit backoffs of 2000 ms and 5000 ms for attempts two and three. Once submit is acknowledged, failures stay visible on the existing assistant placeholder instead of silently retrying and risking duplicate ChatGPT turns.

Automated coverage now proves the critical resilience rules: transient retries reuse the same user message, submitted failures do not retry, retries stop after three total attempts, public snapshots expose relay state, and worker relay results include submit acknowledgement and failure classification.
