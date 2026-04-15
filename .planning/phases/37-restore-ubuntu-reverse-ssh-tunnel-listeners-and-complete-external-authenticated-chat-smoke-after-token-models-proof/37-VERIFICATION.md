# Phase 37 Verification

## Verdict

`hold_rollout`

## Requirement Verification

- `RTUN-01`: complete. Reverse tunnel restore tooling was hardened, the password path avoids process arguments, and live Ubuntu listener truth was collected directly from the server.
- `RTUN-02`: complete with caveat. Latest-state route and `/internal/admin` surface are wired and were confirmed locally on `127.0.0.1:8081`. The latest route returns the Phase 37 artifact under `latest`.
- `RTUN-03`: complete. Preserve-first constraints were followed: no profile deletion, no cookies/localStorage clearing, no mass relogin, and no blind full-pool restart.
- `RTUN-04`: blocked at the final account-auth gate. External `/healthz` and authenticated `/v1/models` are green, but authenticated `/v1/chat/completions` returns `409 chat_bootstrap_failed` with inner reason `bootstrap_auth_required`.

## Automated Checks

- PowerShell parser checks: passed.
- `python -m py_compile infra/windows-block/start-reverse-tunnels.py`: passed.
- Focused route/admin tests: passed, 2 files / 3 tests.
- Focused public remote relay regression test after fallback fix: passed, 19 tests.
- Full `control-api` suite: passed, 43 files / 168 tests.
- `npm.cmd --prefix services/control-api run build`: passed.
- Latest route proof: passed.
- Admin section proof: passed.

## Live Proof

- Ubuntu SSH: reachable on `77.66.186.75:2222` and `95.78.126.163:2222`.
- Selected Ubuntu host: `77.66.186.75`.
- Ubuntu nginx config: valid.
- Canonical upstream: `Ubuntu nginx -> 127.0.0.1:4010`.
- Ubuntu reverse tunnel listeners: all present for `14021..14027` and `14040`.
- Token source: resolved from Ubuntu remote env file; secret value was not recorded.
- External `/healthz`: `200`.
- Authenticated external `/v1/models`: `200`.
- Authenticated external `/v1/chat/completions`: `409`.
- Exact next blocker: `bootstrap_auth_required`.

## Account Truth

- Proxy is not the current blocking layer for the final proof.
- No-proxy navigation reaches `https://chatgpt.com/`.
- Bounded no-proxy rotation across `wife`, `dad`, `shared-1`, `shared-2`, `shared-3`, `shared-4`, and `shared-5` found the same account-state blocker: `bootstrap_auth_required`.
- This means the next repair should be manual account confirmation/sign-in, not more proxy or Ubuntu work.

## Residual Risks

- The active reverse tunnel owner is a temporary Python process, not a durable scheduled task; it can die if the local session/process exits.
- The scheduled task `OWMCGP Browser Block - Reverse Tunnels` is missing in the current local state.
- Browser-account authorization must be confirmed manually before the API can return real chat completions externally.

## Next Step

Create or execute a focused follow-up that opens the account windows for manual confirmation, verifies one account reaches a usable composer, then reruns the authenticated external chat smoke against `http://77.66.186.75`.
