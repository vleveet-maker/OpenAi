# 19 Plan 03 Summary

- The deployed Windows browser-block host overlaid the Phase 19 archive, restarted `control-api` on `127.0.0.1:8081`, ran the exact persistent disconnected-runtime follow-up harness, and wrote `19-FOLLOWUP-SUMMARY.json` plus `19-FOLLOWUP-SUMMARY.md`.
- Operator-surface confirmation is complete: `GET /internal/persistent-disconnected-runtime-followup/latest` returned the same latest follow-up result and `/internal/admin` showed `Latest persistent disconnected runtime follow-up`.
- The live follow-up verdict stayed negative before smoke: `hold_rollout`, pre-follow-up `0/9 ready`, post-follow-up `0/9 ready`, dominant blocker `disconnected`, first failing hop `windows_edge_forced_host`, and the public owner still returned `502`.
- The required exact Phase 11 smoke rerun also happened and refreshed `11-SMOKE-SUMMARY.json` plus `11-SMOKE-SUMMARY.md`.
- The final smoke verdict remained `hold_rollout`: final stage `after_settle`, pool status `degraded`, ready workers `1/9`, and the public canary on `shared-6` returned `502` on `healthz`, `v1/models`, and `v1/chat/completions`.
- Preserve-first safety held end-to-end: profiles and sessions were not reset, cookies and local storage were not cleared, no mass restart or relogin happened, `shared-6` was stopped again after cleanup, and port `4028` was not left listening.
- The deployed host still needed runtime-specific compatibility restores after overlay in `probe-public-api.ps1`, `recover-browser-block-readiness.ps1`, `remediate-disconnected-runtime-and-forced-host-edge.ps1`, `remediate-persistent-disconnected-runtime-and-public-502.ps1`, `test-rollout-smoke.ps1`, and `test-host-worker-relay.ps1`; those raw code changes are not yet synced back into this checkout.
