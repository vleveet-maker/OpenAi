---
phase: 37
slug: restore-ubuntu-reverse-ssh-tunnel-listeners-and-complete-external-authenticated-chat-smoke-after-token-models-proof
status: draft
created: 2026-04-15
---

# Phase 37 Research

## Question

What do we need to know to restore the missing Ubuntu reverse-tunnel listeners and complete one honest authenticated external chat smoke?

## Current Truth From Phase 36

Known good:

- SSH to `77.66.186.75:2222` works with retry.
- Bearer-token source was resolved from the Ubuntu remote env file without recording the token value.
- Ubuntu `nginx` is healthy and still proxies public traffic to `127.0.0.1:4010`.
- External `GET http://77.66.186.75/healthz` returns `200`.
- Authenticated `GET http://77.66.186.75/v1/models` returns `200`.

Known blocker:

- Ubuntu does not currently listen on `127.0.0.1:14021..14027` or `127.0.0.1:14040`.
- Authenticated chat was correctly skipped because the listener precondition was red.

Plain meaning: the public API front door and token are good, but Ubuntu cannot currently reach the Windows browser workers. Phase 37 should repair that bridge, not restart account debugging.

## Existing Assets To Reuse

- `infra/windows-block/start-reverse-tunnels.ps1`
- `infra/windows-block/start-reverse-tunnels.py`
- `infra/windows-block/register-browser-block-tasks.ps1`
- `infra/windows-block/stop-reverse-tunnels.ps1`
- `infra/windows-block/probe-public-api.ps1`
- `infra/windows-block/recover-server-token-ssh-listeners-and-external-chat.ps1`
- `services/control-api/src/routes/internal-post-phase35-server-token-ssh-listener-recovery.ts`
- `services/control-api/src/routes/internal-admin-page.ts`
- `.planning/phases/36-server-bearer-token-and-ubuntu-ssh-listener-recovery-before-isolated-external-chat-revalidation/36-TOKEN-SSH-LISTENER-RECOVERY-SUMMARY.json`
- `.planning/phases/36-server-bearer-token-and-ubuntu-ssh-listener-recovery-before-isolated-external-chat-revalidation/36-VERIFICATION.md`

## Findings

The tunnel runner already knows the intended remote forwards:

- `127.0.0.1:14021 -> 127.0.0.1:4021`
- `127.0.0.1:14022 -> 127.0.0.1:4022`
- `127.0.0.1:14023 -> 127.0.0.1:4023`
- `127.0.0.1:14024 -> 127.0.0.1:4024`
- `127.0.0.1:14025 -> 127.0.0.1:4025`
- `127.0.0.1:14026 -> 127.0.0.1:4026`
- `127.0.0.1:14027 -> 127.0.0.1:4027`
- `127.0.0.1:14040 -> 127.0.0.1:4040`

The current weak spots are operational:

- `start-reverse-tunnels.py` has no durable retry loop around intermittent SSH banner/session failures.
- Password-backed tunnel startup has historically been easier to run manually than to retain safely.
- SSH passwords and bearer tokens must not be written to tracked files, artifacts, or command lines.
- Windows scheduled task state is useful context, but Ubuntu `ss` output is the only acceptable proof that the public host can reach the forwarded ports.
- External chat should run only after Ubuntu listener truth is green.

## Planning Implications

Phase 37 should stay narrow:

- harden reverse-tunnel startup and retention
- verify listener truth on Ubuntu
- expose latest truth to operators
- run one authenticated public chat smoke through `http://77.66.186.75`

Phase 37 should not:

- delete browser profiles
- clear cookies or local storage
- mass restart or relogin accounts
- debug local proxy TLS
- loop on one account if the bridge itself is still down

## Proposed Phase 37 Shape

Use three plans:

- `37-01`: Harden reverse-tunnel startup and add a canonical listener-restoration/chat-smoke wrapper.
- `37-02`: Add durable latest-state route and `/internal/admin` visibility for Phase 37.
- `37-03`: Run live listener restoration and authenticated external smoke, then close with one honest verdict.

## Artifact Contract

The durable Phase 37 artifact should include:

- `generatedAt`
- `scriptCompatibilityVersion`
- `windowsRepoPath`
- `windowsCommit`
- `publicBaseUrl`
- `ubuntuSsh`
- `ubuntuNginx`
- `tokenResolution.status`
- `tokenResolution.source`
- `tokenResolution.secretValueRecorded = false`
- `reverseTunnelTask`
- `reverseTunnelProcess`
- `tunnelStart`
- `ubuntuListenerTruth`
- `externalSmoke.healthz`
- `externalSmoke.models`
- `externalSmoke.chatCompletions`
- `workerId`
- `preserveFirst`
- `verdict`
- `nextBlocker`

The artifact must never contain bearer-token values, SSH passwords, cookies, local storage, profile file contents, or browser session secrets.

## Recommendation

Plan Phase 37 as the direct server bridge repair. If the listeners come up and external chat returns `200` with the expected `probe-ok`, the API can be claimed externally ready for this proof path. If not, the phase should end `hold_rollout` with the exact next blocker, especially whether the problem is tunnel startup, Ubuntu listener retention, local worker ports, or chat bootstrap after the bridge is restored.
