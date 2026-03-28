---
phase: 05-guardrails-and-operations
plan: 01
subsystem: edge-boundary
tags: [nginx, docker, security, health, readiness]
provides:
  - single public and internal edge split for the default Docker deployment
  - token-first internal admin enforcement
  - safe health and readiness endpoints plus response hardening headers
key-files:
  modified:
    - infra/docker-compose.yml
    - infra/nginx/default.conf.template
    - services/control-api/src/server.ts
    - services/control-api/src/security/internal-admin-guard.ts
    - services/control-api/src/routes/internal-health.ts
    - services/control-api/test/edge-config.test.ts
    - services/control-api/test/internal-observability.test.ts
requirements-completed: [SECU-01, OBSV-02]
completed: 2026-03-27
---

# Phase 05 Plan 01: Summary

The default deployment now runs behind one Nginx edge container instead of exposing `control-api` and `session-client` directly on host ports. Public traffic terminates on `:8080` for the shared-screen app and public `/api/*`, while the internal admin surface is isolated behind `127.0.0.1:8081`.

`requireInternalAdmin` now behaves as token-first by default, which removes the old private-network auto-bypass from the normal deployment path. The internal edge injects `x-internal-admin-token` to upstream `control-api`, so public browsers cannot reach `/internal/*` even if they live on the same LAN.

The backend also gained safe `GET /healthz` and `GET /readyz` routes plus baseline hardening headers on app responses. `healthz` stays minimal for liveness, and `readyz` exposes only aggregate worker-status counts rather than worker identities, profile paths, or recovery links.
