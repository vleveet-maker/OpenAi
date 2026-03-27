---
phase: 04-resilience-and-reconnect
plan: 02
subsystem: session-client
tags: [react, reconnect, local-storage, polling, retry-ui]
provides:
  - last-session resume for queued and active shared-screen sessions
  - reconnect-safe polling that keeps the last good history visible
  - retry and relay-failure banners driven by public conversation snapshots
key-files:
  modified:
    - apps/session-client/src/session-types.ts
    - apps/session-client/src/use-session-view.ts
    - apps/session-client/src/app.tsx
    - apps/session-client/src/styles.css
    - apps/session-client/src/app.test.tsx
  created:
    - apps/session-client/src/session-storage.ts
requirements-completed: [RELY-01, RELY-03]
completed: 2026-03-27
---

# Phase 04 Plan 02: Summary

The shared-screen client now remembers the last queued or active session in local storage and automatically resumes it from `/` when bootstrap confirms the session is still valid. Terminal sessions clear the stored id so the start screen does not loop back into stale state.

Polling is now reconnect-safe: once bootstrap succeeds, later poll failures no longer blank the screen or erase message history. Instead the app keeps the last good conversation visible and surfaces an explicit reconnecting banner while it keeps retrying the authoritative session endpoints in the background.

Relay resilience is also visible in the UI. The session route renders retry and failure banners from `conversation.relay`, keeps history on screen during both states, and blocks the composer when the client is reconnecting or the backend is retrying assistant delivery.
