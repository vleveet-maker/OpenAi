---
phase: 35
slug: server-transfer-and-revalidation-of-isolated-per-account-external-chat-proof
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-14
---

# Phase 35 - Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | PowerShell parser checks + Vitest for `control-api` |
| Quick run command | `npm.cmd --prefix services/control-api test -- internal-post-phase34-server-isolated-chat-transfer.test.ts internal-admin-page.test.ts` |
| Full suite command | `npm.cmd --prefix services/control-api test` then `npm.cmd --prefix services/control-api run build` |
| Estimated runtime | ~90 seconds plus one preserve-first Windows-server + Ubuntu live revalidation pass |

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 35-01-01 | 01 | 1 | STRV-01, STRV-02 | parser | `powershell -NoProfile -Command "$t=$null;$e=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('infra\\windows-block\\prepare-isolated-account-browser-roots.ps1',[ref]$t,[ref]$e); if($e.Count -gt 0){$e | % ToString; exit 1}"` | pending |
| 35-01-02 | 01 | 1 | STRV-01, STRV-02 | parser | `powershell -NoProfile -Command "$t=$null;$e=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('infra\\windows-block\\revalidate-server-isolated-external-chat-proof.ps1',[ref]$t,[ref]$e); if($e.Count -gt 0){$e | % ToString; exit 1}"` | pending |
| 35-02-01 | 02 | 2 | STRV-03 | unit | `npm.cmd --prefix services/control-api test -- internal-post-phase34-server-isolated-chat-transfer.test.ts internal-admin-page.test.ts` | pending |
| 35-03-01 | 03 | 3 | STRV-01, STRV-02, STRV-04 | manual + artifact | `powershell -ExecutionPolicy Bypass -File .\\infra\\windows-block\\revalidate-server-isolated-external-chat-proof.ps1` | pending |
| 35-03-02 | 03 | 3 | STRV-01..04 | unit + build | `npm.cmd --prefix services/control-api test` and `npm.cmd --prefix services/control-api run build` | pending |

## Manual Acceptance Scenarios

- Scenario A: Windows server plus Ubuntu both sync to the same GitHub commit, one preserved isolated canary succeeds, and public `/v1/chat/completions` returns `200`; phase ends `externally_ready`.
- Scenario B: `wife` is unavailable on the server, but a later preserved account succeeds; the artifact records the earlier skips/failures and the later success, and the phase ends `externally_ready`.
- Scenario C: isolated transfer on the server is preserve-first but no candidate reaches public chat success; the artifact records the common blocker and the phase ends `hold_rollout`.
- Scenario D: the bearer token is resolved only from Ubuntu, but public smoke still succeeds against `http://77.66.186.75`.
- Scenario E: the latest route and `/internal/admin` match the latest server-transfer artifact after a server-side `control-api` restart.

## Validation Sign-Off

- [x] The phase validates the proven isolated browser-root model on the server path instead of reintroducing the retired shared-root model.
- [x] The live run stays GitHub-first across Windows and Ubuntu.
- [x] Latest-route and admin surface are explicitly covered in the plan.
- [x] Full suite and build remain in the verification loop.
