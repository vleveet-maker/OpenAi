---
phase: 21
slug: deployed-windows-disconnected-runtime-and-windows-edge-forced-host-public-owner-502-remediation-after-parity-clean-proof
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-01
---

# Phase 21 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | PowerShell parser checks + Vitest via `npm.cmd --prefix services/control-api test` |
| Config file | `services/control-api/package.json` |
| Quick run command | `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts internal-post-parity-disconnected-runtime-remediation.test.ts` |
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
| 21-01-01 | 01 | 1 | WPCP-01, WPCP-02 | parser + grep | `powershell -NoProfile -Command "[void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/probe-public-api.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/recover-browser-block-readiness.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502-parity.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/remediate-disconnected-runtime-and-forced-host-public-502-post-parity.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/test-rollout-smoke.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/host-worker/test-host-worker-relay.ps1',[ref]$null,[ref]$null)"` | pending | pending |
| 21-01-02 | 01 | 1 | WPCP-01, WPCP-02 | docs grep | `rg -n "remediate-disconnected-runtime-and-forced-host-public-502-post-parity.ps1|phase21-post-parity-remediation-v1|shared-6|RuntimeReviveWaitSeconds|ForcedHostSettleSeconds|PublicOwnerSettleSeconds|21-REMEDIATION-SUMMARY" docs/windows-browser-block.md docs/windows-public-api-block.md docs/internal-worker-ops.md infra/windows-block` | pending | pending |
| 21-02-01 | 02 | 2 | WPCP-03 | unit | `npm.cmd --prefix services/control-api test -- internal-post-parity-disconnected-runtime-remediation.test.ts` | pending | pending |
| 21-02-02 | 02 | 2 | WPCP-03 | unit | `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts` | green | pending |
| 21-03-01 | 03 | 3 | WPCP-04 | manual + artifact grep | `rg -n "remediated_through_smoke|hold_rollout|WPCP-01|WPCP-02|WPCP-03|WPCP-04" .planning/phases/21-deployed-windows-disconnected-runtime-and-windows-edge-forced-host-public-owner-502-remediation-after-parity-clean-proof/21-VERIFICATION.md .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md .planning/PROJECT.md` | pending | pending |

## Wave 0 Requirements

- [ ] `services/control-api/test/internal-post-parity-disconnected-runtime-remediation.test.ts` - route coverage for the new latest-remediation surface
- [ ] `infra/windows-block/remediate-disconnected-runtime-and-forced-host-public-502-post-parity.ps1` - canonical Phase 21 wrapper
- [ ] `.planning/phases/21-deployed-windows-disconnected-runtime-and-windows-edge-forced-host-public-owner-502-remediation-after-parity-clean-proof/21-VERIFICATION.md` - live closeout artifact

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deployed-host overlay plus Phase 21 remediation run | WPCP-01, WPCP-02 | Needs the real Windows browser-block host with preserved accounts | Overlay the Phase 21 archive on `192.168.88.250`, restart `control-api`, run the exact remediation command, and confirm `21-REMEDIATION-SUMMARY.json/.md` plus `infra/data/post-parity-disconnected-runtime-remediation/latest.json` are written |
| Operator-surface parity against the live artifact | WPCP-03 | Requires the live `127.0.0.1:8081` runtime served from `dist` | Request `/internal/post-parity-disconnected-runtime-remediation/latest` or open `/internal/admin` and confirm the same timestamp, counts, hop classification, compatibility version, and verdict as the JSON artifact |
| Post-remediation smoke verdict | WPCP-04 | Requires the live public path through `77.66.186.75` and bounded canary cleanup | Rerun the exact Phase 11 smoke command after the remediation run and record `remediated_through_smoke` or `hold_rollout` in `21-VERIFICATION.md` |

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies.
- [x] Sampling continuity avoids three consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency remains below 60 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

Approval: pending
