---
phase: 24
slug: deployed-windows-post-phase23-exact-smoke-wrapper-compat-backport-and-persistent-disconnected-runtime-forced-host-public-owner-502-remediation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-02
---

# Phase 24 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | PowerShell parser checks + Vitest via `npm.cmd --prefix services/control-api test` |
| Config file | `services/control-api/package.json` |
| Quick run command | `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts internal-post-phase23-exact-smoke-wrapper-compat-remediation.test.ts` |
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
| 24-01-01 | 01 | 1 | WSCB-01, WSCB-02 | parser + grep | `powershell -NoProfile -Command "[void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/probe-public-api.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/test-rollout-smoke.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/remediate-post-phase23-exact-smoke-wrapper-compat-and-persistent-disconnected-runtime.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/recover-browser-block-readiness.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/host-worker/test-host-worker-relay.ps1',[ref]$null,[ref]$null)"` | pending | pending |
| 24-01-02 | 01 | 1 | WSCB-01, WSCB-02 | docs grep | `rg -n "remediate-post-phase23-exact-smoke-wrapper-compat-and-persistent-disconnected-runtime.ps1|phase24-exact-smoke-wrapper-compat-backport-v1|shared-6|RuntimeReviveWaitSeconds|ForcedHostSettleSeconds|PublicOwnerSettleSeconds|24-COMPAT-REMEDIATION-SUMMARY|archive-overlaid test-rollout-smoke.ps1" docs/windows-browser-block.md docs/windows-public-api-block.md docs/internal-worker-ops.md infra/windows-block` | pending | pending |
| 24-02-01 | 02 | 2 | WSCB-03 | unit | `npm.cmd --prefix services/control-api test -- internal-post-phase23-exact-smoke-wrapper-compat-remediation.test.ts` | pending | pending |
| 24-02-02 | 02 | 2 | WSCB-03 | unit | `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts` | green | pending |
| 24-03-01 | 03 | 3 | WSCB-04 | manual + artifact grep | `rg -n "compat_backported_through_smoke|hold_rollout|WSCB-01|WSCB-02|WSCB-03|WSCB-04|smokeWrapperCompatStatus|archive-overlaid test-rollout-smoke.ps1|requires_live_fix" .planning/phases/24-deployed-windows-post-phase23-exact-smoke-wrapper-compat-backport-and-persistent-disconnected-runtime-forced-host-public-owner-502-remediation/24-VERIFICATION.md .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md .planning/PROJECT.md` | pending | pending |

## Wave 0 Requirements

- [ ] `services/control-api/test/internal-post-phase23-exact-smoke-wrapper-compat-remediation.test.ts` - route coverage for the new latest exact-compat surface
- [ ] `infra/windows-block/remediate-post-phase23-exact-smoke-wrapper-compat-and-persistent-disconnected-runtime.ps1` - canonical Phase 24 wrapper
- [ ] `.planning/phases/24-deployed-windows-post-phase23-exact-smoke-wrapper-compat-backport-and-persistent-disconnected-runtime-forced-host-public-owner-502-remediation/24-VERIFICATION.md` - live closeout artifact

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deployed-host overlay plus exact compat-remediation run | WSCB-01, WSCB-02 | Needs the real Windows browser-block host with preserved accounts | Overlay the Phase 24 archive on `192.168.88.250`, restart `control-api`, run the exact compat-remediation command, and confirm `24-COMPAT-REMEDIATION-SUMMARY.json/.md` plus `infra/data/post-phase23-exact-smoke-wrapper-compat-remediation/latest.json` are written |
| Operator-surface parity against the live artifact | WSCB-03 | Requires the live `127.0.0.1:8081` runtime served from `dist` | Request `/internal/post-phase23-exact-smoke-wrapper-compat-remediation/latest` or open `/internal/admin` and confirm the same timestamp, compat status, counts, hop classification, compatibility version, and verdict as the JSON artifact |
| Post-remediation smoke verdict on the archive-overlaid smoke wrapper | WSCB-04 | Requires the live public path through `77.66.186.75` and proves whether the archive copy of `test-rollout-smoke.ps1` is finally usable unchanged | Rerun the exact Phase 11 smoke command after the compat-remediation run and record `compat_backported_through_smoke` or `hold_rollout` in `24-VERIFICATION.md`, explicitly stating whether the run used the archive-overlaid `test-rollout-smoke.ps1` without another live-only fix |

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies.
- [x] Sampling continuity avoids three consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency remains below 60 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

Approval: pending
