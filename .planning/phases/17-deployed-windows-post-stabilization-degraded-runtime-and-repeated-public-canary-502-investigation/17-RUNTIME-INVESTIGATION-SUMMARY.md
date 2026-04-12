# Post-Stabilization Runtime Investigation Summary

- Generated: 2026-04-01T07:16:00.000Z
- Script compatibility version: phase17-post-stabilization-runtime-investigation-v1
- Verdict: runtime_blocker_confirmed
- Canary worker: shared-6
- Pre-investigation ready count: 0
- Post-canary ready count: 1
- Final ready count: 0
- Dominant runtime blocker: disconnected
- First failing hop: windows_edge_forced_host
- Public path `http://77.66.186.75`: `502` on `healthz`, `v1/models`, and `v1/chat/completions`
- Operator-surface confirmation: `/internal/post-stabilization-runtime-investigation/latest` returned the latest artifact and `/internal/admin` showed `Latest post-stabilization runtime investigation`
- Preserve-first: profiles were not deleted, cookies and local storage were not cleared, no blind full-pool restart happened, no mass relogin happened, `shared-6` was stopped again, and port `4028` was not listening after cleanup

## Local Reconstruction Note

- This local Markdown artifact is reconstructed from the deployed-host operator report because the raw Phase 17 artifacts were not synced back into this checkout.
