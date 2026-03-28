---
phase: 08
slug: per-chat-temporary-chat-isolation-and-latest-reasoning-model-selection
status: partial
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-28
updated: 2026-03-28
---

# Phase 08 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` across `services/control-api`, `workers/agent`, and `apps/session-client` |
| **Config file** | `services/control-api/vitest.config.ts`, `workers/agent/vitest.config.ts`, `apps/session-client/vite.config.ts` |
| **Quick run command** | `cmd /c npm.cmd test --prefix services/control-api` |
| **Full suite command** | `cmd /c npm.cmd test --prefix services/control-api && npm.cmd test --prefix workers/agent && npm.cmd test --prefix apps/session-client` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the package-local `npm test` command for the package touched most by that task.
- **After every plan wave:** Run the full suite command across all three packages.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | CHATISO-01, CHATISO-04 | unit | `cmd /c npm.cmd test --prefix services/control-api -- chat-bootstrap-service` | Yes | green |
| 08-01-02 | 01 | 1 | CHATISO-01, CHATISO-04 | integration | `cmd /c npm.cmd test --prefix services/control-api -- public-sessions public-chat` | Yes | green |
| 08-02-01 | 02 | 2 | CHATISO-01, CHATISO-02, CHATISO-03 | unit | `cmd /c npm.cmd test --prefix workers/agent -- temporary-chat-runner` | Yes | green |
| 08-02-02 | 02 | 2 | CHATISO-02, CHATISO-03 | unit | `cmd /c npm.cmd test --prefix workers/agent -- bootstrap-selector-map` | Yes | green |
| 08-03-01 | 03 | 3 | CHATISO-04 | component | `cmd /c npm.cmd test --prefix apps/session-client -- app.test.tsx` | Yes | green |
| 08-03-02 | 03 | 3 | CHATISO-01, CHATISO-02, CHATISO-03 | component | `cmd /c npm.cmd test --prefix apps/session-client -- app.test.tsx` | Yes | green |

*Status: pending, green, red, or flaky.*

---

## Wave 0 Requirements

Existing infrastructure covers all automatable Phase 8 requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A newly started session opens on a fresh temporary chat instead of the prior conversation | CHATISO-01, CHATISO-02 | ChatGPT UI state is external and account-specific | Start a new session on a logged-in worker that previously had another conversation open, confirm the first visible chat is fresh and temporary before sending |
| The prepared chat uses the expected current reasoning model | CHATISO-03 | Current model labels are product-controlled and time-sensitive | Start a new session, inspect the active model label in ChatGPT, and confirm it matches the configured preferred reasoning model candidate that was current at implementation time |

---

## Validation Sign-Off

- [x] All tasks have automated verify steps or explicit manual-only coverage
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers missing bootstrap-specific tests
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-28 (partial: current ChatGPT UI still requires live smoke)

## Validation Audit 2026-03-28

| Metric | Count |
|--------|-------|
| Gaps found | 6 |
| Resolved | 6 |
| Escalated | 2 |
