# 14 Plan 01 Summary

- Added the canonical `infra/windows-block/investigate-zero-ready-root-cause.ps1` wrapper for Phase 14 so the deployed Windows host can capture one durable zero-ready baseline, classify every worker, and record hop-by-hop canary truth.
- `probe-public-api.ps1` now records hop-aware evidence including `hopName`, `requestUrl`, `requestHostHeader`, `serverHeader`, `viaHeader`, and `bodyPreview`, which makes the first failing `502` hop evidence durable instead of opaque.
- The new root-cause harness writes Phase 14 JSON and Markdown artifacts plus the file-backed latest payload at `infra/data/zero-ready-root-cause/latest.json`.
- Windows/browser-block operator docs now include the exact Phase 14 repo-to-host sync list, the live command, and the unchanged preserve-first ban on destructive reset behavior.
