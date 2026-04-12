# 18 Plan 03 Summary

- The deployed Windows browser-block host overlaid the Phase 18 archive, restarted `control-api` on `127.0.0.1:8081`, ran the exact disconnected-runtime remediation harness, and wrote `18-REMEDIATION-SUMMARY.json` plus `18-REMEDIATION-SUMMARY.md`.
- Operator-surface confirmation is complete: `GET /internal/disconnected-runtime-remediation/latest` returned the same latest remediation result and `/internal/admin` showed `Latest disconnected runtime remediation`.
- The live remediation verdict stayed negative before smoke: `hold_rollout`, baseline `0/9 ready`, post-remediation `0/9 ready`, dominant blocker `disconnected`, first failing hop `windows_edge_forced_host`, and the public gate still returned `502`.
- The required exact Phase 11 smoke rerun also happened and refreshed `11-SMOKE-SUMMARY.json` plus `11-SMOKE-SUMMARY.md`.
- The final smoke verdict remained `hold_rollout`: final stage `after_settle`, pool status `degraded`, ready workers `1/9`, and the public canary on `shared-6` returned `502` on `healthz`, `v1/models`, and `v1/chat/completions`.
- Preserve-first safety held end-to-end: profiles and sessions were not reset, cookies and local storage were not cleared, no mass restart or relogin happened, `shared-6` was stopped again after cleanup, `agentListening=false`, `browserListening=false`, and port `4028` was not left listening.
- The deployed host had to restore the `test-rollout-smoke.ps1` status-schema compatibility during the smoke rerun because the overlay had reverted the wrapper to the older `status.detail` assumption; the repo copy now backports that compatibility so the next archive keeps parity.
