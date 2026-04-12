# 15 Plan 02 Summary

- `control-api` now exposes a file-backed `GET /internal/disconnected-baseline-remediation/latest` route sourced from `infra/data/disconnected-baseline-remediation/latest.json`.
- `/internal/admin` now renders a dedicated `Latest disconnected baseline remediation` section with an explicit empty state plus the recovered ready count, dominant remaining blocker class, forced-Host hop status, public-owner hop status, and verdict when data exists.
- Added route coverage and admin-page coverage for the new latest-remediation operator surface.
- PowerShell parser checks passed, targeted latest-remediation tests passed, the full `services/control-api` suite passed (`19` files, `95` tests), and the TypeScript build succeeded.
