# 13 Plan 01 Summary

- Added the canonical `infra/windows-block/investigate-post-recovery-smoke-regression.ps1` wrapper for Phase 13 so the deployed Windows host can capture stage-by-stage truth across `before_recovery`, `after_recovery`, `before_smoke`, `after_canary_start`, `after_canary_stop`, `after_smoke`, and `after_settle`.
- The regression harness now drives the existing Phase 12 recovery wrapper and Phase 11 smoke wrapper, writes durable JSON and Markdown artifacts for Phase 13, and mirrors the latest machine-readable payload to `infra/data/post-recovery-regression/latest.json`.
- `test-host-worker-relay.ps1`, `recover-browser-block-readiness.ps1`, and `test-rollout-smoke.ps1` now share the explicit compatibility marker `scriptCompatibilityVersion=phase13-post-recovery-smoke-regression-v1`, plus concrete canary lifecycle truth about whether `shared-6` was stopped immediately or deferred until the final snapshot.
- Windows/browser-block docs now include one exact repo-to-host sync checklist for the four Phase 13 scripts and one exact preserve-first harness command with the `15/10/15` delay contract and `shared-6` as the bounded canary.
