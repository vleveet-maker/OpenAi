# Phase 25 Research

## Current Live Truth (2026-04-12)

Phase 25 starts from a materially different live truth than the stale Phase 24 branch assumptions.

- public `http://77.66.186.75/healthz` is externally reachable and returns `200 OK`
- public `http://77.66.186.75/v1/models` returns `401 Unauthorized` without a bearer token, which proves the public HTTP path reaches the auth layer instead of failing earlier
- authenticated `/v1/models` returned `200 OK` with live models `owmcgp-browser`, `gpt-5.4-thinking`, and `chatgpt-browser-gpt-5.4-thinking`
- `gpt-4.1` returned the expected `400 invalid_model`, so the model catalog truth is now explicit too
- the initial external chat failure was not an nginx or NAT failure; it was `409 chat_bootstrap_failed / worker_chat_bootstrap_unreachable`
- the real root cause was a dead reverse SSH tunnel path from the Windows browser workers back to Ubuntu
- after tunnel recovery, Ubuntu again listened on `127.0.0.1:14021..14027` and `127.0.0.1:14040`
- after tunnel recovery, `readyz` returned `7/7 ready`
- the final external chat smoke returned `200 OK`, reply `ping-ok`, on worker `shared-2`
- Ubuntu `nginx -T` now shows public `80/443/8080` proxying to `127.0.0.1:4010`
- Ubuntu no longer contains `proxy_pass http://192.168.88.250`
- Windows host `192.168.88.250` currently listens only on loopback `127.0.0.1:4040` and `127.0.0.1:8081`
- there is no live `Caddy` service or `caddy` process on the Windows host
- reverse tunnel recovery was made durable on the deployed host through the scheduled task `OWMCGP Browser Block - Reverse Tunnels`
- live host fixes included a foreground mode in `start-reverse-tunnels.ps1` and better task registration policy in `register-browser-block-tasks.ps1`

## What Changed From Phase 24 Truth

Phase 24 still assumed the active blocker was the same disconnected runtime plus `windows_edge_forced_host` and public-owner `503` branch.

That is no longer the most useful current truth.

What changed:

- public ingress is already alive through Ubuntu
- Windows `Caddy` is no longer the active public edge
- the real active public path is `internet -> MikroTik -> Ubuntu nginx -> 127.0.0.1:4010`
- the real production-critical dependency for external chat is now reverse SSH tunnel health
- the repo and docs are now the stale part, not the live upstream chain

So Phase 25 should not reopen the retired Windows-edge branch as if it were still the main gate.

## Live Fixes Not Yet Backported

The following live truths still need to come back into the repo and archives:

- `infra/windows-block/start-reverse-tunnels.ps1` needs foreground execution support so the tunnel runner can stay under task supervision and fail loudly
- `infra/windows-block/register-browser-block-tasks.ps1` needs the live task policy shape:
  - `-Foreground`
  - `StartWhenAvailable`
  - restart policy
- `infra/windows-block/build-windows-browser-block-package.ps1` still packages older tunnel assumptions
- `infra/remote/nginx/owmcgp-remote-relay.conf` and docs still describe the older `Ubuntu -> 192.168.88.250` public path
- the repo still lacks one canonical Phase 25 wrapper that records reverse-tunnel and external-readiness truth as a durable artifact

## Recommended Phase Boundary

Phase 25 should stay narrow and operationally honest.

It should:

- backport the exact live reverse-tunnel and scheduled-task fixes
- sync the repo/docs/deployment assets to the real canonical public path `Ubuntu nginx -> 127.0.0.1:4010`
- add one preserve-first external-readiness wrapper and artifact
- expose the latest result in `control-api` and `/internal/admin`
- validate the live state on both Ubuntu and Windows hosts
- rerun authenticated external smoke
- end with exactly one final verdict:
  - `externally_ready`
  - or `hold_rollout`

It should not:

- reopen the retired Windows `Caddy` branch unless fresh evidence forces it
- treat dead reverse tunnels as a secondary detail
- claim repeatable external readiness if the next archive still needs server-only tunnel or smoke edits

## Recommended Technical Shape

### 1. Backport live reverse-tunnel truth

Phase 25 should backport:

- `infra/windows-block/start-reverse-tunnels.ps1`
- `infra/windows-block/register-browser-block-tasks.ps1`
- `infra/windows-block/build-windows-browser-block-package.ps1`
- `infra/remote/nginx/owmcgp-remote-relay.conf`
- the matching operator docs

The chain should be stamped under one explicit compatibility marker:

- `phase25-live-fix-backport-v1`

### 2. Add one canonical external-readiness wrapper

Create:

- `infra/windows-block/recover-reverse-tunnels-and-external-api-readiness.ps1`

It should record:

- canonical public upstream truth
- Windows `Caddy` presence or absence
- reverse-tunnel scheduled-task truth
- Ubuntu tunnel-listener truth
- ready-worker truth
- one pre-smoke verdict:
  - `ready_for_external_smoke`
  - or `hold_rollout`

It should emit:

- `.planning/phases/25-deployed-windows-post-phase24-live-fix-smoke-wrapper-backport-and-persistent-disconnected-runtime-forced-host-public-owner-503-remediation/25-EXTERNAL-READINESS-SUMMARY.json`
- `.planning/phases/25-deployed-windows-post-phase24-live-fix-smoke-wrapper-backport-and-persistent-disconnected-runtime-forced-host-public-owner-503-remediation/25-EXTERNAL-READINESS-SUMMARY.md`
- `infra/data/post-phase24-external-api-readiness/latest.json`

### 3. End with authenticated external smoke

The final proof must use a bearer token and live model truth against:

- `/healthz`
- `/v1/models`
- `/v1/chat/completions`

That final smoke should validate the current live public contract, not the stale Windows-edge one.

## Risks And Constraints

- preserve-first remains mandatory on the Windows browser-block host
- reverse tunnels are now critical infrastructure, so task policy drift matters as much as API drift
- repo/live drift is now more dangerous than another round of speculative root-cause hunting
- do not claim durable readiness unless the next archive-backed run stays green without ad-hoc server-only tunnel or smoke fixes
