# Internal Worker Operations

This document is for the household operator only. Worker browsers are internal-only, and manual login is the default rule for both first-time setup and later reauthentication.

## Setup

- Start the worker stack from `infra/docker-compose.yml`.
- Confirm that `control-api`, `worker-dad`, `worker-wife`, and `worker-shared-1` are running on the private worker network.
- Confirm that each worker has a dedicated durable profile mount under `/srv/chatgpt-workers/profiles/<worker-name>`.
- Never store plaintext ChatGPT usernames, passwords, or reusable login secrets in this repository, in compose files, or in control-api configuration.

## First Login

- Use the internal worker recovery path to open the target worker browser for manual operator access.
- Sign in to ChatGPT manually inside the worker browser session.
- Wait for the worker to finish loading the authenticated ChatGPT surface.
- Mark the worker as ready only after the browser is visibly logged in and stable.
- Treat the durable browser profile as the persistence layer; do not copy credentials into sidecar files or environment variables.

## Reauthentication

- Reauthentication is manual by design.
- When a worker reaches `reauth_required`, start the worker reauth flow from the internal recovery endpoint.
- Open the worker browser and complete the ChatGPT login or challenge step yourself.
- After the browser is healthy again, complete the reauth flow so the worker returns to `ready`.
- If reauth fails repeatedly, leave the worker in `reauth_required` or `disconnected` rather than faking readiness.

## Restart Workflow

- Docker socket requirement: `control-api` must have `/var/run/docker.sock` mounted and `DOCKER_SOCKET_PATH=/var/run/docker.sock` configured before restart requests can reach the Docker Engine API.
- Use the exact internal restart endpoint `POST /internal/workers/:id/restart` with the internal admin token path you already use for other worker controls.
- Use the internal restart endpoint for a single worker when the browser becomes stale, crashes, or stops responding.
- Restart only the affected worker container; avoid bouncing the whole pool unless several workers are unhealthy at the same time.
- Expect status transitions `starting -> ready or disconnected` as the worker-health monitor polls the restarted container.
- After restart, verify that the same durable profile mount is still attached at `/srv/chatgpt-workers/profiles/<worker-name>`.
- If the worker returns authenticated, mark it `ready`.
- If the worker returns requiring reauth, move into the manual reauthentication flow and complete login yourself before marking the worker ready again.

## Failure Triage

- `starting` for too long: inspect container logs and confirm the browser process is actually launching.
- `disconnected`: treat as runtime control failure first; restart the worker and verify the agent can reach the browser again.
- `reauth_required`: do not debug automation first; assume manual login is needed and open the recovery path.
- Repeated profile corruption: preserve the existing profile directory for investigation before replacing it.
- If raw Playwright worker containers become too expensive to operate directly, revisit BlitzBrowser as the fallback runtime candidate. It is still optional and not the default Phase 1 baseline.
