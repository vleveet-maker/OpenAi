# 22 Live Follow-Up Checkpoint

- The deployed Windows browser-block host overlaid the Phase 22 archive, restarted `control-api` on `127.0.0.1:8081`, and ran the exact post-Phase-21 follow-up harness.
- The live follow-up run wrote `22-FOLLOWUP-SUMMARY.json` plus `22-FOLLOWUP-SUMMARY.md` on the deployed host.
- Operator-surface confirmation is complete for the follow-up artifact: `GET /internal/post-phase21-disconnected-runtime-followup/latest` returned the same latest result and `/internal/admin` showed `Latest post-phase21 disconnected runtime follow-up`.
- The live follow-up verdict stayed negative before smoke: `hold_rollout`, pre-remediation `0/9 ready`, post-remediation `0/9 ready`, dominant blocker `disconnected`, first failing hop `windows_edge_forced_host`, `loopbackStatus` stayed green, and both forced-host plus public-owner checks failed.
- Preserve-first safety held during the live follow-up run: the nine profiles and accounts were not reset, `shared-6` was stopped again after cleanup, and port `4028` was not left listening.
- The exact Phase 11 smoke rerun is still pending, so Phase 22 is not yet closed and `WPFU-04` remains incomplete.
