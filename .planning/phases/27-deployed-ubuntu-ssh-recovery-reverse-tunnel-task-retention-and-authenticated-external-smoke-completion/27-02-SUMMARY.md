# Phase 27 Wave 2 Summary

- Added `POST_PHASE26_UBUNTU_SSH_RECOVERY_STATE_PATH` support in `services/control-api/src/config.ts`.
- Added `GET /internal/post-phase26-ubuntu-ssh-recovery/latest`.
- Added the `/internal/admin` section `Latest post-phase26 Ubuntu SSH recovery`.
- Added route coverage in `internal-post-phase26-ubuntu-ssh-recovery.test.ts`.
- Extended admin-page coverage so the new latest-state surface is exercised together with the existing internal sections.
- Rebuilt the served `control-api` runtime from the updated source.

## Verification

- `npm.cmd --prefix services/control-api test -- edge-config.test.ts internal-admin-page.test.ts internal-post-phase26-ubuntu-ssh-recovery.test.ts`
- `npm.cmd --prefix services/control-api test`
- `npm.cmd --prefix services/control-api run build`

Results:

- targeted tests: `3 files / 6 tests` passed
- full suite: `31 files / 131 tests` passed
- build: passed

## Outcome

Wave 2 is complete locally. Operators can now inspect the latest Phase 27 Ubuntu SSH recovery artifact through the same `control-api` runtime files that the deployed hosts are expected to serve.
