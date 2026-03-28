# Phase 9: Internal host-pool orchestration - Research

**Completed:** 2026-03-28
**Question answered:** What do we need to know to plan safe, explicit internal-admin control over the proxied host-native worker pool without changing the public chat product shape?

## Findings

### Current Codebase Reality

- `control-api` already has a guarded internal admin page, internal worker action routes, and a 5-second polling model.
- `host-controller` already knows how to start the full pool, start one worker, stop one worker, and report worker reachability through `GET /health` and `GET /workers`.
- The verified household operator path is still the PowerShell script pair `start-proxied-host-pool.ps1` and `stop-proxied-host-pool.ps1`.
- The missing contract is not browser automation. It is a clear app-level lifecycle for the host-native pool: start, stop, current state, and actionable failure meaning.

### Gap Between Verified Scripts and Internal Admin

- `services/control-api/src/routes/internal-admin-page.ts` exposes worker-level actions like `Open browser`, `Start reauth`, and `Mark ready`, but nothing for the host-native pool as a whole.
- `services/control-api/src/workers/host-controller-client.ts` can call `startPool()` but cannot call `stopPool()` or inspect host-controller health.
- `services/host-controller/src/server.mjs` exposes `POST /pool/start`, but there is no symmetric `POST /pool/stop`.
- `services/host-controller/src/host-controller.mjs` can stop individual workers, but only the PowerShell script currently tears down the mixed proxy after the workers stop.

### Actionable Failure Reporting Needs Layer Boundaries

- The user wants fewer confusing operator questions and a simpler mental model.
- For this phase, failure reporting should therefore be layer-oriented:
  - host-controller unreachable
  - proxy runtime not listening
  - worker agent not listening
  - browser not listening
- The current internal worker registry can report worker readiness inside `control-api`, but it cannot explain proxy/controller layer failures on its own.
- A richer host-controller health snapshot plus a thin control-api lifecycle service is the smallest change that makes failures understandable.

### Recommended Direction

- Add a symmetric `POST /pool/stop` contract to `host-controller`.
- Extend `host-controller` health data so `control-api` can see:
  - whether the mixed proxy is listening
  - which workers have agent and browser ports listening
  - an observed pool status derived from those checks
- Add a thin in-memory `HostPoolLifecycleService` inside `control-api` instead of persisting pool lifecycle state to SQLite.
- Use explicit lifecycle statuses in `control-api`: `idle`, `starting`, `ready`, `degraded`, `stopping`, and `failed`.
- Keep the existing internal admin page and polling model.
- Treat partial success as `degraded`, keep successful workers up, and do not add automatic rollback or automatic retry in this phase.

### Why In-Memory Lifecycle State Is Enough Here

- Phase 9 is about operator ergonomics during live rollout, not a durable audit trail.
- The durable observability database already captures worker failures and restarts where relevant.
- Pool lifecycle is a short-lived control-plane status that is best derived from current host-controller health plus the most recent requested action.
- Persisting pool state now would add storage and recovery complexity without directly helping the operator.

### Recommended Plan Shape

- Wave 1: make `host-controller` expose the missing lifecycle primitives and a testable stop path.
- Wave 2: add `control-api` host-pool lifecycle service plus internal routes.
- Wave 3: add admin-page controls, lifecycle panel, docs, and tests.

## Validation Architecture

- `services/host-controller` should add `node:test` coverage for:
  - observed pool status derivation
  - `stopPool()` behavior
  - HTTP route coverage for `POST /pool/stop` and richer `GET /health`
- `services/control-api` should add `vitest` plus `supertest` coverage for:
  - `GET /internal/host-pool`
  - `POST /internal/host-pool/start`
  - `POST /internal/host-pool/stop`
  - concurrent-action rejection and degraded/failure snapshots
- `services/control-api/test/internal-admin-page.test.ts` should verify:
  - `Start pool` and `Stop pool` controls render
  - the page polls `/internal/host-pool`
  - lifecycle copy is present
- One live manual smoke still matters:
  - start the pool from `/internal/admin`
  - observe `starting -> ready` or `starting -> degraded`
  - stop the pool from `/internal/admin`
  - confirm browsers disappear and worker states return to the expected disconnected or idle view

## Sources

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/09-internal-host-pool-orchestration/09-CONTEXT.md`
- `services/control-api/src/routes/internal-admin-page.ts`
- `services/control-api/src/routes/internal-worker-actions.ts`
- `services/control-api/src/workers/host-controller-client.ts`
- `services/control-api/src/server.ts`
- `services/host-controller/src/server.mjs`
- `services/host-controller/src/host-controller.mjs`
- `services/host-controller/src/config.mjs`
- `infra/host-worker/start-proxied-host-pool.ps1`
- `infra/host-worker/stop-proxied-host-pool.ps1`

---
*Phase: 09-internal-host-pool-orchestration*
*Research completed: 2026-03-28*
