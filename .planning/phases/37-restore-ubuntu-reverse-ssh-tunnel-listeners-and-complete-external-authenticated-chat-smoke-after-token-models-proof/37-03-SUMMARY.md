# Phase 37-03 Summary

## Result

- Final verdict: `hold_rollout`.
- Ubuntu SSH worked on both public hosts through port `2222`; selected host was `77.66.186.75`.
- Ubuntu nginx was valid and still used the canonical public upstream `127.0.0.1:4010`.
- Bearer token was resolved from the Ubuntu remote env file; the token value was not printed or stored.
- Reverse tunnel listeners were green on Ubuntu: `14021..14027` and `14040` were all present.
- Public external `/healthz` returned `200`.
- Authenticated external `/v1/models` returned `200` with live models including `owmcgp-browser`.
- Authenticated external `/v1/chat/completions` reached the browser worker path but returned `409`.
- Exact chat blocker: `bootstrap_auth_required`.

## Live Account Rotation

- The first proxy-backed `wife` attempt proved the old problem clearly: proxy navigation caused `chrome-error://chromewebdata/`.
- A bounded no-proxy retry fixed transport/navigation for the browser, but `wife` returned `bootstrap_auth_required`.
- To avoid looping on one account, a bounded no-proxy rotation checked `wife`, `dad`, `shared-1`, `shared-2`, `shared-3`, `shared-4`, and `shared-5`.
- Every checked account opened ChatGPT but returned `bootstrap_auth_required`.
- The final canonical wrapper was rerun with `dad` as the selected worker, no proxy, and it reproduced the external blocker as `bootstrap_auth_required`.

## Verification

- PowerShell parser checks passed for the Phase 37 wrapper after the exact blocker classification patch.
- Earlier Phase 37 implementation checks passed: PowerShell parser checks, Python compile, focused route/admin tests, full `control-api` suite, and build.
- A regression fix in `services/control-api/src/server.ts` kept direct fallback worker selection from timing out behind a broad fallback scan; the focused `public-remote-relay` test, full suite, and build passed after the fix.
- Local `control-api` was started on `127.0.0.1:8081`.
- `GET /internal/post-phase36-reverse-tunnel-chat-smoke/latest` returned the latest Phase 37 artifact.
- `/internal/admin` contained the `Latest post-phase36 reverse tunnel chat smoke` section.

## Preserve-First

- Browser profiles were not deleted.
- Cookies/localStorage were not cleared.
- No mass relogin was performed.
- No full worker-pool restart was performed.
- Only bounded worker starts/stops were used for the live proof.

## Next Step

Open the local account browser windows, manually confirm/sign in the accounts that show `bootstrap_auth_required`, then rerun the Phase 37 external chat smoke. The infrastructure path is already green; the remaining blocker is account authorization state inside ChatGPT.
