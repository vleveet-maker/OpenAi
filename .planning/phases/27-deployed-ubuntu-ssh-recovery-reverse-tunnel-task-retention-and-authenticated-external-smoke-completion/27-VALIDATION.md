---
phase: 27
slug: deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
---

# Phase 27 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | PowerShell parser checks + Vitest via `npm.cmd --prefix services/control-api test` |
| Config file | `services/control-api/package.json` |
| Quick run command | `npm.cmd --prefix services/control-api test -- edge-config.test.ts internal-admin-page.test.ts internal-post-phase26-ubuntu-ssh-recovery.test.ts` |
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
| 27-01-01 | 01 | 1 | URTS-01, URTS-02 | parser + grep | `powershell -NoProfile -Command "[void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/recover-ubuntu-ssh-reverse-tunnels-and-authenticated-smoke.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/start-reverse-tunnels.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/register-browser-block-tasks.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/probe-public-api.ps1',[ref]$null,[ref]$null)"` | pending | pending |
| 27-01-02 | 01 | 1 | URTS-01, URTS-02 | docs + prompt grep | `rg -n "phase27-ubuntu-ssh-recovery-v1|windows-browser-block-api-20260331|127.0.0.1:4010|reverse tunnel|GitHub|token|externally_ready|hold_rollout|post-phase26-ubuntu-ssh-recovery" infra/windows-block docs .planning/phases/27-deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion` | pending | pending |
| 27-02-01 | 02 | 2 | URTS-03 | unit | `npm.cmd --prefix services/control-api test -- internal-post-phase26-ubuntu-ssh-recovery.test.ts` | pending | pending |
| 27-02-02 | 02 | 2 | URTS-03 | unit | `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts edge-config.test.ts` | pending | pending |
| 27-03-01 | 03 | 3 | URTS-01, URTS-02, URTS-03, URTS-04 | manual + artifact grep | `rg -n "externally_ready|hold_rollout|ubuntuSshReachable|ubuntuRepoPath|ubuntuRepoCommit|reverseTunnelTaskStatus|ubuntuTunnelListenerStatus|authenticatedSmokeTokenSource|externalChatStatus|post-phase26-ubuntu-ssh-recovery" .planning/phases/27-deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion/27-VERIFICATION.md .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md .planning/PROJECT.md` | pending | pending |

## Wave 0 Requirements

- [ ] `services/control-api/test/internal-post-phase26-ubuntu-ssh-recovery.test.ts` - route coverage for the new latest recovery surface
- [ ] `infra/windows-block/recover-ubuntu-ssh-reverse-tunnels-and-authenticated-smoke.ps1` - canonical Phase 27 wrapper
- [ ] `.planning/phases/27-deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion/27-VERIFICATION.md` - live closeout artifact

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ubuntu repo-backed SSH recovery and exact topology truth | URTS-01 | Requires the real Ubuntu public-owner host | Recover SSH to `77.66.186.75:2222`, confirm the exact live repo path and commit hash, run `sudo nginx -t`, confirm `nginx -T` still proxies `80/443/8080` to `127.0.0.1:4010`, and confirm no stale `192.168.88.250` upstream remains |
| Reverse-tunnel task retention and listener presence | URTS-02 | Requires the real Windows browser-block host plus Ubuntu listener observation | Confirm the scheduled task is `Running`, confirm it stays retained after a settle window, and confirm Ubuntu listeners `14021..14027` and `14040` remain present |
| Authenticated external smoke from a token-bearing host | URTS-04 | Requires the real public path and a valid bearer token on some execution host | Run authenticated smoke against `http://77.66.186.75/healthz`, `http://77.66.186.75/v1/models`, and `http://77.66.186.75/v1/chat/completions` using model `owmcgp-browser`, then record `externally_ready` or `hold_rollout` |

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies.
- [x] Sampling continuity avoids three consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency remains below 60 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

Approval: pending
