# Phase 11 Research

## Current Baseline

The blocker that used to sit in front of rollout smoke is gone.

Current truthful starting point:

- Ubuntu now deliberately owns public `77.66.186.75`
- Ubuntu proxies the public API contract to the preserved Windows `Caddy` edge on `192.168.88.250`
- outside canary proof on `shared-6` already succeeds through the unified public path
- certificate trust is still residual debt, but public-owner ambiguity is no longer a blocker

This phase therefore does **not** need another ingress-reconciliation branch or another browser-runtime design detour.

## Existing Building Blocks We Should Reuse

### Internal readiness and operator truth

The control plane already exposes the data needed for the readiness side of rollout smoke:

- `GET /internal/host-pool` via `services/control-api/src/routes/internal-host-pool.ts`
- `GET /internal/workers` via `services/control-api/src/routes/internal-workers.ts`
- `GET /internal/observability/summary` via `services/control-api/src/routes/internal-observability.ts`
- the operator UI shell at `/internal/admin` via `services/control-api/src/routes/internal-admin-page.ts`

Those surfaces already describe:

- pool lifecycle truth
- worker readiness and runtime fields
- last bootstrap / relay signals
- recent failures and lifecycle events

### Live smoke tooling

The project already has reusable proof tools instead of starting from zero:

- `infra/host-worker/test-host-worker-relay.ps1`
  - single-worker proof
  - checks readiness, `Temporary Chat`, `GPT-5.4 Thinking`, and one relay round-trip
- `infra/host-worker/test-local-rollout-smoke.ps1`
  - wraps the single-worker proof into a repeatable worker matrix
  - writes JSON and Markdown artifacts
- `infra/windows-block/probe-public-api.ps1`
  - checks `healthz`, `v1/models`, and optional `v1/chat/completions`
  - already classifies errors such as `tls_handshake_failed`, `http_error`, `connection_refused`, and `timeout`
  - can start/stop one canary worker safely through `host-controller`

## What Phase 11 Still Lacks

Three real gaps remain:

1. There is no single repeatable operator command for the **current live deployed path** that combines:
   - worker/pool readiness snapshot
   - public `healthz`
   - public `v1/models`
   - one worker-backed public chat canary
2. The latest rollout smoke result is not exposed as a first-class internal operator surface.
3. The docs explain local-only smoke and narrow proof tools, but they do not yet define the final rerun contract for the real rollout path.

## Recommended Phase Boundary

Phase 11 should stay narrow and honest.

It should do all of this:

- define one repeatable rollout-smoke command for the current public-owner topology
- use `shared-6` as the default public canary worker
- capture internal readiness from existing internal endpoints
- capture public bootstrap/relay truth from the current public API contract
- persist one latest smoke result in machine-readable form
- surface that latest result in the internal operator UI or route
- document the rerun contract for future ChatGPT UI drift checks

It should **not** do any of this:

- redesign the runtime again
- revisit public-owner reassignment
- widen the public worker set by default
- treat consumer-trusted HTTPS as a blocker for this phase
- invent a second observability system when the current admin page already exists

## Recommended Technical Shape

### 1. Add one rollout-smoke wrapper on the deployed Windows/browser-block side

The cleanest composition is:

- read readiness from:
  - `/internal/host-pool`
  - `/internal/workers`
  - `/internal/observability/summary`
- run one public canary through `probe-public-api.ps1`
  - default `BaseUrl`: `http://77.66.186.75`
  - default `WorkerId`: `shared-6`
  - include chat probe
  - keep preserve-first behavior by starting/stopping only the canary worker when needed
- write:
  - `.planning/phases/11-rollout-smoke-confidence/11-SMOKE-SUMMARY.json`
  - `.planning/phases/11-rollout-smoke-confidence/11-SMOKE-SUMMARY.md`
  - `infra/data/rollout-smoke/latest.json`

Why this is the right level:

- it reuses the proven public probe instead of duplicating OpenAI-compatible API logic
- it reuses current internal status endpoints instead of guessing readiness from public health alone
- it mirrors the successful local-smoke pattern of "one wrapper + durable JSON/Markdown artifacts"

### 2. Make latest rollout smoke file-backed, not DB-backed

The wrapper will run from PowerShell while the operator surface lives in `control-api`.

For this phase, a file-backed handoff is simpler and safer than extending SQLite schemas or trying to make PowerShell write directly into the operator events DB.

Recommended contract:

- `infra/data/rollout-smoke/latest.json` becomes the machine-readable source of truth
- `control-api` reads that file through a small internal route
- `/internal/admin` renders a dedicated "Latest rollout smoke" section from that route

This keeps:

- the smoke runner decoupled from service internals
- the admin surface easy to test
- the latest result visible without raw log digging

## Suggested Plan Decomposition

### Wave 1

- add the rollout-smoke wrapper
- define artifact shape
- document the rerun command and boundary

### Wave 2

- add `control-api` support for reading latest rollout smoke state
- render the latest result on `/internal/admin`
- cover the new route/UI with `vitest`

### Wave 3

- run the live rollout smoke on the real public-owner path
- verify the internal operator surface shows the same latest result
- write `11-VERIFICATION.md`
- update `ROADMAP.md`, `STATE.md`, and `REQUIREMENTS.md`

## Recommended Defaults

- default public canary worker: `shared-6`
- default public base URL: `http://77.66.186.75`
- default internal admin base URL: `http://127.0.0.1:8081`
- default host-controller base URL: `http://127.0.0.1:4040`
- preserve-first rule: do not broaden beyond one canary unless the smoke result explicitly says the system is ready

## Risks and Constraints

- `http://77.66.186.75` is the truthful baseline contract today; certificate trust hardening should remain separate unless explicitly pulled in.
- The smoke flow must not treat raw `4040`, worker-agent ports, or raw `:4010` as the public contract.
- The latest rollout-smoke result should be summarized, not dumped as raw process output, otherwise `CONF-02` still fails in practice.
- The phase should keep the current public path honest even if the canary fails; a negative but explicit smoke result is still valuable.

## Planning Conclusion

Phase 11 is ready to plan now.

The right plan is not another investigation branch.

It is:

1. compose the existing readiness and public-canary probes into one repeatable wrapper
2. surface the latest result in the current operator UI
3. run one real smoke and record an explicit ready-or-hold verdict
