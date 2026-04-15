# Phase 37 Reverse Tunnel Chat Smoke Summary

- Generated: 2026-04-15T06:19:25.4939735+03:00
- Script compatibility version: phase37-reverse-tunnel-chat-smoke-v1
- Verdict: hold_rollout
- Summary: Hold rollout: nextBlocker=bootstrap_auth_required; selectedHost=77.66.186.75; listenersReady=True.
- Public base URL: http://77.66.186.75
- WorkerId: dad

## Token

- status: resolved
- source: ssh:77.66.186.75:remote_env_file:REMOTE_RELAY_API_TOKEN
- secretValueRecorded: False

## Ubuntu

- selectedUbuntuHost: 77.66.186.75
- ubuntuRepoPath: /opt/owmcgp-remote-relay/services/control-api
- ubuntuCommit: unknown
- nginxConfigOk: True
- canonicalPublicUpstreamPresent: True

## Reverse Tunnels

- owner: none
- taskStartAttempted: False
- directStartAttempted: False
- allRequiredPresent: True
- presentPorts: 14021, 14022, 14023, 14024, 14025, 14026, 14027, 14040
- missingPorts: none

## External Smoke

- healthz: status=200 ok=True
- revalidationAttempted: True
- smokeOk: False
- chatFailureStatusCode: 409
- chatFailureCode: chat_bootstrap_failed
- chatFailureInnerReason: bootstrap_auth_required
- nextBlocker: bootstrap_auth_required

## Preserve-First

- profilesDeleted: False
- cookiesCleared: False
- localStorageCleared: False
- blindFullPoolRestartPerformed: False
- massReloginPerformed: False
