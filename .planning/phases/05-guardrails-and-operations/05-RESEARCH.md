# Phase 5: Guardrails and Observability - Research

**Completed:** 2026-03-27  
**Question answered:** What is the smallest safe way to separate public and internal traffic while adding operator visibility to the existing worker pool?

## Findings

### Current Codebase Reality

- `control-api` already serves the shared-screen app and all public session/chat APIs, so the cleanest guardrail is to put a reverse proxy in front rather than split the backend into new services.
- Internal worker routes already existed, but `requireInternalAdmin` still allowed private-network access by default. That was too soft for a household deployment where end users may share the same LAN.
- The session and chat layers already persist state in SQLite, so an operator event trail fits naturally into the same database file.
- The project did not yet expose safe `/healthz` or `/readyz` signals, and the existing `/internal/health` route was not sufficient for monitor-friendly readiness checks.

### Recommended Direction

- Add one Nginx edge container with two listeners:
  - public `:8080` for the session client and public `/api/*`
  - internal `:8081` bound to loopback for `/internal/*`, `/internal/admin`, `/healthz`, and `/readyz`
- Use injected `x-internal-admin-token` on the internal edge instead of source-IP trust as the normal admin path.
- Store operator events durably in SQLite with explicit event types for worker status changes, restart/reauth lifecycle, relay retry/failure, and failure-driven session endings.
- Keep the admin UI read-only and server-rendered directly from `control-api`.

## Validation Notes

- Automated verification can cover route protection, event recording, health payload safety, and the Nginx template contract.
- A live Docker smoke test is still recommended after implementation because the shell environment used here does not currently expose a working `docker` CLI in `PATH`.

## Sources

- Internal phase plan and roadmap decisions captured in `.planning/ROADMAP.md` and `.planning/PROJECT.md`
- Existing control-api and Docker topology in `services/control-api/src/*` and `infra/docker-compose.yml`

---
*Phase: 05-guardrails-and-operations*
*Research completed: 2026-03-27*
