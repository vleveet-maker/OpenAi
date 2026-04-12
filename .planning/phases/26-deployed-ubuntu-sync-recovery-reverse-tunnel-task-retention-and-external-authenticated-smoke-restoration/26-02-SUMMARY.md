# Phase 26 Wave 2 Summary

- Added `POST_PHASE25_EXTERNAL_RESTORATION_STATE_PATH` support in `services/control-api/src/config.ts`.
- Added `GET /internal/post-phase25-external-restoration/latest`.
- Added a new `/internal/admin` section: `Latest post-phase25 external restoration`.
- Added route coverage and admin-page coverage for the new latest-state surface.
- Rebuilt the served `control-api` runtime from the updated source.

## Verification

- `npm.cmd --prefix services/control-api test -- edge-config.test.ts internal-admin-page.test.ts internal-post-phase25-external-restoration.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

Results:

- targeted tests: `3 files / 6 tests` passed
- full suite: `30 files / 128 tests` passed
- build: passed

## Outcome

Wave 2 is complete locally. Operators can now inspect the Phase 26 Ubuntu-sync and external-restoration artifact through the same `control-api` runtime files the deployed host serves.
