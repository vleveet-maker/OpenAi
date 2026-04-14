---
phase: 37
slug: restore-ubuntu-reverse-ssh-tunnel-listeners-and-complete-external-authenticated-chat-smoke-after-token-models-proof
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-15
---

# Phase 37 Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | PowerShell parser checks, Python compile checks, and Vitest for `control-api` route/admin coverage |
| Focused route/admin command | `npm.cmd --prefix services/control-api test -- internal-post-phase36-reverse-tunnel-chat-smoke.test.ts internal-admin-page.test.ts` |
| Full suite command | `npm.cmd --prefix services/control-api test` |
| Build command | `npm.cmd --prefix services/control-api run build` |
| Live acceptance | Windows reverse tunnels plus Ubuntu listener proof and authenticated public smoke against `http://77.66.186.75` |

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated Command | Status |
|---------|------|-------------|-----------|-------------------|--------|
| 37-01-01 | 01 | RTUN-01 | parser/compile | PowerShell parser check plus `python -m py_compile infra/windows-block/start-reverse-tunnels.py` | pending |
| 37-01-02 | 01 | RTUN-01, RTUN-02 | parser | PowerShell parser check for the Phase 37 wrapper | pending |
| 37-01-03 | 01 | RTUN-01, RTUN-02 | artifact review | Generated artifact contains source labels and listener truth but no token/password values | pending |
| 37-02-01 | 02 | RTUN-03 | unit | Focused latest-route test | pending |
| 37-02-02 | 02 | RTUN-03 | unit | Focused `/internal/admin` test | pending |
| 37-02-03 | 02 | RTUN-03 | build | Full `control-api` test suite and build | pending |
| 37-03-01 | 03 | RTUN-01, RTUN-02 | live | Start or retain tunnels and verify Ubuntu listeners `14021..14027` plus `14040` | pending |
| 37-03-02 | 03 | RTUN-04 | live | Run authenticated public `healthz/models/chat` against `77.66.186.75` | pending |
| 37-03-03 | 03 | RTUN-01..04 | artifact | Write summaries, verification, latest artifact, and GSD completion proof | pending |

## Manual Acceptance Scenarios

- Scenario A: SSH or tunnel startup still fails. The phase ends `hold_rollout`, records `reverse_tunnel_start_failed`, and does not pretend chat was tested.
- Scenario B: tunnel process/task exists but Ubuntu listeners are missing. The phase ends `hold_rollout`, records `ubuntu_listeners_missing`, and treats Windows task state as context only.
- Scenario C: Ubuntu listeners are present, `/healthz` and `/v1/models` pass, but chat fails. The phase ends `hold_rollout` with the exact chat error and worker id.
- Scenario D: Ubuntu listeners are present, authenticated `/healthz`, `/v1/models`, and `/v1/chat/completions` pass against `http://77.66.186.75`, and the phase ends `externally_ready`.
- Scenario E: `/internal/admin` and `GET /internal/post-phase36-reverse-tunnel-chat-smoke/latest` match the latest artifact before any final readiness claim.
- Scenario F: Secret redaction is verified: no bearer token, SSH password, cookies, local storage, or profile data appears in tracked artifacts.

## Validation Sign-Off

- [x] The plan targets the actual Phase 36 blocker: missing Ubuntu reverse-tunnel listeners.
- [x] The plan keeps token and password handling secret-safe.
- [x] The plan keeps preserve-first account handling: no profile deletion, cookie clearing, local-storage clearing, mass restart, or mass relogin.
- [x] The plan gates external chat on token plus Ubuntu listener truth.
- [x] The plan ends with exactly one final verdict: `externally_ready` or `hold_rollout`.
