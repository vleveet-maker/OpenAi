# Phase 27 Wave 1 Summary

- Added the canonical Phase 27 wrapper `infra/windows-block/recover-ubuntu-ssh-reverse-tunnels-and-authenticated-smoke.ps1`.
- Stamped the deployment-critical chain with `phase27-ubuntu-ssh-recovery-v1` in:
  - `infra/windows-block/start-reverse-tunnels.ps1`
  - `infra/windows-block/register-browser-block-tasks.ps1`
  - `infra/windows-block/probe-public-api.ps1`
- Added `infra/data/post-phase26-ubuntu-ssh-recovery/.gitkeep` for the new latest-state contract.
- Added the GitHub-first deployed-host prompt `27-DEPLOYED-HOST-AGENT-TASK.md`.
- Updated the operator docs to require exact Ubuntu repo path/hash truth, exact SSH blocker classification, reverse-tunnel retention truth, and authenticated smoke from the host that actually has the bearer token.

## Verification

- PowerShell parser checks passed for:
  - `infra/windows-block/start-reverse-tunnels.ps1`
  - `infra/windows-block/register-browser-block-tasks.ps1`
  - `infra/windows-block/probe-public-api.ps1`
  - `infra/windows-block/recover-ubuntu-sync-and-external-auth-smoke.ps1`
  - `infra/windows-block/recover-ubuntu-ssh-reverse-tunnels-and-authenticated-smoke.ps1`
- Grep verification passed for:
  - `phase27-ubuntu-ssh-recovery-v1`
  - `sshFailureKind`
  - `ubuntuRepoPath`
  - `ubuntuRepoCommit`
  - `reverseTunnelTaskStatus`
  - `ubuntuTunnelListenerStatus`
  - `authenticatedSmokeTokenSource`
  - `windows-browser-block-api-20260331`
  - `git fetch origin`
  - `git pull --ff-only origin windows-browser-block-api-20260331`

## Outcome

Wave 1 is complete locally. The repo now carries the canonical Phase 27 wrapper, the GitHub-first host prompt, and the exact docs needed to distinguish Ubuntu SSH failure, reverse-tunnel retention failure, and authenticated external smoke failure without reopening stale topology branches.
