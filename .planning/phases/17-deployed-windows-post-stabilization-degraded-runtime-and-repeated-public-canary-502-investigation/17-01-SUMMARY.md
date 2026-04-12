# 17 Plan 01 Summary

- Added the canonical `infra/windows-block/investigate-post-stabilization-runtime-and-public-502.ps1` wrapper with the explicit compatibility marker `phase17-post-stabilization-runtime-investigation-v1`.
- The new harness captures the exact Phase 17 stage sequence `before_runtime_probe`, `after_canary_start`, `after_loopback_probe`, `after_public_probe`, `after_smoke_settle`, and `after_cleanup`.
- The runtime-investigation artifact now correlates host-controller truth, internal worker truth, repeated public-canary hop results, and local listener/process evidence for worker ports `4021..4029` plus `4040`, `8080`, and `8081`.
- Windows/browser-block operator docs now include the exact Phase 17 sync list, the exact live investigation command, the exact output artifact names `17-RUNTIME-INVESTIGATION-SUMMARY.json` plus `17-RUNTIME-INVESTIGATION-SUMMARY.md`, and the unchanged preserve-first ban on destructive reset behavior.
