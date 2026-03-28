---
phase: 07
slug: proxy-backed-on-demand-host-worker-pool
status: partial
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-28
updated: 2026-03-28
---

# Phase 07 - Validation Strategy

> Retroactive Nyquist audit for the proxy-backed on-demand host worker pool.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` in `services/host-controller`, plus `vitest` in `services/control-api` |
| **Config file** | `services/host-controller/package.json`, `services/control-api/vitest.config.ts` |
| **Quick run command** | `cmd /c npm.cmd test --prefix services/host-controller` |
| **Full suite command** | `cmd /c npm.cmd test --prefix services/host-controller && npm.cmd test --prefix services/control-api && npm.cmd run build --prefix services/control-api` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every proxy/config change:** Run `cmd /c npm.cmd test --prefix services/host-controller`
- **After every control-api worker contract change:** Run `cmd /c npm.cmd test --prefix services/control-api`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | PROXY-01, PROXY-02, SECU-04 | integration | `cmd /c npm.cmd test --prefix services/host-controller` | Yes | green |
| 07-01-02 | 01 | 1 | HOST-01, HOST-02, HOST-03, PROXY-03 | regression | `cmd /c npm.cmd test --prefix services/control-api` | Yes | green |
| 07-01-03 | 01 | 1 | LIVE-01, LIVE-02 | manual/live | `n/a - see 07-VERIFICATION.md live smoke` | Yes | green |

*Status: pending, green, red, or flaky.*

---

## Wave 0 Requirements

Existing infrastructure covers all automatable Phase 7 requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Start the proxied host-native pool and confirm all three workers report `ready` | HOST-01, HOST-02, HOST-03, PROXY-03 | Requires real Windows host browsers, running sing-box, and live control-api connectivity | Run `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\start-proxied-host-pool.ps1 -SkipInstall`, then check `GET http://127.0.0.1:8081/internal/workers` for `dad`, `wife`, and `shared-1` as `ready` |
| Complete proxied live relay smoke on at least two workers | LIVE-01, LIVE-02 | Requires logged-in ChatGPT accounts, live proxy providers, and current ChatGPT UI | Create test sessions through the app, route them onto two different workers, and confirm exact replies come back through the proxied pool |
| Stop the proxied host-native pool and confirm all workers return to `disconnected` without losing profiles | HOST-02, PROXY-03 | Requires live host-native worker processes and persisted local browser profiles | Run `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\stop-proxied-host-pool.ps1`, then check `GET http://127.0.0.1:8081/internal/workers` for all workers in `disconnected` |

---

## Validation Sign-Off

- [x] All tasks have automated verify steps or explicit manual-only coverage
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all automatable gaps
- [x] No watch-mode flags
- [x] Feedback latency < 60s for automatable checks
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-28 (partial: live host/browser behaviors remain manual-only)
