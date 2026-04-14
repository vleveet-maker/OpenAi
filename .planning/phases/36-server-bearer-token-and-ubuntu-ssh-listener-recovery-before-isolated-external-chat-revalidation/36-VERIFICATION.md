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
- Direct SSH retry connected to `77.66.186.75:2222` as `mi50`; `95.78.126.163:2222` still timed out during banner exchange.
- Token source resolved from Ubuntu env file as `REMOTE_RELAY_API_TOKEN`; the token value was not printed or stored.
- Authenticated public `/v1/models = 200`.

## Live Blocker

The blocker is not proxy and not a specific ChatGPT account. The updated blocker is the missing Ubuntu reverse-tunnel listener set:

- `77.66.186.75:2222` is reachable with retry and can run commands as `mi50`.
- Ubuntu `nginx` is valid and still proxies public API traffic to `127.0.0.1:4010`.
- Bearer token was found on Ubuntu and authenticated `/v1/models` returned `200`.
- Ubuntu listeners `14021..14027` and `14040` are all missing.

Because the reverse-tunnel listeners were missing, authenticated external chat was correctly skipped.

## Preserve-First

- Profiles deleted: false.
- Cookies cleared: false.
- localStorage cleared: false.
- Blind full-pool restart: false.
- Mass relogin: false.

## Next Step

Restore the reverse SSH tunnel listeners on Ubuntu first. After `14021..14027` plus `14040` are listening, run authenticated `/v1/chat/completions` against `http://77.66.186.75`.
