---
phase: 09
slug: internal-host-pool-orchestration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 09 - Validation Strategy

> Per-phase validation contract for internal admin orchestration of the proxied host-native pool.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` in `services/host-controller`, plus `vitest` and `supertest` in `services/control-api` |
| **Config file** | `services/host-controller/package.json`, `services/control-api/vitest.config.ts` |
| **Quick run command** | `cmd /c npm.cmd test --prefix services/control-api -- internal-host-pool internal-admin-page` |
| **Full suite command** | `cmd /c npm.cmd test --prefix services/host-controller && npm.cmd test --prefix services/control-api && npm.cmd run build --prefix services/control-api` |
| **Estimated runtime** | ~35 seconds |

---

## Sampling Rate

- **After every host-controller lifecycle change:** Run `cmd /c npm.cmd test --prefix services/host-controller`
- **After every control-api host-pool route or service change:** Run `cmd /c npm.cmd test --prefix services/control-api -- internal-host-pool`
- **After every admin-page change:** Run `cmd /c npm.cmd test --prefix services/control-api -- internal-admin-page`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | ORCH-02, ORCH-03 | unit | `cmd /c npm.cmd test --prefix services/host-controller` | Yes | pending |
| 09-01-02 | 01 | 1 | ORCH-01, ORCH-02, ORCH-03 | integration | `cmd /c npm.cmd test --prefix services/host-controller` | Yes | pending |
| 09-01-03 | 01 | 1 | ORCH-01, ORCH-02, ORCH-03 | integration | `cmd /c npm.cmd test --prefix services/host-controller` | Yes | pending |
| 09-02-01 | 02 | 2 | ORCH-01, ORCH-02, ORCH-03 | unit | `cmd /c npm.cmd test --prefix services/control-api -- internal-host-pool` | Yes | pending |
| 09-02-02 | 02 | 2 | ORCH-01, ORCH-02, ORCH-03 | integration | `cmd /c npm.cmd test --prefix services/control-api -- internal-host-pool` | Yes | pending |
| 09-02-03 | 02 | 2 | ORCH-01, ORCH-02, ORCH-03 | build-plus-route | `cmd /c npm.cmd test --prefix services/control-api -- internal-host-pool && npm.cmd run build --prefix services/control-api` | Yes | pending |
| 09-03-01 | 03 | 3 | ORCH-01, ORCH-02, ORCH-03 | integration | `cmd /c npm.cmd test --prefix services/control-api -- internal-admin-page` | Yes | pending |
| 09-03-02 | 03 | 3 | ORCH-01, ORCH-02, ORCH-03 | integration | `cmd /c npm.cmd test --prefix services/control-api -- internal-admin-page` | Yes | pending |
| 09-03-03 | 03 | 3 | ORCH-01, ORCH-02, ORCH-03 | docs-plus-regression | `cmd /c npm.cmd test --prefix services/control-api -- internal-admin-page internal-host-pool` | Yes | pending |

*Status: pending, green, red, or flaky.*

---

## Wave 0 Requirements

- [ ] `services/host-controller/test/host-controller.test.mjs` - controller lifecycle and pool stop coverage
- [ ] `services/host-controller/test/server.test.mjs` - route coverage for `POST /pool/stop` and richer health payloads
- [ ] `services/control-api/test/internal-host-pool.test.ts` - control-api lifecycle service and route coverage
- [ ] `services/control-api/test/internal-admin-page.test.ts` - admin rendering and host-pool endpoint wiring coverage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Start the proxied host-native pool from `/internal/admin` and observe `starting -> ready` or `starting -> degraded` with explicit layer detail | ORCH-01, ORCH-03 | Requires real Windows browsers, real sing-box runtime, and live internal admin interaction | Open `http://127.0.0.1:8081/internal/admin`, press `Start pool`, and confirm the lifecycle panel names proxy, controller, and worker states clearly |
| Stop the proxied host-native pool from `/internal/admin` and confirm browsers disappear while worker states settle to the expected disconnected or idle view | ORCH-02, ORCH-03 | Requires real Windows processes and live host cleanup | Press `Stop pool` from the admin page, confirm the host browser windows close, and verify `/internal/workers` no longer shows them as ready |

---

## Validation Sign-Off

- [ ] All host-pool tasks have automated verification or explicit manual-only coverage
- [ ] `services/host-controller` and `services/control-api` both have phase-specific tests before execution starts
- [ ] Sampling continuity: no three consecutive tasks without automated verification
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s for automatable checks
- [ ] `nyquist_compliant: true` set in frontmatter after approval

**Approval:** pending
