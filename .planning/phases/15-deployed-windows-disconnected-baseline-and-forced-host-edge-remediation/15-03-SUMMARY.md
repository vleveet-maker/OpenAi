# 15 Plan 03 Summary

- The live Phase 15 remediation harness ran on the deployed Windows browser-block host and wrote `15-REMEDIATION-SUMMARY.json` plus `15-REMEDIATION-SUMMARY.md`.
- The deployed host then confirmed operator visibility: `GET /internal/disconnected-baseline-remediation/latest` returned latest, and `/internal/admin` showed `Latest disconnected baseline remediation`.
- The exact post-remediation Phase 11 smoke rerun also happened and refreshed `11-SMOKE-SUMMARY.json`, `11-SMOKE-SUMMARY.md`, and `infra/data/rollout-smoke/latest.json` on the deployed host.
- The final Phase 15 verdict is `hold_rollout`.
- The pre-smoke remediation truth was already negative: the final remediation snapshot stayed at `0/9 ready`, only `shared-6` temporarily came up and passed `loopback_api` with `200/200/200` plus `reply=probe-ok`, `windows_edge_forced_host` remained `transport_error`, and `ubuntu_public_owner` remained `502` on `healthz`, `v1/models`, and `v1/chat/completions` through `nginx/1.18.0 (Ubuntu)`.
- The post-remediation smoke truth stayed negative too: the final smoke stage was `after_settle`, the pool status remained `degraded`, the final smoke snapshot had only `1/9 ready`, and the public canary on `shared-6` returned `502/502/502`.
- Preserve-first safety held through both runs: profiles and sessions were not touched, `shared-6` was stopped again after cleanup, port `4028` was not left listening, and active listening workers returned to `0`.
- The deployed host required runtime-specific hotfixes before route confirmation plus smoke rerun would run cleanly: the operator reported changes in `config.ts`, `server.ts`, `internal-admin-page.ts`, `config.js`, `server.js`, `internal-admin-page.js`, `probe-public-api.ps1`, and `test-rollout-smoke.ps1`.
