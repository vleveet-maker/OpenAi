# Phase 36 Token SSH Listener Recovery Summary

- Generated: 2026-04-15T00:07:08.1595472+03:00
- Script compatibility version: phase36-server-token-ssh-listener-recovery-v1
- Verdict: hold_rollout
- Recovery stage verdict: hold_rollout
- Summary: Hold rollout: token and public models are green, but Ubuntu listeners 14021..14027 and 14040 are missing, so authenticated chat was not run.
- Public base URL: http://77.66.186.75
- WorkerId: wife

## Token

- status: resolved
- source: ssh:77.66.186.75:remote_env_file:REMOTE_RELAY_API_TOKEN
- secretValueRecorded: False

## Ubuntu SSH

- selectedUbuntuHost: 77.66.186.75
- ubuntuRepoPath: /opt/owmcgp-remote-relay/services/control-api
- ubuntuCommit: unknown
- nginxConfigOk: True
- canonicalPublicUpstreamPresent: True

## Listeners

- allRequiredPresent: False
- presentPorts: 
- missingPorts: 14021, 14022, 14023, 14024, 14025, 14026, 14027, 14040

## External Smoke

- healthz: status=200 ok=True
- revalidationAttempted: False
- smokeOk: False
- nextBlocker: ubuntu_listeners_missing

## Preserve-First

- profilesDeleted: False
- cookiesCleared: False
- localStorageCleared: False
- blindFullPoolRestartPerformed: False
- massReloginPerformed: False
