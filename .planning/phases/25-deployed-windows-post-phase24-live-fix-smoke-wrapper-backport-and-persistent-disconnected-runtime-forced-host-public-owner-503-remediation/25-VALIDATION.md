---
phase: 25
slug: deployed-windows-post-phase24-live-fix-smoke-wrapper-backport-and-persistent-disconnected-runtime-forced-host-public-owner-503-remediation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
---

# Phase 25 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | PowerShell parser checks + Vitest via `npm.cmd --prefix services/control-api test` |
| Config file | `services/control-api/package.json` |
| Quick run command | `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts internal-post-phase24-external-api-readiness.test.ts` |
| Full suite command | `npm.cmd --prefix services/control-api test` then `npm.cmd --prefix services/control-api run build` |
| Estimated runtime | ~45 seconds |

## Sampling Rate

- After every task commit: run the affected parser checks plus the quick route/admin test command.
- After every plan wave: run `npm.cmd --prefix services/control-api test` then `npm.cmd --prefix services/control-api run build`.
- Before `$gsd-verify-work`: the full suite must be green.
- Max feedback latency: 60 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | WLFB-01, WLFB-02 | parser + grep | `powershell -NoProfile -Command "[void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/start-reverse-tunnels.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/register-browser-block-tasks.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/build-windows-browser-block-package.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/recover-reverse-tunnels-and-external-api-readiness.ps1',[ref]$null,[ref]$null)"` | pending | pending |
| 25-01-02 | 01 | 1 | WLFB-01, WLFB-02 | docs + config grep | `rg -n "phase25-live-fix-backport-v1|127.0.0.1:4010|OWMCGP Browser Block - Reverse Tunnels|Foreground|StartWhenAvailable|Restart|25-EXTERNAL-READINESS-SUMMARY|post-phase24-external-api-readiness" infra/windows-block infra/remote/nginx docs` | pending | pending |
| 25-02-01 | 02 | 2 | WLFB-03 | unit | `npm.cmd --prefix services/control-api test -- internal-post-phase24-external-api-readiness.test.ts` | pending | pending |
| 25-02-02 | 02 | 2 | WLFB-03 | unit | `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts` | green | pending |
| 25-03-01 | 03 | 3 | WLFB-01, WLFB-02, WLFB-03, WLFB-04 | manual + artifact grep | `rg -n "externally_ready|hold_rollout|canonicalPublicUpstream|reverseTunnelTaskStatus|ubuntuTunnelListenerStatus|readyWorkerCount|25-EXTERNAL-READINESS-SUMMARY|post-phase24 external API readiness" .planning/phases/25-deployed-windows-post-phase24-live-fix-smoke-wrapper-backport-and-persistent-disconnected-runtime-forced-host-public-owner-503-remediation/25-VERIFICATION.md .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md .planning/PROJECT.md` | pending | pending |

## Wave 0 Requirements

- [ ] `services/control-api/test/internal-post-phase24-external-api-readiness.test.ts` - route coverage for the new latest external-readiness surface
- [ ] `infra/windows-block/recover-reverse-tunnels-and-external-api-readiness.ps1` - canonical Phase 25 wrapper
- [ ] `.planning/phases/25-deployed-windows-post-phase24-live-fix-smoke-wrapper-backport-and-persistent-disconnected-runtime-forced-host-public-owner-503-remediation/25-VERIFICATION.md` - live closeout artifact

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Windows reverse-tunnel task health and tunnel listeners | WLFB-01, WLFB-02 | Requires the real Windows browser-block host with preserved accounts | Re-register or update `OWMCGP Browser Block - Reverse Tunnels`, confirm it is `Running`, and confirm the expected tunnel listeners or task state on the deployed host |
| Ubuntu active nginx config and local upstream truth | WLFB-01, WLFB-02 | Requires the real Ubuntu public owner host | Confirm `nginx -T` still proxies `80/443/8080` to `127.0.0.1:4010`, confirm no stale `192.168.88.250` upstream remains, and confirm the Ubuntu local upstream still answers `/healthz` and `/v1/models` |
| Authenticated external smoke | WLFB-04 | Requires the real public path and a live bearer token | Run authenticated `curl` or equivalent against `http://77.66.186.75/healthz`, `http://77.66.186.75/v1/models`, and `http://77.66.186.75/v1/chat/completions` using the live model `owmcgp-browser`, then record `externally_ready` or `hold_rollout` |

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies.
- [x] Sampling continuity avoids three consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency remains below 60 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

Approval: pending
