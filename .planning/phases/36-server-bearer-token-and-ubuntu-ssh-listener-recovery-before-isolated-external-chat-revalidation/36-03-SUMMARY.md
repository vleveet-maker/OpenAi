# Phase 36-03 Summary

## Result

- Final verdict: `hold_rollout`.
- Final next blocker: `ubuntu_ssh_unreachable`.
- The wrapper did not run authenticated `/v1/models` or `/v1/chat/completions`, because Phase 36 requires token plus Ubuntu listener truth first.

## Live Checks

- Phase artifact: `36-TOKEN-SSH-LISTENER-RECOVERY-SUMMARY.json`.
- Latest artifact: `infra/data/post-phase35-server-token-ssh-listener-recovery/latest.json`.
- Wrapper live SSH result: `77.66.186.75:2222` returned `ssh_empty_response` during the bounded run.
- Separate raw TCP check showed the SSH banner can appear once and then return empty/time out on immediate repeated attempts, which points at unstable SSH/NAT behavior rather than an API-code failure.
- Separate public edge checks after the wrapper showed `/healthz=200` and unauthenticated `/v1/models=401`, which means the public HTTP edge is alive and still requires a bearer token.

## What Did Not Run

- No authenticated external chat smoke was run.
- No server browser-data transfer repair was attempted.
- No account/profile/browser state was changed.

## Next Step

Fix the Ubuntu SSH/NAT path on `77.66.186.75:2222` so it returns a stable SSH banner/session on repeated attempts, then rerun the Phase 36 wrapper to resolve the bearer token, confirm Ubuntu listeners `14021..14027` plus `14040`, and only then run authenticated external chat.
