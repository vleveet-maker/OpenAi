---
phase: 22
slug: deployed-windows-post-phase21-disconnected-runtime-and-windows-edge-forced-host-public-owner-502-remediation-follow-up
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-01
---

# Phase 22 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | PowerShell parser checks + Vitest via `npm.cmd --prefix services/control-api test` |
| Config file | `services/control-api/package.json` |
| Quick run command | `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts internal-post-phase21-disconnected-runtime-followup.test.ts` |
| Full suite command | `npm.cmd --prefix services/control-api test` then `npm.cmd --prefix services/control-api run build` |
| Estimated runtime | ~45 seconds |

## Sampling Rate

- After every task commit: run the affected PowerShell parser checks plus the quick route/admin test command.
- After every plan wave: run `npm.cmd --prefix services/control-api test` then `npm.cmd --prefix services/control-api run build`.
- Before `$gsd-verify-work`: the full suite must be green.
- Max feedback latency: 60 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | WPFU-01, WPFU-02 | parser + grep | `powershell -NoProfile -Command "[void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/probe-public-api.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/recover-browser-block-readiness.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502-parity.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/remediate-post-phase21-disconnected-runtime-and-forced-host-public-owner-502.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/test-rollout-smoke.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/host-worker/test-host-worker-relay.ps1',[ref]$null,[ref]$null)"` | pending | pending |
| 22-01-02 | 01 | 1 | WPFU-01, WPFU-02 | docs grep | `rg -n "remediate-post-phase21-disconnected-runtime-and-forced-host-public-owner-502.ps1|phase22-post-phase21-followup-v1|shared-6|RuntimeReviveWaitSeconds|ForcedHostSettleSeconds|PublicOwnerSettleSeconds|22-FOLLOWUP-SUMMARY" docs/windows-browser-block.md docs/windows-public-api-block.md docs/internal-worker-ops.md infra/windows-block` | pending | pending |
| 22-02-01 | 02 | 2 | WPFU-03 | unit | `npm.cmd --prefix services/control-api test -- internal-post-phase21-disconnected-runtime-followup.test.ts` | pending | pending |
| 22-02-02 | 02 | 2 | WPFU-03 | unit | `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts` | green | pending |
| 22-03-01 | 03 | 3 | WPFU-04 | manual + artifact grep | `rg -n "stabilized_through_smoke|hold_rollout|WPFU-01|WPFU-02|WPFU-03|WPFU-04" .planning/phases/22-deployed-windows-post-phase21-disconnected-runtime-and-windows-edge-forced-host-public-owner-502-remediation-follow-up/22-VERIFICATION.md .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md .planning/PROJECT.md` | pending | pending |

## Wave 0 Requirements

- [ ] `services/control-api/test/internal-post-phase21-disconnected-runtime-followup.test.ts` - route coverage for the new latest-follow-up surface
- [ ] `infra/windows-block/remediate-post-phase21-disconnected-runtime-and-forced-host-public-owner-502.ps1` - canonical Phase 22 wrapper
- [ ] `.planning/phases/22-deployed-windows-post-phase21-disconnected-runtime-and-windows-edge-forced-host-public-owner-502-remediation-follow-up/22-VERIFICATION.md` - live closeout artifact

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deployed-host overlay plus Phase 22 follow-up run | WPFU-01, WPFU-02 | Needs the real Windows browser-block host with preserved accounts | Overlay the Phase 22 archive on `192.168.88.250`, restart `control-api`, run the exact follow-up command, and confirm `22-FOLLOWUP-SUMMARY.json/.md` plus `infra/data/post-phase21-disconnected-runtime-followup/latest.json` are written |
| Operator-surface parity against the live artifact | WPFU-03 | Requires the live `127.0.0.1:8081` runtime served from `dist` | Request `/internal/post-phase21-disconnected-runtime-followup/latest` or open `/internal/admin` and confirm the same timestamp, counts, hop classification, compatibility version, and verdict as the JSON artifact |
| Post-follow-up smoke verdict | WPFU-04 | Requires the live public path through `77.66.186.75` and bounded canary cleanup | Rerun the exact Phase 11 smoke command after the follow-up run and record `stabilized_through_smoke` or `hold_rollout` in `22-VERIFICATION.md` |

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies.
- [x] Sampling continuity avoids three consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency remains below 60 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

Approval: pending
