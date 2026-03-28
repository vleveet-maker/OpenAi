---
phase: 10
slug: chatgpt-ui-drift-hardening
status: partial
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-28
updated: 2026-03-28
---

# Phase 10 - Validation Strategy

> Retroactive Nyquist audit for ChatGPT UI drift hardening.

---

## Goal

Prove that relay and fresh-chat bootstrap behave predictably against the current ChatGPT UI, and that selector maintenance is centralized enough to absorb future drift without hunting through unrelated files.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` in `workers/agent` and `services/control-api` |
| **Config file** | `workers/agent/vitest.config.ts`, `services/control-api/vitest.config.ts` |
| **Quick run command** | `cmd /c npm.cmd test --prefix workers/agent` |
| **Full suite command** | `cmd /c npm.cmd test --prefix workers/agent && npm.cmd run build --prefix workers/agent && npm.cmd test --prefix services/control-api && npm.cmd run build --prefix services/control-api` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After selector-map or bootstrap-runner changes:** Run `cmd /c npm.cmd test --prefix workers/agent`
- **After control-api worker contract changes:** Run `cmd /c npm.cmd test --prefix services/control-api`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds for automatable checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | STAB-03 | unit | `cmd /c npm.cmd test --prefix workers/agent -- relay-selector-map bootstrap-selector-map` | Yes | green |
| 10-01-02 | 01 | 1 | STAB-03 | build | `cmd /c npm.cmd run build --prefix workers/agent` | Yes | green |
| 10-02-01 | 02 | 2 | STAB-01, STAB-03 | unit | `cmd /c npm.cmd test --prefix workers/agent -- relay-runner` | Yes | green |
| 10-02-02 | 02 | 2 | STAB-01 | integration | `cmd /c npm.cmd test --prefix services/control-api -- chat-relay-service` | Yes | green |
| 10-02-03 | 02 | 2 | STAB-01 | live | `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\test-host-worker-relay.ps1 -WorkerId wife -TimeoutSeconds 180` | Yes | green |
| 10-03-01 | 03 | 3 | STAB-02, STAB-03 | unit | `cmd /c npm.cmd test --prefix workers/agent -- temporary-chat-runner bootstrap-selector-map` | Yes | green |
| 10-03-02 | 03 | 3 | STAB-02 | live | `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\test-host-worker-relay.ps1 -WorkerId shared-1 -TimeoutSeconds 180` | Yes | green |
| 10-03-03 | 03 | 3 | STAB-01 | live | `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\test-host-worker-relay.ps1 -WorkerId dad -TimeoutSeconds 180` | Yes | partial |

*Status: pending, green, red, or flaky.*

---

## Wave 0 Requirements

Existing Phase 9 and worker-agent infrastructure were sufficient; no extra validation scaffolding was needed beyond the targeted host-worker relay probe.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Confirm the current localized `Temporary Chat` UI still reaches a usable fresh chat on a logged-in worker | STAB-02 | Depends on real ChatGPT account state and current localized web UI | Run `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\test-host-worker-relay.ps1 -WorkerId wife -TimeoutSeconds 180` or `shared-1` and confirm bootstrap becomes ready before the relay probe sends |
| Confirm the residual `dad` path is still an auth/profile problem rather than generic selector drift | STAB-01 | Depends on the real household profile state inside ChatGPT | Run `powershell -ExecutionPolicy Bypass -File .\\infra\\host-worker\\test-host-worker-relay.ps1 -WorkerId dad -TimeoutSeconds 180` and confirm the current result is `bootstrap_auth_required` until the operator reauthenticates that profile |

---

## Not Covered Here

- Repeatable operator smoke history and last-smoke reporting belong to Phase 11.
- Billing, product UX expansion, and public multi-chat surface changes are outside this phase.

---

## Validation Sign-Off

- [x] All tasks have automated verify steps or explicit live/manual coverage
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers the missing targeted live-probe scaffolding
- [x] No watch-mode flags
- [x] Feedback latency < 60s for automatable checks
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-28 (partial: `dad` still needs manual reauth before the final three-worker live proof)
