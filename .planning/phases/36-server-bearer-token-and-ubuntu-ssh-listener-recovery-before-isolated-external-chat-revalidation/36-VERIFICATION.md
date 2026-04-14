# Phase 36 Verification

## Verdict

`hold_rollout`

## Evidence

- PowerShell parser check passed for `infra/windows-block/recover-server-token-ssh-listeners-and-external-chat.ps1`.
- Focused tests passed: 2 files / 3 tests.
- Full `control-api` suite passed: 42 files / 166 tests.
- Build passed: `npm.cmd --prefix services/control-api run build`.
- Latest route proof passed on temporary local `control-api`: `GET /internal/post-phase35-server-token-ssh-listener-recovery/latest = 200`.
- Admin surface proof passed on temporary local `control-api`: `/internal/admin = 200` and includes the Phase 36 section.
- Public edge sanity check after the wrapper: `/healthz = 200`, unauthenticated `/v1/models = 401`.

## Live Blocker

The blocker is not proxy and not a specific ChatGPT account. The blocker is the Ubuntu SSH ingress path:

- `77.66.186.75:2222` is TCP-open.
- Raw banner checks showed intermittent behavior: one attempt can return `SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.14`, then repeated attempts return empty responses or time out.
- The Phase 36 wrapper therefore ended with `nextBlocker=ubuntu_ssh_unreachable`.

Because SSH was unstable, the wrapper could not safely retrieve the bearer-token source or verify Ubuntu-side reverse-tunnel listeners. Authenticated external chat was correctly skipped.

## Preserve-First

- Profiles deleted: false.
- Cookies cleared: false.
- localStorage cleared: false.
- Blind full-pool restart: false.
- Mass relogin: false.

## Next Step

Repair the stable SSH path to Ubuntu first. After SSH is stable, rerun the Phase 36 wrapper. If it resolves the bearer token and confirms listeners, run the authenticated external chat smoke against `http://77.66.186.75`.
