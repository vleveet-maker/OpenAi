---
phase: 04
slug: resilience-and-reconnect
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-27
---

# Phase 04 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` across `services/control-api`, `workers/agent`, and `apps/session-client` |
| **Config file** | `services/control-api/vitest.config.ts`, `workers/agent/vitest.config.ts`, `apps/session-client/vite.config.ts` |
| **Quick run command** | `cmd /c npm.cmd test --prefix services/control-api` |
| **Full suite command** | `cmd /c npm.cmd test --prefix services/control-api && npm.cmd test --prefix workers/agent && npm.cmd test --prefix apps/session-client` |
| **Estimated runtime** | ~50 seconds |

---

## Sampling Rate

- **After every task commit:** Run the package-local `npm test` command for the package touched most by that task.
- **After every plan wave:** Run the full suite command across all three packages.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 50 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | RELY-02 | unit | `npm.cmd test --prefix services/control-api -- chat-relay-service` | Yes | green |
| 04-01-02 | 01 | 1 | RELY-01, RELY-02 | integration | `npm.cmd test --prefix services/control-api -- public-chat` | Yes | green |
| 04-01-03 | 01 | 1 | RELY-02 | unit | `npm.cmd test --prefix workers/agent -- relay-runner` | Yes | green |
| 04-02-01 | 02 | 2 | RELY-03 | component | `npm.cmd test --prefix apps/session-client -- app` | Yes | green |
| 04-02-02 | 02 | 2 | RELY-01, RELY-03 | component | `npm.cmd test --prefix apps/session-client -- use-session-view` | Yes | green |
| 04-03-01 | 03 | 3 | ADMN-03 | integration | `npm.cmd test --prefix services/control-api -- internal-worker-actions` | Yes | green |
| 04-03-02 | 03 | 3 | RELY-01 | unit | `npm.cmd test --prefix services/control-api -- worker-health-monitor` | Yes | green |

*Status: pending, green, red, or flaky.*

---

## Wave 0 Requirements

- [x] `services/control-api/test/internal-worker-actions.test.ts` - restart orchestration coverage
- [x] `services/control-api/test/worker-health-monitor.test.ts` - worker liveness and recovery visibility coverage
- [x] `apps/session-client/src/use-session-view.test.ts` or equivalent - reconnect-specific hook coverage if app-level coverage becomes too indirect

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A live worker relay fails transiently before browser submit and retries without creating a duplicate user message | RELY-02 | Requires inducing a real worker-side failure window around browser automation | Start an active session, inject a temporary worker-agent failure before submit, confirm only one user turn exists and the assistant placeholder retries then resolves or fails once |
| A worker container is restarted from the internal admin path and becomes visible again after health recovery | ADMN-03 | Depends on Docker socket access and real container lifecycle | Use the internal restart route for one idle worker, confirm it enters `starting`, then returns to `ready` or `reauth_required` through the health monitor |
| The shared screen resumes the last active session after the app is closed and reopened | RELY-03 | Validates local storage plus route bootstrap on a real browser | Start an active session, close the app tab, reopen the root route, and confirm it restores the same session on the same worker |

---

## Validation Sign-Off

- [x] All tasks have automated verify steps or explicit Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing restart and reconnect references
- [x] No watch-mode flags
- [x] Feedback latency < 50s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
