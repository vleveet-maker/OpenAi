# Disconnected Runtime Remediation Summary

- Generated: 2026-04-01 (reconstructed from operator report)
- Script compatibility version: `phase18-runtime-remediation-v1`
- Verdict: `hold_rollout`
- Archive redeployed before run: yes
- `control-api` restarted into the new runtime: yes
- Operator surface matched the remediation artifact: yes

## Live Truth

- Pre-remediation ready: `0/9`
- Post-remediation ready: `0/9`
- Dominant runtime blocker: `disconnected`
- First failing hop: `windows_edge_forced_host`
- Loopback canary on `shared-6`: `200/200/200`, reply `probe-ok`
- Public owner gate: `http://77.66.186.75` returned `502`

## Preserve-First

- Profiles were not deleted
- Cookies and local storage were not cleared
- No blind full-pool restart happened
- No mass relogin happened
- `shared-6` was stopped again after the bounded run
- Port `4028` was not left listening

## Drift Note

- The deployed host still needed compatibility restores after the overlay in:
  - `probe-public-api.ps1`
  - `recover-browser-block-readiness.ps1`
  - `remediate-disconnected-runtime-and-forced-host-edge.ps1`

## Historical Note

- This artifact captures the remediation checkpoint before the required smoke rerun.
- Phase 18 later completed with a post-remediation smoke verdict `hold_rollout`; see `18-VERIFICATION.md`.
