# 15 Plan 01 Summary

- Added the canonical `infra/windows-block/remediate-disconnected-baseline-and-forced-host-edge.ps1` wrapper for Phase 15 so the deployed Windows host can capture one preserve-first remediation attempt from `before_remediation` through `after_canary_stop`.
- The new wrapper reuses the existing readiness-recovery flow plus hop-aware probes, writes durable Phase 15 JSON and Markdown artifacts, mirrors `infra/data/disconnected-baseline-remediation/latest.json`, and exposes the exact fields `recoveredReadyCount`, `dominantRemainingBlockerClass`, `forcedHostHopStatus`, `publicOwnerHopStatus`, and `verdict`.
- Windows/browser-block operator docs now include the exact Phase 15 sync list, the exact live remediation command, and the unchanged preserve-first ban on profile deletion, cookie clearing, local-storage clearing, blind full-pool restart, and mass relogin.
