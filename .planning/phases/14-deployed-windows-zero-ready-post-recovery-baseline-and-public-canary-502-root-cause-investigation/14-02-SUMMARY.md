# 14 Plan 02 Summary

- `control-api` now exposes a file-backed `GET /internal/zero-ready-root-cause/latest` route sourced from `infra/data/zero-ready-root-cause/latest.json`.
- `/internal/admin` now renders a dedicated `Latest zero-ready root cause` section with an explicit empty state plus the dominant blocker class, ready/disconnected counts, first failing hop, and public-owner hop result when data exists.
- Added route coverage and admin-page coverage for the new latest root-cause operator surface.
- Targeted root-cause route tests, targeted admin-page tests, the full `services/control-api` suite (`18` files, `93` tests), and the `services/control-api` TypeScript build all pass.
