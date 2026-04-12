# 21 Plan 03 Summary

- The deployed Windows browser-block host overlaid the Phase 21 archive, restarted `control-api` on `127.0.0.1:8081`, ran the exact post-parity remediation harness, and confirmed both `GET /internal/post-parity-disconnected-runtime-remediation/latest` plus `/internal/admin`.
- The live remediation verdict stayed negative before smoke: `hold_rollout`, pre-remediation `0/9 ready`, post-remediation `0/9 ready`, dominant blocker `disconnected`, first failing hop `windows_edge_forced_host`, and both forced-host plus public-owner checks failed.
- The exact Phase 11 smoke rerun also happened and refreshed `11-SMOKE-SUMMARY.json` plus `11-SMOKE-SUMMARY.md`.
- The final smoke verdict remained `hold_rollout`: final stage `after_settle`, pool status `degraded`, ready workers `1/9`, and the public canary on `shared-6` returned `502` on `healthz`, `v1/models`, and `v1/chat/completions`.
- Preserve-first safety held end-to-end: profiles and sessions were not reset, cookies and local storage were not cleared, `shared-6` was stopped again after cleanup, port `4028` was not left listening, and the browser was closed after the run.
- Technical note: the smoke rerun only succeeded after `test-rollout-smoke.ps1` was brought back to a probe-compatible call scheme, because the checkpoint archive `phase21-live-remediation-checkpoint-sync-20260401-180543.zip` contained Phase 21 checkpoint artifacts and not a fresh smoke-script overlay.
