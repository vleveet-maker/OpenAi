# Phase 5: Guardrails and Observability - Context

**Gathered:** 2026-03-27
**Status:** Completed during implementation sync

## Phase Boundary

Phase 5 closes the last v1 gaps around secure access boundaries and operator visibility. The project already had a functioning public session/chat flow plus internal worker control routes, but access still depended too much on direct container ports and there was no durable operator event trail.

This phase does not add public user auth, TLS automation, Prometheus, Grafana, or a second frontend package. It keeps the current shared-screen user app and internal worker flows, then hardens the edge and adds a small internal-only read-only admin surface.

The directory slug remains `.planning/phases/05-guardrails-and-operations` even though the roadmap title is "Guardrails and Observability".

## Locked Decisions

- Use one Nginx edge container as the only host-exposed entrypoint in the default Docker deployment.
- Keep the public app on `:8080` and the internal admin entry on loopback-only `127.0.0.1:8081`.
- Switch internal admin enforcement to token-first operation instead of relying on private-network auto-bypass.
- Add a durable operator event log to the existing SQLite database instead of introducing another datastore or message bus.
- Serve the minimal operator page directly from `control-api` so the admin surface stays lightweight and internal-only.

## Canonical References

- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `infra/docker-compose.yml`
- `infra/nginx/default.conf.template`
- `services/control-api/src/server.ts`
- `services/control-api/src/security/internal-admin-guard.ts`
- `services/control-api/src/observability/operator-events.ts`
- `services/control-api/src/routes/internal-observability.ts`
- `services/control-api/src/routes/internal-admin-page.ts`
- `docs/internal-worker-ops.md`

## Deferred Ideas

- External metrics backends and dashboards
- Public user authentication and authorization
- TLS automation and certificate management
- Writable admin workflows beyond restart and reauth

---
*Phase: 05-guardrails-and-operations*
*Context gathered: 2026-03-27*
