# 21-02 Summary

## Outcome

- Added `GET /internal/post-parity-disconnected-runtime-remediation/latest`
- Added the `Latest post-parity disconnected runtime remediation` section to `/internal/admin`
- Added tests for the new latest route, including the BOM-prefixed `latest.json` case
- Rebuilt `services/control-api/dist` so the deployed host can serve the same Phase 21 route and admin surface from `dist`

## Verification

- `npm.cmd --prefix services/control-api test -- internal-post-parity-disconnected-runtime-remediation.test.ts internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

## Notes

- The new route reuses BOM-safe latest-state parsing through `read-latest-state.ts`
- The admin surface renders the empty state plus the populated fields `preRemediationReadyCount`, `postRemediationReadyCount`, `dominantRuntimeBlocker`, `firstFailingHop`, `forcedHostStatus`, `publicOwnerStatus`, `scriptCompatibilityVersion`, and `verdict`
