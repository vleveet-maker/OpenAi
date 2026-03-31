# 11 Plan 01 Summary

- Added the canonical `infra/windows-block/test-rollout-smoke.ps1` wrapper for the current public-owner topology.
- The wrapper now reads `/internal/host-pool`, `/internal/workers`, and `/internal/observability/summary`, then composes public `healthz`, `v1/models`, and canary `v1/chat/completions` proof on `shared-6` against `http://77.66.186.75`.
- A rollout-smoke run now writes durable JSON and Markdown artifacts and mirrors the same latest machine-readable payload to `infra/data/rollout-smoke/latest.json`.
- The Windows/public-edge docs now pin one exact rerun command and explicitly state what Phase 11 smoke does not prove.
