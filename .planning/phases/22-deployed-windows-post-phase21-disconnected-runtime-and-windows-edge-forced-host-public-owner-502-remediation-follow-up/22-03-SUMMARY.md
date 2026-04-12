# 22 Plan 03 Summary

- The deployed Windows browser-block host overlaid the Phase 22 archive, restarted `control-api` on `127.0.0.1:8081`, ran the exact post-Phase-21 follow-up harness, and confirmed both `GET /internal/post-phase21-disconnected-runtime-followup/latest` plus `/internal/admin`.
- The live follow-up verdict stayed negative before smoke: `hold_rollout`, pre-remediation `0/9 ready`, post-remediation `0/9 ready`, dominant blocker `disconnected`, first failing hop `windows_edge_forced_host`, `loopbackStatus=passed`, and both forced-host plus public-owner checks failed.
- The exact Phase 11 smoke rerun also happened and refreshed `11-SMOKE-SUMMARY.json` plus `11-SMOKE-SUMMARY.md`.
- The final smoke verdict remained `hold_rollout`: final stage `after_settle`, pool status `degraded`, ready workers `1/9`, and the public canary on `shared-6` returned `502` on `healthz`, `v1/models`, and `v1/chat/completions`.
- Preserve-first safety held end-to-end: profiles and sessions were not reset, cookies and local storage were not cleared, `shared-6` was stopped again after cleanup, port `4028` was not left listening, and the browser was closed after the run.
- Technical note: the checkpoint archive `phase22-live-followup-checkpoint-sync-20260401-224716.zip` contained a stale `test-rollout-smoke.ps1`, so the successful smoke rerun used the current server-working copy of `test-rollout-smoke.ps1` instead of the archive copy.
