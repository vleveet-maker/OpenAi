# Phase 36-03 Summary

## Result

- Final verdict: `hold_rollout`.
- Final next blocker after manual SSH retry: `ubuntu_listeners_missing`.
- Authenticated `/v1/models` passed after resolving the bearer token from Ubuntu. Authenticated `/v1/chat/completions` was correctly skipped because Ubuntu listeners `14021..14027` and `14040` are all missing.

## Live Checks

- Phase artifact: `36-TOKEN-SSH-LISTENER-RECOVERY-SUMMARY.json`.
- Latest artifact: `infra/data/post-phase35-server-token-ssh-listener-recovery/latest.json`.
- Direct SSH retry result: `77.66.186.75:2222` connected as `mi50`; `95.78.126.163:2222` still timed out waiting for SSH banner.
- Ubuntu repo path exists at `/opt/owmcgp-remote-relay/services/control-api`.
- Ubuntu `nginx -t` passed and `nginx -T` confirmed `proxy_pass http://127.0.0.1:4010`.
- Bearer token source was resolved from `ssh:77.66.186.75:remote_env_file:REMOTE_RELAY_API_TOKEN`; the token value was not printed or stored.
- Public checks with the resolved token showed `/healthz=200` and `/v1/models=200`.
- Ubuntu listener truth showed all required reverse-tunnel ports missing: `14021..14027` and `14040`.

## What Did Not Run

- No authenticated external chat smoke was run because listener preconditions were red.
- No server browser-data transfer repair was attempted.
- No account/profile/browser state was changed.

## Next Step

Restore the reverse SSH tunnels so Ubuntu listens on `127.0.0.1:14021..14027` plus `127.0.0.1:14040`, then rerun authenticated external `/v1/chat/completions` against `http://77.66.186.75`.
