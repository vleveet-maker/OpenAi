# Phase 36 Token SSH Listener Recovery Summary

- Generated: 2026-04-14T23:36:42.7742007+03:00
- Script compatibility version: phase36-server-token-ssh-listener-recovery-v1
- Verdict: hold_rollout
- Recovery stage verdict: hold_rollout
- Summary: Hold rollout: nextBlocker=ubuntu_ssh_unreachable; tokenStatus=missing; selectedHost=none; listenersReady=False.
- Public base URL: http://77.66.186.75
- WorkerId: wife

## Token

- status: missing
- source: missing
- secretValueRecorded: False

## Ubuntu SSH

- selectedUbuntuHost: none
- ubuntuRepoPath: unknown
- ubuntuCommit: unknown
- nginxConfigOk: False
- canonicalPublicUpstreamPresent: False

## Listeners

- allRequiredPresent: False
- presentPorts: 
- missingPorts: 14021, 14022, 14023, 14024, 14025, 14026, 14027, 14040

## External Smoke

- healthz: status= ok=False
- revalidationAttempted: False
- smokeOk: False
- nextBlocker: ubuntu_ssh_unreachable

## Preserve-First

- profilesDeleted: False
- cookiesCleared: False
- localStorageCleared: False
- blindFullPoolRestartPerformed: False
- massReloginPerformed: False
