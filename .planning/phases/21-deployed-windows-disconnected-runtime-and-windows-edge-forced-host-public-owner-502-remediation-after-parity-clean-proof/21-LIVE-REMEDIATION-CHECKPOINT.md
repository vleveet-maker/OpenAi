# 21 Live Remediation Checkpoint

- The deployed Windows browser-block host overlaid the Phase 21 archive, restarted `control-api` on `127.0.0.1:8081`, and ran the exact post-parity remediation harness after correcting an overlay mistake where the Phase 21 path under `.planning/phases` had landed as a file instead of a directory.
- The live remediation run wrote `21-REMEDIATION-SUMMARY.json` plus `21-REMEDIATION-SUMMARY.md` on the deployed host.
- Operator-surface confirmation is complete for the remediation artifact: `GET /internal/post-parity-disconnected-runtime-remediation/latest` returned the same latest result and `/internal/admin` showed `Latest post-parity disconnected runtime remediation`.
- The live remediation verdict stayed negative before smoke: `hold_rollout`, pre-remediation `0/9 ready`, post-remediation `0/9 ready`, dominant blocker `disconnected`, first failing hop `windows_edge_forced_host`, and both forced-host plus public-owner checks failed.
- Preserve-first safety held during the live remediation run: profiles and sessions were not reset, cookies and local storage were not cleared, `shared-6` was stopped again after cleanup, port `4028` was not left listening, and `4040` plus `8081` remained loopback-only.
- The exact Phase 11 smoke rerun is still pending, so Phase 21 is not yet closed and `WPCP-04` remains incomplete.
