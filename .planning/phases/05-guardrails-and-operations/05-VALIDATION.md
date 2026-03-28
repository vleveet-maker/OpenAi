---
phase: 05
slug: guardrails-and-operations
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-27
---

# Phase 05 - Validation Strategy

> Per-phase validation contract for boundary hardening and operator observability.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` in `services/control-api`, `workers/agent`, and `apps/session-client` |
| **Primary package** | `services/control-api` |
| **Quick run command** | `cmd /c npm.cmd test --prefix services/control-api` |
| **Full suite command** | `cmd /c npm.cmd test --prefix services/control-api && npm.cmd test --prefix workers/agent && npm.cmd test --prefix apps/session-client` |
| **Estimated runtime** | ~10 seconds |

## Sampling Rate

- After each backend or infra-facing task, run `services/control-api` tests.
- Before phase sign-off, run builds and tests for all three packages.
- Keep one manual Docker smoke test for the reverse-proxy stack because local CLI access to Docker is environment-dependent.

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated Command | Status |
|---------|------|-------------|-----------|-------------------|--------|
| 05-01-01 | 01 | SECU-01 | integration | `npm.cmd test --prefix services/control-api -- edge-config` | green |
| 05-01-02 | 01 | SECU-01, OBSV-02 | integration | `npm.cmd test --prefix services/control-api -- internal-observability` | green |
| 05-02-01 | 02 | OBSV-01 | unit | `npm.cmd test --prefix services/control-api -- worker-health-monitor` | green |
| 05-02-02 | 02 | OBSV-01 | integration | `npm.cmd test --prefix services/control-api -- internal-observability` | green |

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Public edge exposes only the user app on `:8080` while internal admin remains loopback-only on `:8081` | SECU-01 | Requires a live Docker host and bound host ports | Start the compose stack, visit `http://<host>:8080/`, then confirm `http://<host>:8080/internal/admin` is blocked while `http://127.0.0.1:8081/internal/admin` works locally |
| Monitor endpoints stay reachable through the internal edge in a real deployment | OBSV-02 | Depends on the live Nginx container and host bindings | Query `http://127.0.0.1:8081/healthz` and `http://127.0.0.1:8081/readyz` after startup |

## Validation Sign-Off

- [x] Boundary routes have automated coverage
- [x] Event trail and admin page have automated coverage
- [x] Health/readiness routes have automated coverage
- [x] Full package builds and tests are green
- [x] One manual Docker smoke test remains recommended

**Approval:** approved
