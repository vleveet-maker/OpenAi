# Phase 25 Wave 1 Summary

- Backported the live reverse-tunnel supervision truth into `start-reverse-tunnels.ps1` and `register-browser-block-tasks.ps1`.
- Added `-Foreground`, `StartWhenAvailable`, and restart policy so the reverse-tunnel task can fail loudly and recover durably.
- Added the canonical Phase 25 wrapper `recover-reverse-tunnels-and-external-api-readiness.ps1`.
- Updated the packaged handoff assets and docs to treat `Ubuntu nginx -> 127.0.0.1:4010` as the canonical public path.
- Removed Windows `Caddy` from the active public-edge story in the Phase 25 docs.

## Verification

- PowerShell parser checks passed for:
  - `infra/windows-block/start-reverse-tunnels.ps1`
  - `infra/windows-block/register-browser-block-tasks.ps1`
  - `infra/windows-block/build-windows-browser-block-package.ps1`
  - `infra/windows-block/recover-reverse-tunnels-and-external-api-readiness.ps1`
- Grep verification passed for:
  - `phase25-live-fix-backport-v1`
  - `127.0.0.1:4010`
  - `OWMCGP Browser Block - Reverse Tunnels`
  - `Foreground`
  - `StartWhenAvailable`

## Outcome

Wave 1 is complete locally. The repo and archive now carry the live tunnel/task/topology truth instead of the retired Windows-edge assumptions.
