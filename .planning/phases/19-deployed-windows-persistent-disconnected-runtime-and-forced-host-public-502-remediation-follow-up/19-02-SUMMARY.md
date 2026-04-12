# 19-02 Summary

## Outcome

- Added `GET /internal/persistent-disconnected-runtime-followup/latest`
- Added the `Latest persistent disconnected runtime follow-up` section to `/internal/admin`
- Regenerated the `services/control-api/dist` runtime so the deployed host can serve the same Phase 19 route and admin surface from `dist`

## Verification

- `npm.cmd --prefix services/control-api test -- internal-persistent-disconnected-runtime-followup.test.ts`
- `npm.cmd --prefix services/control-api test -- internal-admin-page.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

## Notes

- The new route reuses BOM-safe latest-state parsing through `read-latest-state.ts`
- The admin surface renders the empty state plus the populated fields `preFollowupReadyCount`, `postFollowupReadyCount`, `dominantRuntimeBlocker`, `firstFailingHop`, `forcedHostStatus`, `publicOwnerStatus`, `scriptCompatibilityVersion`, and `verdict`
