# 11 Plan 02 Summary

- `control-api` now exposes a file-backed `GET /internal/rollout-smoke/latest` route sourced from `infra/data/rollout-smoke/latest.json`.
- `/internal/admin` now renders a dedicated `Latest rollout smoke` section with an explicit empty state and the latest verdict, canary worker, and readiness summary when data exists.
- Added tests for both the empty and populated latest-smoke states, plus admin-page coverage for the new operator surface.
- The targeted rollout-smoke tests, the full `control-api` test suite, and the `control-api` build all pass with the new surface in place.
