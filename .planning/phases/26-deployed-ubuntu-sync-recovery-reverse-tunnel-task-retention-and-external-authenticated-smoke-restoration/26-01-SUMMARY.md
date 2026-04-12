# Phase 26 Wave 1 Summary

- Backported the remaining live operational fixes into tracked repo state instead of leaving them as deployed-host-only knowledge.
- Made scheduled-task timestamps null-safe in `infra/windows-block/recover-reverse-tunnels-and-external-api-readiness.ps1`.
- Normalized the CRLF-sensitive nginx template assertions in `services/control-api/test/edge-config.test.ts`.
- Stamped the deployment-critical chain with `phase26-ubuntu-sync-recovery-v1` in the tunnel and public-probe scripts.
- Updated the operator docs to treat `Ubuntu nginx -> 127.0.0.1:4010` as the canonical public path, reverse tunnels as rollout-critical, Windows `Caddy` as inactive, and GitHub as the only handoff source of truth.
- Added the canonical Phase 26 wrapper `infra/windows-block/recover-ubuntu-sync-and-external-auth-smoke.ps1`.
- Added the GitHub-first deployed-host handoff prompt `26-DEPLOYED-HOST-AGENT-TASK.md`.
- Added `infra/data/post-phase25-external-restoration/.gitkeep` for the new latest-state contract.

## Verification

- PowerShell parser checks passed for:
  - `infra/windows-block/start-reverse-tunnels.ps1`
  - `infra/windows-block/register-browser-block-tasks.ps1`
  - `infra/windows-block/recover-reverse-tunnels-and-external-api-readiness.ps1`
  - `infra/windows-block/recover-ubuntu-sync-and-external-auth-smoke.ps1`
  - `infra/windows-block/probe-public-api.ps1`
- Grep verification passed for:
  - `phase26-ubuntu-sync-recovery-v1`
  - `127.0.0.1:4010`
  - `GitHub-first`
  - `NextRunTime`
  - `LastRunTime`

## Outcome

Wave 1 is complete locally. The repo now carries the Phase 26 wrapper, the missing live fixes, and a GitHub-first deployed-host prompt for the cross-host run.
