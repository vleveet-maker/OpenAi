---
phase: 20
slug: deployed-windows-runtime-parity-backport-and-persistent-disconnected-runtime-public-502-remediation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-01
---

# Phase 20 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | PowerShell parser checks + Vitest via `npm.cmd --prefix services/control-api test` |
| **Config file** | `services/control-api/package.json` |
| **Quick run command** | `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts internal-runtime-parity-backport-remediation.test.ts` |
| **Full suite command** | `npm.cmd --prefix services/control-api test` then `npm.cmd --prefix services/control-api run build` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts internal-runtime-parity-backport-remediation.test.ts` plus the affected PowerShell parser checks
- **After every plan wave:** Run `npm.cmd --prefix services/control-api test` then `npm.cmd --prefix services/control-api run build`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | WPARB-01 | parser + grep | `powershell -NoProfile -Command "[void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/probe-public-api.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/recover-browser-block-readiness.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/remediate-disconnected-runtime-and-forced-host-edge.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/test-rollout-smoke.ps1',[ref]$null,[ref]$null); [void][System.Management.Automation.Language.Parser]::ParseFile('infra/host-worker/test-host-worker-relay.ps1',[ref]$null,[ref]$null)"` | ✅ | ⬜ pending |
| 20-01-02 | 01 | 1 | WPARB-02 | parser + grep | `powershell -NoProfile -Command "[void][System.Management.Automation.Language.Parser]::ParseFile('infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502-parity.ps1',[ref]$null,[ref]$null)"` | ❌ W0 | ⬜ pending |
| 20-01-03 | 01 | 1 | WPARB-01 | docs grep | `rg -n "phase20-runtime-parity-backport-v1|remediate-persistent-disconnected-runtime-and-public-502-parity.ps1|test-host-worker-relay.ps1" docs/windows-browser-block.md docs/windows-public-api-block.md docs/internal-worker-ops.md infra/windows-block` | ✅ | ⬜ pending |
| 20-02-01 | 02 | 2 | WPARB-03 | unit | `npm.cmd --prefix services/control-api test -- internal-runtime-parity-backport-remediation.test.ts` | ❌ W0 | ⬜ pending |
| 20-02-02 | 02 | 2 | WPARB-03 | unit | `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts` | ✅ | ⬜ pending |
| 20-03-01 | 03 | 3 | WPARB-04 | manual + artifact grep | `rg -n "remediated_through_smoke|hold_rollout|WPARB-01|WPARB-02|WPARB-03|WPARB-04" .planning/phases/20-deployed-windows-runtime-parity-backport-and-persistent-disconnected-runtime-public-502-remediation/20-VERIFICATION.md .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md .planning/PROJECT.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `services/control-api/test/internal-runtime-parity-backport-remediation.test.ts` - route coverage for the new latest-remediation surface
- [ ] `infra/windows-block/remediate-persistent-disconnected-runtime-and-public-502-parity.ps1` - canonical Phase 20 wrapper
- [ ] `.planning/phases/20-deployed-windows-runtime-parity-backport-and-persistent-disconnected-runtime-public-502-remediation/20-VERIFICATION.md` - live closeout artifact

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deployed-host parity-clean overlay plus remediation run | WPARB-01, WPARB-02 | Needs the real Windows browser-block host with preserved accounts | Overlay the Phase 20 archive on `192.168.88.250`, restart `control-api`, run the exact remediation command, and confirm `20-REMEDIATION-SUMMARY.json/.md` plus `infra/data/runtime-parity-backport-remediation/latest.json` are written |
| Operator-surface parity against the live artifact | WPARB-03 | Requires the live `127.0.0.1:8081` runtime served from `dist` | Request `/internal/runtime-parity-backport-remediation/latest` or open `/internal/admin` and confirm the same timestamp, counts, hop classification, and verdict as the JSON artifact |
| Post-remediation smoke verdict | WPARB-04 | Requires the live public path through `77.66.186.75` and bounded canary cleanup | Rerun the exact Phase 11 smoke command after the remediation run and record `remediated_through_smoke` or `hold_rollout` in `20-VERIFICATION.md` |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
