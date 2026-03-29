# Internal Worker Operations

This document is for the household operator only. Worker browsers stay internal-only, browser access is time-bounded, and manual ChatGPT login is the rule for both first setup and later reauthentication.

## Fresh Chat Policy

- Every newly activated user session now prepares a fresh chat boundary before the first send is allowed.
- The worker should prefer `Temporary Chat` so the conversation stays out of history and does not create or use memories.
- The worker should also prefer the latest configured reasoning model. The current default order is `GPT-5.4 Thinking`, then `GPT-5.4`.
- Public sending stays blocked while chat bootstrap is `pending`, and the shared-screen UI will surface `Preparing Fresh Chat` or `Chat Setup Failed` instead of silently failing.
- Current ChatGPT UI drift is maintained in the centralized selector-map files under `workers/agent/src/chat-relay/selector-map.ts` and `workers/agent/src/chat-bootstrap/bootstrap-selector-map.ts`, not by ad hoc runner patches.

## Setup

- Start the stack from `infra/docker-compose.yml`.
- Confirm that `edge`, `control-api`, `session-client`, `worker-dad`, `worker-wife`, and `worker-shared-1` are running.
- Public app entrypoint is `http://<host>:8080/`.
- Internal operator entrypoint is `http://127.0.0.1:8081/internal/admin`.
- Internal health endpoints are `http://127.0.0.1:8081/healthz` and `http://127.0.0.1:8081/readyz`.
- Confirm that each worker still uses its durable profile mount under `/srv/chatgpt-workers/profiles/<worker-name>`.
- Never store plaintext ChatGPT usernames, passwords, or reusable login secrets in this repository, compose files, or control-api configuration.

## Host Pool Control

- Open `http://127.0.0.1:8081/internal/admin`.
- Use `Start pool` to bring up the proxied host-native worker pool in alternate desktop non-visible runtime.
- Use `Stop pool` to shut the proxied host-native worker pool down again.
- Pool lifecycle statuses mean:
  - `idle`: proxy and host workers are down.
  - `starting`: start was requested and the proxy or workers are still coming online.
  - `ready`: proxy is listening and all configured host workers are reachable.
  - `degraded`: partial success. Some of the pool came up, but not all of it.
  - `stopping`: stop was requested and shutdown is still in progress.
  - `failed`: the last lifecycle action failed and the last error should be reviewed.
- `degraded` is intentional visibility, not an automatic repair mode. This phase does not auto-rollback and does not auto-retry.
- The PowerShell scripts remain fallback tools if `/internal/admin` is unavailable, but they are no longer the primary operator path.
- Minimized windows are no longer an accepted steady-state behavior. Routine use should stay in alternate desktop runtime without any visible desktop browser.

## Phase 10.2 Runtime Decision

- Phase 10.2 runtime decision: `block_phase_11_pending_new_runtime_design`.
- Current host hidden runtime is not accepted for rollout confidence. Live probes showed the same durable profiles reaching Cloudflare challenge or non-usable startup paths after manual login.
- The explicit Docker/Xvfb candidate runtime also reached `bootstrap_challenge_detected` on a live bootstrap probe, so it is not the chosen steady-state runtime either.
- Do not treat either current hidden runtime path as the routine household baseline for Phase 11.
- Phase 11 is blocked and a follow-up runtime design phase must be inserted before rollout smoke confidence continues.

## Browser Access

- Open `http://127.0.0.1:8081/internal/admin`.
- In the worker card, use `Open browser` for first login or `Start reauth` when the worker is already in `reauth_required`.
- The admin page creates a browser access session and opens a viewer path under `/internal/browser/<workerId>/vnc.html?...`.
- Browser access sessions expire after `15 minutes`. If the viewer stops authorizing, start a new browser access session from `/internal/admin`.
- `http://<host>:8080/internal/browser/...` must stay unavailable from the public edge.
- `http://127.0.0.1:8081/internal/browser/...` is internal-only and is the only supported path for the live worker viewer.
- If ChatGPT changed its UI and `Temporary Chat` or the preferred model can no longer be selected automatically, the session should remain blocked until the selector map is updated.
- Current bootstrap drift may show either a direct `Temporary` control or a model menu entry before the preferred model is selected.
- Alternate desktop runtime metadata now lives under `infra/data/host-worker-state/<workerId>.json` and should match what `/internal/workers` reports for `runtimeDesktopName`.

## First Login

- For Docker workers, use `Open browser`.
- For host-native workers, use `Start visible login`.
- Complete ChatGPT login manually inside the visible browser or protected viewer, depending on worker runtime.
- Wait for the authenticated ChatGPT page to stabilize.
- Confirm that a clean `Temporary Chat` can be opened and that the preferred reasoning model is still available.
- Return to `/internal/admin` and press `Complete login -> non-visible runtime` for host-native workers, or `Complete login/reauth` for Docker-backed viewer flows.
- For host-native workers, then press `Validate non-visible runtime` and wait for the result before trusting that worker for rollout confidence.
- Confirm the worker returns to `ready`.
- Treat the durable browser profile as the persistence layer; do not copy credentials into sidecar files or environment variables.

## Reauthentication

- Reauthentication is manual by design.
- When a host-native worker reaches `reauth_required`, press `Start visible reauth` on `/internal/admin`.
- When a Docker-backed worker reaches `reauth_required`, press `Start reauth` on `/internal/admin`.
- Complete the login, CAPTCHA, or challenge step manually in the visible browser or browser access viewer.
- Return to `/internal/admin` and press `Complete login -> non-visible runtime` for host-native workers, or `Complete login/reauth` for Docker-backed viewer flows.
- For host-native workers, then press `Validate non-visible runtime`.
- Confirm the worker returns to `ready`.
- If reauth fails repeatedly, leave the worker in `reauth_required` or `disconnected` instead of pretending it is safe to route sessions there.
- If a worker logs in successfully but fresh chat bootstrap still fails, treat that as a selector/runtime issue rather than a healthy ready state.
- If alternate desktop runtime loses auth after manual login, treat that as `architecture review required`, not as a signal to keep toggling modes invisibly.

## Restart Workflow

- Docker socket requirement: `control-api` must have `/var/run/docker.sock` mounted and `DOCKER_SOCKET_PATH=/var/run/docker.sock` configured before restart requests can reach the Docker Engine API.
- Use the exact internal restart endpoint `POST /internal/workers/:id/restart`.
- Restart only the affected worker container unless several workers are unhealthy at once.
- Expect status transitions `starting -> ready` or `starting -> disconnected` as the worker-health monitor polls the restarted container.
- After restart, verify that the same durable profile mount is still attached at `/srv/chatgpt-workers/profiles/<worker-name>`.
- If the worker comes back unauthenticated, use the browser access flow above instead of trying to inject credentials.

## Troubleshooting

- `idle` when you expected browsers: use `Start pool` first, then confirm the proxy and host workers begin transitioning.
- `degraded`: treat this as partial success, check recent lifecycle events on `/internal/admin`, and fix the missing worker or proxy issue manually.
- `failed`: read the last error on `/internal/admin` before trying another lifecycle action.
- `starting` for too long: inspect container logs and confirm the browser, `Xvfb`, `x11vnc`, and `websockify` processes are actually running.
- Browser access expired: start a new browser access session; old viewer URLs stop authorizing after `15 minutes`.
- `disconnected`: treat as runtime control failure first; restart the worker and verify the agent can reach the browser again.
- `reauth_required`: do not debug automation first; assume manual login is needed and open the browser access path.
- Use `/internal/admin` to inspect recent worker lifecycle events and session failures before restarting several workers at once.
- Repeated profile corruption: preserve the existing profile directory for investigation before replacing it.
- Phase 8 selector defaults live behind `WORKER_PREFERRED_REASONING_MODEL_LABELS`; if you need to pin a different latest reasoning model, update that env var instead of hardcoding a different label in the UI.
- `test-host-worker-relay.ps1` is a Phase 10 drift hardening probe for maintainers. Use it to isolate a specific host-native worker and verify current-ui relay behavior; do not treat it as the final operator smoke flow.
- `test-alternate-desktop-runtime.ps1` is the canonical alternate-desktop validation path. Use it after `Complete login -> non-visible runtime`.
- The bounded rescue order is now:
  - `wife`
  - `dad`
  - `shared-1`
- Phase 11 is no longer globally blocked. `wife` is the first passing worker and is now the canonical rollout-confidence target.
- Current target split for the bounded proof is:
  - `wife`: passing rollout-confidence target
  - `dad`: auth-recovery target
  - `shared-1`: proof-noise cleanup target
- The current Phase 10.5 live result is mixed but usable:
  - `wife` reached usable `alternate_desktop` proof and returned `smoke-ok`
  - `dad` still returns `proofFailureClass=auth_required`, `bootstrapFailureCode=bootstrap_auth_required`, `bootstrapStep=auth_check`
  - `shared-1` still returns `proofFailureClass=assignment_timeout`

## Smoke Checklist

- `http://127.0.0.1:8081/healthz` returns process liveness.
- `http://127.0.0.1:8081/readyz` shows worker counts and current readiness.
- `http://<host>:8080/internal/browser/...` is unavailable.
- `/internal/admin` can open a worker browser access viewer.
- Manual ChatGPT login completes inside the viewer.
- `Complete login -> non-visible runtime` returns a host-native worker to alternate desktop runtime.
- `test-alternate-desktop-runtime.ps1` passes with `phase11Ready=true` before the worker is treated as live-complete.
