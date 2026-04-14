# Phase 35 Server Isolated Chat Transfer Summary

- Generated: 2026-04-14T22:34:30+03:00
- Reconstructed locally from operator live report: true
- Verdict: hold_rollout
- Windows repo path: `D:\OpenAi`
- Windows commit: `9f0d8b2`
- Ubuntu repo path: `/opt/owmcgp-remote-relay/services/control-api`
- Ubuntu SSH reachable in this run: false
- External `/healthz`: 200
- tokenSource: missing
- Authenticated `/v1/models`: not confirmed
- Authenticated `/v1/chat/completions`: not confirmed

## What Passed

- Local validation passed before the live run: parser checks, focused tests, full `control-api` suite, and build.
- The Phase 35 wrapper became executable after adding `prove-external-chat-on-isolated-account-browser-roots.ps1` and fixing `revalidate-server-isolated-external-chat-proof.ps1` quoting/argument handling.
- Operator surface was confirmed on a temporary local `control-api` at `127.0.0.1:8081`.
- `GET /internal/post-phase34-server-isolated-chat-transfer/latest` returned the latest artifact.
- `/internal/admin` contained `Latest post-phase34 server isolated external chat proof`.
- Public `GET http://77.66.186.75/healthz` returned `200`.

## Blockers

- `tokenSource = missing`, so authenticated `/v1/models` and `/v1/chat/completions` were not proven.
- Ubuntu SSH did not come up during the live run, so live Ubuntu commit, `nginx`, and listener truth could not be rechecked.
- The reverse-tunnel task was `Running`, but Ubuntu listener truth for `14021..14027` and `14040` was not confirmed.
- All seven browser-data copy attempts reported `copy_failed` with `robocopy exit code 11`, although isolated roots were still prepared and launched.

## Verdict

Phase 35 is complete as an execution step, but rollout stays held. The next useful GSD step should recover bearer-token discovery plus Ubuntu SSH/listener truth first, then rerun the server external chat proof.
