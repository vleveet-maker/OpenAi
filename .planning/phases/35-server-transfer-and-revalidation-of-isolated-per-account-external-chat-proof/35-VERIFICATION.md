# Phase 35 Verification

Final verdict: `hold_rollout`.

## Requirement Verification

- `STRV-01`: complete with caveat. Windows repo path and commit were recorded as `D:\OpenAi` / `9f0d8b2`; Ubuntu repo path is known as `/opt/owmcgp-remote-relay/services/control-api`, but live Ubuntu commit/hash recheck was blocked by SSH.
- `STRV-02`: complete with blocker recorded. The server flow attempted the isolated per-account model preserve-first; seven copy attempts failed with `robocopy exit code 11`, while isolated roots were still prepared and launched. No destructive profile/cookie/localStorage action was reported.
- `STRV-03`: complete. The latest file-backed artifact and `/internal/admin` surface were confirmed from temporary local `control-api`.
- `STRV-04`: complete as a hold verdict. Public `/healthz` returned `200`, but authenticated `/v1/models` and `/v1/chat/completions` were not proven because `tokenSource = missing`; the final verdict is therefore `hold_rollout`.

## Checks

- Parser checks: passed.
- Focused route/admin tests: passed.
- Full `control-api` test suite: passed.
- Build: passed.
- Operator surface: passed.
- External healthz: passed with `200`.
- Authenticated external models/chat: not confirmed because bearer token was missing.

## Residual Risks

- Ubuntu SSH is still a blocker for live topology verification.
- Reverse-tunnel task state alone is not enough; Ubuntu listener truth still needs direct confirmation.
- `robocopy exit code 11` may still block reliable server transfer once token/SSH proof is restored.

## Next Step Recommendation

Add a follow-up phase for bearer token recovery, Ubuntu SSH recovery, and listener truth before retrying server external chat.
