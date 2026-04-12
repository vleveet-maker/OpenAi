# 14 Plan 03 Summary

- The live Phase 14 root-cause harness ran on the deployed Windows browser-block host and ended with the explicit verdict `root_cause_confirmed`.
- The zero-ready baseline remained fully degraded before the bounded canary probe: `0/9 ready`, `9/9 disconnected`, so the dominant blocker class is now explicit instead of another vague degraded snapshot.
- The canary hop ladder is now also exact: `loopback_api` stayed green with `200/200/200`, the first failing hop was `windows_edge_forced_host`, and the public owner `http://77.66.186.75` returned `502` on `healthz`, `v1/models`, and `v1/chat/completions` with `Server: nginx/1.18.0 (Ubuntu)`.
- Operator visibility is proven end-to-end: `GET http://127.0.0.1:8081/internal/zero-ready-root-cause/latest` returned the current latest result, and `/internal/admin` showed `Latest zero-ready root cause`.
- Preserve-first safety held during the live run: profiles were not deleted, cookies and local storage were not cleared, there was no mass restart or relogin, and canary `shared-6` was stopped again after the bounded probe with `agentListening=false`, `browserListening=false`, and port `4028` not listening.
- The deployed host needed one compat fix before the wrapper would run cleanly: `investigate-zero-ready-root-cause.ps1` now invokes `probe-public-api.ps1` with named parameters instead of array-based positional forwarding, and that parity fix is now synced back into the repo.
