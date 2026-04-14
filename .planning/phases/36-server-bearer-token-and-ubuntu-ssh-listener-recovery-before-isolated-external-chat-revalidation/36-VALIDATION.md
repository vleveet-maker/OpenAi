---
phase: 36
slug: server-bearer-token-and-ubuntu-ssh-listener-recovery-before-isolated-external-chat-revalidation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-14
---

# Phase 36 Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | PowerShell parser checks plus Vitest for `control-api` route/admin coverage |
| Focused test command | `npm.cmd --prefix services/control-api test -- internal-post-phase35-server-token-ssh-listener-recovery.test.ts internal-admin-page.test.ts` |
| Full suite command | `npm.cmd --prefix services/control-api test` |
| Build command | `npm.cmd --prefix services/control-api run build` |
| Live acceptance | bounded Windows plus Ubuntu run against `http://77.66.186.75` |

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated Command | Status |
|---------|------|-------------|-----------|-------------------|--------|
| 36-01-01 | 01 | SBTU-01, SBTU-02 | parser | PowerShell parser check for the new recovery wrapper | pending |
| 36-01-02 | 01 | SBTU-01, SBTU-02 | parser | PowerShell parser check for any touched tunnel/token helpers | pending |
| 36-01-03 | 01 | SBTU-01, SBTU-02 | artifact review | Generated artifact contains source labels but no token/password values | pending |
| 36-02-01 | 02 | SBTU-03 | unit | Focused latest-route test | pending |
| 36-02-02 | 02 | SBTU-03 | unit | Focused `/internal/admin` test | pending |
| 36-02-03 | 02 | SBTU-03 | build | Full test suite and build | pending |
| 36-03-01 | 03 | SBTU-01, SBTU-02, SBTU-04 | live | Verify token source, Ubuntu SSH, nginx, and listeners | pending |
| 36-03-02 | 03 | SBTU-04 | live | Rerun authenticated external `healthz/models/chat` against `77.66.186.75` | pending |
| 36-03-03 | 03 | SBTU-01..04 | artifact | Write `36-03-SUMMARY.md`, `36-VERIFICATION.md`, JSON and Markdown summary | pending |

## Manual Acceptance Scenarios

- Scenario A: token remains missing. The phase ends `hold_rollout`, does not run chat as if authenticated proof happened, and records `token_missing` as the blocker.
- Scenario B: token is found but Ubuntu SSH is still blocked. The phase ends `hold_rollout` and records per-host SSH reachability truth.
- Scenario C: token and SSH are good, but Ubuntu listeners `14021..14027` or `14040` are missing. The wrapper attempts bounded tunnel recovery, then records listener truth and ends `hold_rollout` if still missing.
- Scenario D: token, SSH, nginx, and listeners are good; authenticated `/healthz`, `/v1/models`, and `/v1/chat/completions` pass against `http://77.66.186.75`; the phase ends `externally_ready`.
- Scenario E: token, SSH, and listeners are good, but server browser-data transfer still blocks on `robocopy exit code 11`; the phase ends `hold_rollout` and makes that the next blocker instead of returning to local browser debugging.
- Scenario F: `/internal/admin` and `GET /internal/post-phase35-server-token-ssh-listener-recovery/latest` show the same latest artifact before the final verdict is claimed.

## Validation Sign-Off

- [x] The plan keeps Phase 36 scoped to token, Ubuntu SSH, listener truth, and one external revalidation.
- [x] The plan forbids storing bearer-token values or SSH passwords in tracked artifacts.
- [x] The plan keeps preserve-first account handling: no profile deletion, cookie clearing, local-storage clearing, mass restart, or mass relogin.
- [x] The plan records `robocopy exit code 11` as a possible next blocker without making copy repair the primary scope.
