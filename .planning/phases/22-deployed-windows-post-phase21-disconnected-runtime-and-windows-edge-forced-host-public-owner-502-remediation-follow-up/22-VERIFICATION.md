# 22 Verification

## Final Verdict

`hold_rollout`

## Confirmed Live Truth

- The deployed Windows browser-block host overlaid the Phase 22 archive and restarted `control-api` on `127.0.0.1:8081` before the live follow-up run.
- The live follow-up run wrote `22-FOLLOWUP-SUMMARY.json` plus `22-FOLLOWUP-SUMMARY.md`.
- Operator-surface confirmation is complete for the follow-up artifact:
  - `GET /internal/post-phase21-disconnected-runtime-followup/latest` returned the current latest follow-up result
  - `/internal/admin` showed `Latest post-phase21 disconnected runtime follow-up`
- The follow-up result was explicit before smoke:
  - `hold_rollout`
  - compatibility version `phase22-post-phase21-followup-v1`
  - pre-remediation ready = `0/9`
  - post-remediation ready = `0/9`
  - dominant runtime blocker = `disconnected`
  - first failing hop = `windows_edge_forced_host`
  - `loopbackStatus = passed`
  - forced-host and public-owner checks both failed
- The exact smoke rerun also happened after the follow-up checkpoint:
  - `11-SMOKE-SUMMARY.json` refreshed on the deployed host
  - `11-SMOKE-SUMMARY.md` refreshed on the deployed host
  - final smoke verdict remained `hold_rollout`
  - final smoke stage = `after_settle`
  - final smoke pool status = `degraded`
  - final smoke ready workers = `1/9`
  - public canary on `shared-6` failed with `502` on `healthz`, `v1/models`, and `v1/chat/completions`
- Preserve-first safety held during both the follow-up run and the smoke rerun:
  - profiles were not deleted
  - cookies and local storage were not cleared
  - no blind full-pool restart happened
  - no mass relogin happened
  - `shared-6` was stopped again after cleanup
  - port `4028` was no longer listening
  - the browser was closed after the smoke rerun

## Requirement Status

- `WPFU-01`: complete
  - the live follow-up flow ran preserve-first and recorded exact before/after truth for the still-disconnected baseline
- `WPFU-02`: complete
  - the follow-up artifact kept loopback, `windows_edge_forced_host`, and public-owner truth separate instead of collapsing them into one vague public `502`
- `WPFU-03`: complete
  - `GET /internal/post-phase21-disconnected-runtime-followup/latest` and `/internal/admin` both showed the same latest follow-up result
- `WPFU-04`: complete
  - the proven Phase 11 smoke reran after the Phase 22 follow-up checkpoint and ended with one explicit final verdict: `hold_rollout`

## Repo/Runtime Compatibility Note

- The checkpoint archive `phase22-live-followup-checkpoint-sync-20260401-224716.zip` contained a stale `test-rollout-smoke.ps1` that reverted the smoke wrapper to an old incompatible scheme.
- The successful smoke rerun therefore used the current server-working copy of `test-rollout-smoke.ps1` instead of the archive copy.
- The raw deployed-host smoke-wrapper diff was not synced back verbatim into this checkout.

## Local Reconstruction Note

- The local copies of `22-FOLLOWUP-SUMMARY.json`, `22-FOLLOWUP-SUMMARY.md`, `11-SMOKE-SUMMARY.json`, `11-SMOKE-SUMMARY.md`, and the matching `latest.json` files are reconstructed from the operator report because the raw deployed-host artifacts were not synced back into this checkout.

## Remaining Rollout Blocker

1. Phase 22 is complete, and the remaining rollout blocker is no longer missing tooling, missing operator visibility, or a missing smoke rerun.
2. The blocker is still the live runtime path: the follow-up stayed `0/9 -> 0/9 ready`, the dominant blocker stayed `disconnected`, the first failing hop stayed `windows_edge_forced_host`, and both forced-host plus public-owner checks stayed red.
3. Even after the post-Phase-21 follow-up checkpoint, the exact smoke contract still settled only at `1/9 ready` with a degraded pool and a fully red public canary on `shared-6`.
