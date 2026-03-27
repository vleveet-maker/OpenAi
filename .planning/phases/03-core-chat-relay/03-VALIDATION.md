---
phase: 03
slug: core-chat-relay
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 03 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` across `services/control-api`, `workers/agent`, and `apps/session-client` |
| **Config file** | `services/control-api/vitest.config.ts`, `workers/agent/vitest.config.ts`, `apps/session-client/vite.config.ts` |
| **Quick run command** | `cmd /c npm.cmd test --prefix services/control-api` |
| **Full suite command** | `cmd /c npm.cmd test --prefix services/control-api && npm.cmd test --prefix workers/agent && npm.cmd test --prefix apps/session-client` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run the package-local `npm test` command for the package touched most by that task.
- **After every plan wave:** Run the full suite command across all three packages.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 45 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | CHAT-04 | unit | `npm.cmd test --prefix services/control-api -- chat-relay-service` | W0 | pending |
| 03-01-02 | 01 | 1 | CHAT-01, CHAT-03 | integration | `npm.cmd test --prefix services/control-api -- public-chat` | W0 | pending |
| 03-02-01 | 02 | 2 | CHAT-01 | unit | `npm.cmd test --prefix workers/agent -- relay-runner` | W0 | pending |
| 03-02-02 | 02 | 2 | CHAT-02 | unit | `npm.cmd test --prefix workers/agent -- selector-map` | W0 | pending |
| 03-02-03 | 02 | 2 | CHAT-01, CHAT-02 | integration | `npm.cmd test --prefix services/control-api -- worker-relay-client` | W0 | pending |
| 03-03-01 | 03 | 3 | CHAT-03, CHAT-04 | component | `npm.cmd test --prefix apps/session-client -- app` | Yes | pending |
| 03-03-02 | 03 | 3 | CHAT-01, CHAT-02 | component | `npm.cmd test --prefix apps/session-client -- use-session-view` | W0 | pending |

*Status: pending, green, red, or flaky.*

---

## Wave 0 Requirements

- [ ] `workers/agent/tsconfig.json` - add TypeScript build configuration for worker-agent
- [ ] `workers/agent/vitest.config.ts` - add worker-agent test runner configuration
- [ ] `workers/agent/test/relay-runner.test.ts` - add unit coverage for submit and capture flow
- [ ] `services/control-api/test/chat-relay-service.test.ts` - add relay-domain coverage
- [ ] `services/control-api/test/public-chat.test.ts` - add public message route coverage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| One live prompt travels through a manually authenticated worker and returns to the shared-screen app | CHAT-01, CHAT-02 | ChatGPT DOM and login state are external and should not be the default automated path | Mark one worker `ready`, open the Phase 3 active screen, send a short text prompt, confirm one assistant reply appears in the UI without exposing the raw worker browser |

---

## Validation Sign-Off

- [ ] All tasks have automated verify steps or explicit Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing worker-agent test infrastructure
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
