---
phase: 08-per-chat-temporary-chat-isolation-and-latest-reasoning-model-selection
plan: 03
subsystem: session-client-and-docs
tags: [react, ux, disabled-composer, operator-docs]
provides:
  - preparing/ready/failed fresh-chat shared-screen UX
  - disabled composer until bootstrap ready
  - operator docs for Temporary Chat and model drift
key-files:
  modified:
    - apps/session-client/src/session-types.ts
    - apps/session-client/src/app.tsx
    - apps/session-client/src/styles.css
    - apps/session-client/src/app.test.tsx
    - docs/internal-worker-ops.md
    - docs/host-native-worker.md
requirements-completed: [CHATISO-01, CHATISO-02, CHATISO-03, CHATISO-04]
completed: 2026-03-28
---

# Phase 08 Plan 03: Summary

The shared-screen app now makes fresh-chat preparation visible and keeps send disabled until a clean `Temporary Chat` is actually ready.

## Accomplishments

- Extended client snapshot types with `chatBootstrap`.
- Added `Preparing Fresh Chat`, `Temporary Chat Ready`, and `Chat Setup Failed` banners.
- Kept the composer disabled until bootstrap is `ready`, with clearer helper text when setup is pending or failed.
- Surfaced `Chat mode` and `Model` metadata in the shared-screen shell.
- Added client tests for ready, pending, and failed bootstrap states.
- Updated operator docs to explain the `Temporary Chat` rule and `WORKER_PREFERRED_REASONING_MODEL_LABELS` maintenance.

## Key Decisions

- Show bootstrap state directly in the shared screen instead of hiding it behind a generic disabled composer.
- Treat bootstrap failure as a first-class user-visible state rather than a silent background error.
- Document model drift maintenance explicitly so operators know where to update the preferred model list.

## Verification

- `cmd /c npm.cmd run build` in `apps/session-client`
- `cmd /c npm.cmd test` in `apps/session-client`

## Residual Risk

- The UX is only as accurate as the worker bootstrap result. If ChatGPT UI changes cause selector drift, the client will safely show failure, but a live selector refresh will still be needed.
