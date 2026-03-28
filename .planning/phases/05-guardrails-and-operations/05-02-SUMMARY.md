---
phase: 05-guardrails-and-operations
plan: 02
subsystem: observability
tags: [sqlite, admin, events, monitoring, worker-ops]
provides:
  - durable operator event trail inside the existing SQLite database
  - internal observability JSON API and read-only operator page
  - lifecycle and failure instrumentation across worker, session, and relay flows
key-files:
  modified:
    - services/control-api/src/observability/operator-events.ts
    - services/control-api/src/chat/chat-relay-service.ts
    - services/control-api/src/sessions/session-service.ts
    - services/control-api/src/workers/worker-health-monitor.ts
    - services/control-api/src/routes/internal-worker-actions.ts
    - services/control-api/src/routes/internal-recovery.ts
    - services/control-api/src/routes/internal-observability.ts
    - services/control-api/src/routes/internal-admin-page.ts
    - services/control-api/test/internal-observability.test.ts
    - services/control-api/test/worker-health-monitor.test.ts
    - docs/internal-worker-ops.md
requirements-completed: [OBSV-01, OBSV-02]
completed: 2026-03-27
---

# Phase 05 Plan 02: Summary

`control-api` now writes a durable `operator_events` trail to the same SQLite database used for sessions and chat history. The event stream records worker status changes, restart requests and failures, reauthentication lifecycle, relay retries, terminal relay failures, and sessions that end because a worker became unavailable.

Internal-only JSON routes now expose the newest operator events and an aggregate summary with worker-status counts, recent failures, recent restarts, severity totals, and the last event time. On top of that, `control-api` serves a small read-only `/internal/admin` page that polls those routes and renders exactly three operator sections: worker status summary, recent failures, and recent lifecycle events.

This keeps Phase 5 intentionally lightweight: no second frontend package, no external observability stack, and no writable admin workflows beyond the existing restart and reauth endpoints.
