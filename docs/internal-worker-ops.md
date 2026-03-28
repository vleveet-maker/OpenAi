# Internal Worker Operations

This document is for the household operator only. Worker browsers stay internal-only, browser access is time-bounded, and manual ChatGPT login is the rule for both first setup and later reauthentication.

## Fresh Chat Policy

- Every newly activated user session now prepares a fresh chat boundary before the first send is allowed.
- The worker should prefer `Temporary Chat` so the conversation stays out of history and does not create or use memories.
- The worker should also prefer the latest configured reasoning model. The current default is `GPT-5.4 Thinking`.
- Public sending stays blocked while chat bootstrap is `pending`, and the shared-screen UI will surface `Preparing Fresh Chat` or `Chat Setup Failed` instead of silently failing.

## Setup

- Start the stack from `infra/docker-compose.yml`.
- Confirm that `edge`, `control-api`, `session-client`, `worker-dad`, `worker-wife`, and `worker-shared-1` are running.
- Public app entrypoint is `http://<host>:8080/`.
- Internal operator entrypoint is `http://127.0.0.1:8081/internal/admin`.
- Internal health endpoints are `http://127.0.0.1:8081/healthz` and `http://127.0.0.1:8081/readyz`.
- Confirm that each worker still uses its durable profile mount under `/srv/chatgpt-workers/profiles/<worker-name>`.
- Never store plaintext ChatGPT usernames, passwords, or reusable login secrets in this repository, compose files, or control-api configuration.

## Browser Access

- Open `http://127.0.0.1:8081/internal/admin`.
- In the worker card, use `Open browser` for first login or `Start reauth` when the worker is already in `reauth_required`.
- The admin page creates a browser access session and opens a viewer path under `/internal/browser/<workerId>/vnc.html?...`.
- Browser access sessions expire after `15 minutes`. If the viewer stops authorizing, start a new browser access session from `/internal/admin`.
- `http://<host>:8080/internal/browser/...` must stay unavailable from the public edge.
- `http://127.0.0.1:8081/internal/browser/...` is internal-only and is the only supported path for the live worker viewer.
- If ChatGPT changed its UI and `Temporary Chat` or the preferred model can no longer be selected automatically, the session should remain blocked until the selector map is updated.

## First Login

- From `/internal/admin`, press `Open browser` on the worker you want to initialize.
- Complete ChatGPT login manually inside the browser access viewer.
- Wait for the authenticated ChatGPT page to stabilize.
- Confirm that a clean `Temporary Chat` can be opened and that the preferred reasoning model is still available.
- Return to `/internal/admin` and press `Complete login/reauth`.
- Confirm the worker returns to `ready`.
- Treat the durable browser profile as the persistence layer; do not copy credentials into sidecar files or environment variables.

## Reauthentication

- Reauthentication is manual by design.
- When a worker reaches `reauth_required`, press `Start reauth` on `/internal/admin`.
- Complete the login, CAPTCHA, or challenge step manually inside the browser access viewer.
- Return to `/internal/admin` and press `Complete login/reauth`.
- Confirm the worker returns to `ready`.
- If reauth fails repeatedly, leave the worker in `reauth_required` or `disconnected` instead of pretending it is safe to route sessions there.
- If a worker logs in successfully but fresh chat bootstrap still fails, treat that as a selector/runtime issue rather than a healthy ready state.

## Restart Workflow

- Docker socket requirement: `control-api` must have `/var/run/docker.sock` mounted and `DOCKER_SOCKET_PATH=/var/run/docker.sock` configured before restart requests can reach the Docker Engine API.
- Use the exact internal restart endpoint `POST /internal/workers/:id/restart`.
- Restart only the affected worker container unless several workers are unhealthy at once.
- Expect status transitions `starting -> ready` or `starting -> disconnected` as the worker-health monitor polls the restarted container.
- After restart, verify that the same durable profile mount is still attached at `/srv/chatgpt-workers/profiles/<worker-name>`.
- If the worker comes back unauthenticated, use the browser access flow above instead of trying to inject credentials.

## Troubleshooting

- `starting` for too long: inspect container logs and confirm the browser, `Xvfb`, `x11vnc`, and `websockify` processes are actually running.
- Browser access expired: start a new browser access session; old viewer URLs stop authorizing after `15 minutes`.
- `disconnected`: treat as runtime control failure first; restart the worker and verify the agent can reach the browser again.
- `reauth_required`: do not debug automation first; assume manual login is needed and open the browser access path.
- Use `/internal/admin` to inspect recent worker lifecycle events and session failures before restarting several workers at once.
- Repeated profile corruption: preserve the existing profile directory for investigation before replacing it.
- Phase 8 selector defaults live behind `WORKER_PREFERRED_REASONING_MODEL_LABELS`; if you need to pin a different latest reasoning model, update that env var instead of hardcoding a different label in the UI.

## Smoke Checklist

- `http://127.0.0.1:8081/healthz` returns process liveness.
- `http://127.0.0.1:8081/readyz` shows worker counts and current readiness.
- `http://<host>:8080/internal/browser/...` is unavailable.
- `/internal/admin` can open a worker browser access viewer.
- Manual ChatGPT login completes inside the viewer.
- `Complete login/reauth` returns the worker to `ready`.
