# Disconnected Baseline Remediation Summary

- Generated: 2026-04-01 (reconstructed from operator report)
- Script compatibility version: phase15-disconnected-baseline-remediation-v1
- Verdict: hold_rollout
- Summary: the final remediation snapshot still ended at 0/9 ready; only `shared-6` temporarily came up, passed `loopback_api` with `200/200/200` and `reply=probe-ok`, but `windows_edge_forced_host` remained red with `transport_error`, and `ubuntu_public_owner` remained red with `502/502/502` through `nginx/1.18.0 (Ubuntu)`.

## Latest Remediation

- recoveredReadyCount: 1 (inferred from the operator report that only `shared-6` temporarily recovered)
- finalReadyCount: 0/9
- dominantRemainingBlockerClass: disconnected
- forcedHostHopStatus: passed=false healthz=n/a models=n/a chat=n/a errorKind=transport_error
- publicOwnerHopStatus: passed=false healthz=502 models=502 chat=502 server=nginx/1.18.0 (Ubuntu)

## Preserve-First

- profilesDeleted: false
- cookiesCleared: false
- localStorageCleared: false
- blindFullPoolRestartPerformed: false
- massReloginPerformed: false

## Post-Run State

- shared-6 stopped again: true
- port 4028 listening: false
- active listening workers: 0

## Runtime Drift Notes

- The deployed host required compatibility fixes in:
  - `remediate-disconnected-baseline-and-forced-host-edge.ps1`
  - `recover-browser-block-readiness.ps1`
  - `probe-public-api.ps1`
