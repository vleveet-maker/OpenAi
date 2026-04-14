# Phase 35-03 Summary

The live Windows + Ubuntu revalidation step ran end-to-end and ended with `hold_rollout`.

Recorded live truth:

- Windows repo path: `D:\OpenAi`
- Windows commit: `9f0d8b2`
- Ubuntu repo path: `/opt/owmcgp-remote-relay/services/control-api`
- External `/healthz`: `200`
- Latest route: `GET /internal/post-phase34-server-isolated-chat-transfer/latest` responded from temporary `control-api` on `127.0.0.1:8081`
- Admin surface: `/internal/admin` contained `Latest post-phase34 server isolated external chat proof`

What passed:

- Parser checks passed.
- Focused tests passed.
- Full `control-api` suite passed.
- Build passed.
- The Phase 35 wrapper is executable after the live fixes to helper availability, SSH quoting, and argument passing.

Why rollout is still held:

- `tokenSource = missing`, so authenticated `/v1/models` and `/v1/chat/completions` were not confirmed.
- Ubuntu SSH was unavailable, so live commit, `nginx`, and listener truth for `77.66.186.75` could not be rechecked.
- Reverse-tunnel task was `Running`, but Ubuntu listener truth for `14021..14027` and `14040` stayed unconfirmed.
- Seven browser-data copy attempts reported `copy_failed` with `robocopy exit code 11`; isolated roots were nevertheless prepared and launched.

Preserve-first status:

- No profile deletion was reported.
- No cookies or local storage clearing was reported.
- No mass relogin or blind broad pool restart was reported.

Outcome:

- Phase 35-03 is complete.
- Final verdict: `hold_rollout`.
- The next blocker to attack is token + Ubuntu SSH/listener truth before another server external chat proof.
