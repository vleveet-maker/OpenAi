# 17 Verification

## Final Verdict

`runtime_blocker_confirmed`

## Confirmed Live Truth

- The live Phase 17 runtime investigation harness ran on the deployed Windows browser-block host after the Phase 17 archive overlay.
- The deployed host restarted `control-api` on `127.0.0.1:8081` before the live run.
- The deployed host wrote `17-RUNTIME-INVESTIGATION-SUMMARY.json` and `17-RUNTIME-INVESTIGATION-SUMMARY.md`.
- The final runtime-investigation verdict was explicit:
  - `runtime_blocker_confirmed`
  - compatibility version `phase17-post-stabilization-runtime-investigation-v1`
  - pre-investigation ready = `0/9`
  - post-canary ready = `1/9`
  - final ready = `0/9`
  - dominant runtime blocker = `disconnected`
  - first failing hop = `windows_edge_forced_host`
  - public path `http://77.66.186.75` returned `502` on `healthz`, `v1/models`, and `v1/chat/completions`
- Operator-surface confirmation is complete:
  - `GET /internal/post-stabilization-runtime-investigation/latest` returned the current latest result
  - `/internal/admin` showed `Latest post-stabilization runtime investigation`
- Preserve-first safety held during the live run:
  - profiles were not deleted
  - cookies and local storage were not cleared
  - no mass relogin happened
  - no blind full-pool restart happened
  - `shared-6` was stopped again after cleanup
  - port `4028` was no longer listening
  - the nine logged-in accounts were not damaged

## Requirement Status

- `WRTI-01`: complete
  - the project now has a durable Phase 17 runtime-investigation artifact that correlates baseline, canary, final readiness, hop results, and local runtime evidence instead of another vague degraded snapshot
- `WRTI-02`: complete
  - the repeated public-canary `502` branch is now captured hop-by-hop and the first failing hop is explicit: `windows_edge_forced_host`
- `WRTI-03`: complete
  - `GET /internal/post-stabilization-runtime-investigation/latest` and `/internal/admin` both showed the same latest runtime-investigation result
- `WRTI-04`: complete
  - the phase ends with one explicit final verdict: `runtime_blocker_confirmed`

## Repo/Runtime Drift Note

- The deployed host required additional live compatibility restores after the overlay before the live run would complete cleanly:
  - `probe-public-api.ps1`
  - `test-rollout-smoke.ps1`
  - `investigate-post-stabilization-runtime-and-public-502.ps1`
  - `stabilize-post-remediation-degraded-smoke.ps1`
- Those runtime-side hotfixes are not yet fully synced back into this checkout, so Phase 17 closes on truthful runtime evidence and operator confirmation rather than on a fresh parity claim.

## Local Reconstruction Note

- The local copies of `17-RUNTIME-INVESTIGATION-SUMMARY.json`, `17-RUNTIME-INVESTIGATION-SUMMARY.md`, and `infra/data/post-stabilization-runtime-investigation/latest.json` are reconstructed from the operator report because the raw deployed-host artifacts were not synced back into this checkout.

## Remaining Rollout Blocker

1. Phase 17 is complete, and the remaining rollout blocker is no longer lack of evidence: the dominant runtime blocker is explicitly `disconnected`.
2. The first failing public-canary hop is explicitly `windows_edge_forced_host`, while the public path at `http://77.66.186.75` still returns `502` after that branch.
3. The next remediation step should target both the disconnected runtime baseline and the deployed-host compatibility drift that reappeared in the live wrappers.
