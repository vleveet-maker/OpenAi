# 13 Plan 02 Summary

- `control-api` now exposes a file-backed `GET /internal/post-recovery-regression/latest` route sourced from `infra/data/post-recovery-regression/latest.json`.
- `/internal/admin` now renders a dedicated `Latest post-recovery smoke regression` section with an explicit empty state and the latest compatibility version, recovered ready count, final smoke ready count, first regression stage, stage list, verdict, and `shared-6` canary outcome when data exists.
- Added route coverage and admin-page coverage for the new latest-regression operator surface.
- PowerShell parser checks, targeted regression-surface tests, the full `services/control-api` test suite (`17` files, `91` tests), and the `services/control-api` TypeScript build all pass.
