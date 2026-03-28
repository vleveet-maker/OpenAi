---
phase: 05-guardrails-and-operations
verified: 2026-03-27T16:25:00+03:00
status: passed
score: 8/8 must-haves verified
---

# Phase 05: Guardrails and Observability Verification Report

**Phase Goal:** Prevent unsafe access patterns and make the worker pool observable for operators and infrastructure.  
**Verified:** 2026-03-27T16:25:00+03:00  
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The default Docker topology now has a single host-exposed edge instead of publishing `control-api` and `session-client` directly. | x VERIFIED | `infra/docker-compose.yml` adds `edge` and removes direct host port publishing from the other app services. |
| 2 | Public traffic is blocked from `/internal/*`, `/healthz`, and `/readyz` at the edge layer. | x VERIFIED | `infra/nginx/default.conf.template` returns `404` for those public paths. |
| 3 | Internal admin access now depends on the internal admin token in the normal deployment path. | x VERIFIED | `services/control-api/src/security/internal-admin-guard.ts` now allows private-network access only when explicitly requested; `services/control-api/src/server.ts` uses token-only default guard wiring. |
| 4 | The backend exposes safe liveness and readiness JSON without leaking worker profile paths or recovery data. | x VERIFIED | `services/control-api/src/routes/internal-health.ts` implements `/healthz` and `/readyz`, and `services/control-api/test/internal-observability.test.ts` verifies the payload shape. |
| 5 | Worker lifecycle and session failure events are stored durably in SQLite. | x VERIFIED | `services/control-api/src/observability/operator-events.ts` creates and writes `operator_events`. |
| 6 | Relay retry scheduling and terminal relay failures now appear in the internal observability trail. | x VERIFIED | `services/control-api/src/chat/chat-relay-service.ts` records `relay_retry_scheduled` and `relay_terminal_failure`, and `services/control-api/test/internal-observability.test.ts` verifies the API output. |
| 7 | Restart and reauthentication actions now appear on the internal observability surface. | x VERIFIED | `services/control-api/src/routes/internal-worker-actions.ts`, `services/control-api/src/routes/internal-recovery.ts`, and `services/control-api/test/internal-observability.test.ts`. |
| 8 | Operators can inspect worker summary, failures, and lifecycle events from a read-only internal admin page. | x VERIFIED | `services/control-api/src/routes/internal-admin-page.ts` and `services/control-api/src/routes/internal-observability.ts`. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `infra/nginx/default.conf.template` | Split public/internal edge config | x EXISTS + SUBSTANTIVE | Public deny rules plus internal token injection |
| `services/control-api/src/security/internal-admin-guard.ts` | Token-first admin guard | x EXISTS + SUBSTANTIVE | Private-network bypass is no longer the default path |
| `services/control-api/src/observability/operator-events.ts` | Durable operator events and summaries | x EXISTS + SUBSTANTIVE | Adds `operator_events`, list queries, and summary aggregation |
| `services/control-api/src/routes/internal-observability.ts` | Internal events and summary routes | x EXISTS + SUBSTANTIVE | Adds `/internal/observability/events` and `/internal/observability/summary` |
| `services/control-api/src/routes/internal-admin-page.ts` | Read-only internal admin UI | x EXISTS + SUBSTANTIVE | Renders operator summary and polling page |
| `services/control-api/test/internal-observability.test.ts` | Boundary and observability coverage | x EXISTS + SUBSTANTIVE | Covers token-only admin, health/readiness, relay failures, and lifecycle events |
| `services/control-api/test/edge-config.test.ts` | Edge contract coverage | x EXISTS + SUBSTANTIVE | Confirms listener split and admin token injection in the Nginx template |
| `docs/internal-worker-ops.md` | Updated operator guidance | x EXISTS + SUBSTANTIVE | Documents public/internal entrypoints and observability usage |

**Artifacts:** 8/8 verified

### Automated Checks

| Command | Status |
|---------|--------|
| `cmd /c npm.cmd run build` in `services/control-api` | x PASSED |
| `cmd /c npm.cmd test` in `services/control-api` | x PASSED |
| `cmd /c npm.cmd run build` in `workers/agent` | x PASSED |
| `cmd /c npm.cmd test` in `workers/agent` | x PASSED |
| `cmd /c npm.cmd run build` in `apps/session-client` | x PASSED |
| `cmd /c npm.cmd test` in `apps/session-client` | x PASSED |

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| SECU-01: End users can access ChatGPT only through the approved application surface, not the raw worker browser UI | x SATISFIED | - |
| OBSV-01: Operator can inspect recent worker lifecycle events and session failures from the internal admin surface | x SATISFIED | - |
| OBSV-02: System exposes health signals that container or host monitors can consume without parsing the browser UI | x SATISFIED | - |

**Coverage:** 3/3 requirements satisfied

## Anti-Patterns Found

None.

## Human Verification Required

One live Docker smoke test is still recommended: start the updated compose stack on a host with Docker available, confirm `:8080` serves the user app, confirm `:8080/internal/admin` is blocked, and confirm `127.0.0.1:8081/internal/admin`, `/healthz`, and `/readyz` behave as expected through the Nginx edge.

## Gaps Summary

**No blocking gaps found.** Phase goal achieved.
