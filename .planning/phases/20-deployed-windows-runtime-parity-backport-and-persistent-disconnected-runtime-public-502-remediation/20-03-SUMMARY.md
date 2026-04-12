# 20 Plan 03 Summary

- The deployed Windows browser-block host overlaid the Phase 20 parity-clean archive, restarted `control-api` on `127.0.0.1:8081`, ran the exact remediation harness, and wrote `20-REMEDIATION-SUMMARY.json`.
- Operator-surface confirmation is complete: `GET /internal/runtime-parity-backport-remediation/latest` returned the same latest remediation result and `/internal/admin` showed `Latest runtime parity backport remediation`.
- The live parity-clean remediation verdict stayed negative before smoke: `hold_rollout`, pre-remediation `0/9 ready`, post-remediation `0/9 ready`, dominant blocker `disconnected`, first failing hop `windows_edge_forced_host`, and both forced-host plus public-owner checks stayed red.
- The required exact Phase 11 smoke rerun also happened and refreshed `11-SMOKE-SUMMARY.json`.
- The final smoke verdict remained `hold_rollout`: final stage `after_settle`, pool status `degraded`, ready workers `1/9`, and the public canary on `shared-6` returned `502` on `healthz`, `v1/models`, and `v1/chat/completions`.
- Preserve-first safety held end-to-end: profiles and sessions were not reset, cookies and local storage were not cleared, no mass restart or relogin happened, `shared-6` was stopped again after cleanup, port `4028` was not left listening, and only `127.0.0.1:4040` plus `127.0.0.1:8081` remained listening from the required ports.
- Unlike the earlier follow-up phases, the live Phase 20 run did not report any new post-overlay server-only compatibility restore, so the parity-clean archive is now proven as deployed-host runnable even though rollout remains held.
