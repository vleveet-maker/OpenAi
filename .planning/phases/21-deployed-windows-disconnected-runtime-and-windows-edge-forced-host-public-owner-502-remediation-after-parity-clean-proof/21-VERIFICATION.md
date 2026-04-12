# 21 Verification

## Final Verdict

`hold_rollout`

## Confirmed Live Truth

- The deployed Windows browser-block host overlaid the Phase 21 archive and restarted `control-api` on `127.0.0.1:8081` before the live remediation run.
- The live remediation run wrote `21-REMEDIATION-SUMMARY.json` plus `21-REMEDIATION-SUMMARY.md`.
- Operator-surface confirmation is complete for the remediation artifact:
  - `GET /internal/post-parity-disconnected-runtime-remediation/latest` returned the current latest remediation result
  - `/internal/admin` showed `Latest post-parity disconnected runtime remediation`
- The remediation result was explicit before smoke:
  - `hold_rollout`
  - compatibility version `phase21-post-parity-remediation-v1`
  - pre-remediation ready = `0/9`
  - post-remediation ready = `0/9`
  - dominant runtime blocker = `disconnected`
  - first failing hop = `windows_edge_forced_host`
  - forced-host and public-owner checks both failed
- The exact smoke rerun also happened after the remediation checkpoint:
  - `11-SMOKE-SUMMARY.json` refreshed on the deployed host
  - `11-SMOKE-SUMMARY.md` refreshed on the deployed host
  - final smoke verdict remained `hold_rollout`
  - final smoke stage = `after_settle`
  - final smoke pool status = `degraded`
  - final smoke ready workers = `1/9`
  - public canary on `shared-6` failed with `502` on `healthz`, `v1/models`, and `v1/chat/completions`
- Preserve-first safety held during both the remediation run and the smoke rerun:
  - profiles were not deleted
  - cookies and local storage were not cleared
  - no blind full-pool restart happened
  - no mass relogin happened
  - `shared-6` was stopped again after cleanup
  - port `4028` was no longer listening
  - the browser was closed after the smoke rerun

## Requirement Status

- `WPCP-01`: complete
  - the live post-parity remediation flow ran preserve-first and recorded explicit before/after truth for the still-disconnected baseline
- `WPCP-02`: complete
  - the remediation artifact kept `windows_edge_forced_host` and the downstream public-owner failure explicit instead of collapsing them into one vague public `502`
- `WPCP-03`: complete
  - `GET /internal/post-parity-disconnected-runtime-remediation/latest` and `/internal/admin` both showed the same latest remediation result
- `WPCP-04`: complete
  - the proven Phase 11 smoke reran after the Phase 21 remediation checkpoint and ended with one explicit final verdict: `hold_rollout`

## Repo/Runtime Compatibility Note

- The smoke rerun itself exposed one narrow compatibility regression: `Convert-PublicProbeResult` in `test-rollout-smoke.ps1` crashed when the probe payload omitted `chatCompletions`.
- The deployed host restored `test-rollout-smoke.ps1` to a probe-compatible call scheme before the successful rerun because the checkpoint archive `phase21-live-remediation-checkpoint-sync-20260401-180543.zip` only contained planning/artifact checkpoint files and not a fresh smoke-script overlay.
- The repo now backports a guard in `test-rollout-smoke.ps1` so the smoke wrapper records a normal probe failure instead of crashing when `chatCompletions` is absent.
- The raw deployed-host script diff was not synced back verbatim into this checkout.

## Local Reconstruction Note

- The local copies of `21-REMEDIATION-SUMMARY.json`, `21-REMEDIATION-SUMMARY.md`, `11-SMOKE-SUMMARY.json`, `11-SMOKE-SUMMARY.md`, and the matching `latest.json` files are reconstructed from the operator report because the raw deployed-host artifacts were not synced back into this checkout.

## Remaining Rollout Blocker

1. Phase 21 is complete, and the remaining rollout blocker is no longer missing tooling, missing operator visibility, or the absence of a smoke rerun.
2. The blocker is still the live runtime path: remediation stayed `0/9 -> 0/9 ready`, the dominant blocker stayed `disconnected`, the first failing hop stayed `windows_edge_forced_host`, and both forced-host plus public-owner checks stayed red.
3. Even after the post-parity remediation checkpoint, the exact smoke contract still settled only at `1/9 ready` with a degraded pool and a fully red public canary on `shared-6`.
