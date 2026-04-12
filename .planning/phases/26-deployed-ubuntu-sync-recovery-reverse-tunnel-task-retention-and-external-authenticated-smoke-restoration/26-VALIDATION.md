---
phase: 26
slug: deployed-ubuntu-sync-recovery-reverse-tunnel-task-retention-and-external-authenticated-smoke-restoration
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
---

# Phase 26 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | PowerShell parser checks + Vitest via `npm.cmd --prefix services/control-api test` |
| Config file | `services/control-api/package.json` |
| Quick run command | `npm.cmd --prefix services/control-api test -- edge-config.test.ts internal-admin-page.test.ts internal-post-phase25-external-restoration.test.ts` |
| Full suite command | `npm.cmd --prefix services/control-api test` then `npm.cmd --prefix services/control-api run build` |
| Estimated runtime | ~60 seconds |

## Sampling Rate

- After every task commit: run the affected parser checks plus the quick route/admin test command.
- After every plan wave: run `npm.cmd --prefix services/control-api test` then `npm.cmd --prefix services/control-api run build`.
- Before `$gsd-verify-work`: the full suite must be green.
- Max feedback latency: 60 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | UTSR-01, UTSR-02 | parser + grep | `powershell -NoProfile -Command "[void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/recover-reverse-tunnels-and-external-api-readiness.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/recover-ubuntu-sync-and-external-auth-smoke.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/start-reverse-tunnels.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/register-browser-block-tasks.ps1',[ref]$null,[ref]$null)"` | pending | pending |
| 26-01-02 | 01 | 1 | UTSR-01, UTSR-02 | docs + config grep | `rg -n "phase26-ubuntu-sync-recovery-v1|127.0.0.1:4010|OWMCGP Browser Block - Reverse Tunnels|externally_ready|hold_rollout|GitHub|windows-browser-block-api-20260331|post-phase25-external-restoration" infra/windows-block docs .planning/phases/26-deployed-ubuntu-sync-recovery-reverse-tunnel-task-retention-and-external-authenticated-smoke-restoration` | pending | pending |
| 26-02-01 | 02 | 2 | UTSR-03 | unit | `npm.cmd --prefix services/control-api test -- internal-post-phase25-external-restoration.test.ts` | pending | pending |
| 26-02-02 | 02 | 2 | UTSR-03 | unit | `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts edge-config.test.ts` | green | pending |
| 26-03-01 | 03 | 3 | UTSR-01, UTSR-02, UTSR-03, UTSR-04 | manual + artifact grep | `rg -n "externally_ready|hold_rollout|ubuntuSshReachable|canonicalPublicUpstream|reverseTunnelTaskStatus|ubuntuTunnelListenerStatus|readyWorkerCount|externalModelsStatus|externalChatStatus|post-phase25 external restoration" .planning/phases/26-deployed-ubuntu-sync-recovery-reverse-tunnel-task-retention-and-external-authenticated-smoke-restoration/26-VERIFICATION.md .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md .planning/PROJECT.md` | pending | pending |

## Wave 0 Requirements

- [ ] `services/control-api/test/internal-post-phase25-external-restoration.test.ts` - route coverage for the new latest restoration surface
- [ ] `infra/windows-block/recover-ubuntu-sync-and-external-auth-smoke.ps1` - canonical Phase 26 wrapper
- [ ] `.planning/phases/26-deployed-ubuntu-sync-recovery-reverse-tunnel-task-retention-and-external-authenticated-smoke-restoration/26-VERIFICATION.md` - live closeout artifact

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ubuntu repo-backed sync and canonical upstream truth | UTSR-01 | Requires the real Ubuntu public-owner host | Pull the tracked branch on Ubuntu, run `sudo nginx -t`, confirm `nginx -T` still proxies `80/443/8080` to `127.0.0.1:4010`, and confirm no stale `192.168.88.250` upstream remains |
| Reverse-tunnel task retention and listener presence | UTSR-02 | Requires the real Windows browser-block host plus Ubuntu listener observation | Confirm the scheduled task is `Running`, confirm it stays retained after a settle window, and confirm Ubuntu listeners `14021..14027` and `14040` are present |
| Authenticated external smoke | UTSR-04 | Requires the real public path and a valid bearer token on some execution host | Run authenticated smoke against `http://77.66.186.75/healthz`, `http://77.66.186.75/v1/models`, and `http://77.66.186.75/v1/chat/completions` using model `owmcgp-browser`, then record `externally_ready` or `hold_rollout` |

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies.
- [x] Sampling continuity avoids three consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency remains below 60 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

Approval: pending
