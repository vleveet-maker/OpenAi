# 17 Plan 03 Summary

- The Phase 17 archive was overlaid onto the deployed Windows browser-block host and `control-api` was restarted on `127.0.0.1:8081` before the live run.
- The exact `investigate-post-stabilization-runtime-and-public-502.ps1` command ran on the deployed host and wrote `17-RUNTIME-INVESTIGATION-SUMMARY.json` plus `17-RUNTIME-INVESTIGATION-SUMMARY.md`.
- The live verdict is now explicit: `runtime_blocker_confirmed`, with baseline `0/9 ready`, temporary `1/9 ready` after canary `shared-6`, final `0/9 ready` after smoke and cleanup, dominant runtime blocker `disconnected`, and first failing hop `windows_edge_forced_host`.
- Operator-surface confirmation is complete: `GET /internal/post-stabilization-runtime-investigation/latest` returned the current latest result and `/internal/admin` showed `Latest post-stabilization runtime investigation`.
- Preserve-first safety held: profiles were not deleted, cookies and local storage were not cleared, no blind full-pool restart happened, `shared-6` was stopped again after the run, port `4028` was not listening, and the nine logged-in accounts were not damaged.
