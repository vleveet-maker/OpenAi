# Phase 9: Internal host-pool orchestration - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase moves the existing proxied host-native household pool lifecycle into the internal admin surface. It covers operator-triggered start and stop, visible lifecycle status, and actionable failure reporting around the already proven host-native path.

This phase does not change the public chat experience, the core browser-relay architecture, the manual login model, or the session-routing contract. It is an operator-control phase, not a user-facing chat-product phase.

</domain>

<decisions>
## Implementation Decisions

### Pool Lifecycle Surface

- **D-01:** Phase 9 should add pool-level controls in internal admin: `Start pool` and `Stop pool` for the whole household host-native pool.
- **D-02:** Per-worker host start or stop controls are not required for the first pass of this phase. If more granular controls are needed later, that becomes a follow-up phase or insertion.

### Operator Feedback

- **D-03:** Reuse the existing internal admin page instead of introducing a separate operator app or frontend package.
- **D-04:** Pool actions should surface explicit lifecycle meaning on the admin page using the existing polling model. At minimum the operator must be able to distinguish `starting`, `stopping`, `ready`, `degraded`, and `failed`.
- **D-05:** Failure output should be actionable and tied to the layer that failed when possible: host-controller, proxy runtime, worker agent, or browser.

### Failure Handling

- **D-06:** If pool start succeeds only partially, the system should surface a `degraded` state and keep the workers that did come up instead of automatically rolling everything back.
- **D-07:** This phase should not add automatic rollback or automatic retry loops for partial start or stop failures. The operator stays in control and can rerun actions explicitly.

### Product Direction To Preserve

- **D-08:** The broader product direction is still a standard chat-bot style mobile app with chat list, create-new-chat, text input, and image attachment.
- **D-09:** A new chat should route into a fresh temporary or incognito ChatGPT conversation on an available browser, while continuing a chat should stay on the same underlying browser conversation.
- **D-10:** Those mobile chat and image-attachment capabilities are not part of Phase 9 and should be preserved as future-scope guidance rather than folded into this operator-control phase.

### the agent's Discretion

- Whether pool lifecycle state is represented as a dedicated control-api service, an extension of the existing internal worker actions routes, or a thin orchestration wrapper around the existing host-controller client.
- Exact lifecycle labels, progress copy, and event naming, as long as the operator meaning stays explicit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and milestone context
- `.planning/PROJECT.md` - current product shape, rollout-stability milestone goal, and user-facing future direction
- `.planning/REQUIREMENTS.md` - `ORCH-01` through `ORCH-03` for this phase
- `.planning/ROADMAP.md` - Phase 9 goal and success criteria
- `.planning/STATE.md` - carry-forward rollout debt and current milestone status

### Existing internal admin and control-api surface
- `services/control-api/src/server.ts` - internal route registration, runtime wiring, and guarded admin surface
- `services/control-api/src/config.ts` - host-controller config inputs and current rollout toggles
- `services/control-api/src/routes/internal-admin-page.ts` - existing server-rendered admin UI, polling model, and worker action button pattern
- `services/control-api/src/routes/internal-worker-actions.ts` - current internal worker action route style and event recording pattern
- `services/control-api/src/workers/host-controller-client.ts` - current host-controller HTTP client contract and missing lifecycle operations to account for

### Existing host-native orchestration backend
- `services/host-controller/src/server.mjs` - current host-controller HTTP API surface
- `services/host-controller/src/host-controller.mjs` - current pool start, worker start, worker stop, and proxy/bootstrap orchestration behavior

### Operator runbooks
- `docs/host-native-worker.md` - current verified host-native operator workflow
- `docs/internal-worker-ops.md` - internal-only operator rules and browser-access expectations

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `services/control-api/src/routes/internal-admin-page.ts`: existing worker cards, polling loop, and internal action button wiring
- `services/control-api/src/routes/internal-worker-actions.ts`: token-guarded POST action pattern with event recording and 202-style operator responses
- `services/control-api/src/workers/host-controller-client.ts`: existing `startPool`, `startWorker`, and `stopWorker` client methods
- `services/host-controller/src/host-controller.mjs`: existing proxy bootstrap, worker start, and worker stop orchestration

### Established Patterns

- Internal operator routes are protected by the internal admin token and stay behind the internal edge only.
- The admin surface is a server-rendered HTML page with simple polling every 5 seconds rather than a separate SPA or websocket control plane.
- Operator actions return quickly and rely on subsequent polling plus observability events rather than long-held request streams.
- Host-native worker orchestration is already modeled as a controller-backed path distinct from Docker restart logic.

### Integration Points

- `createControlApiRuntime` and `loadConfig` already know about host-controller connection settings.
- The internal admin page can add pool controls without changing the public session client.
- The host-controller currently exposes `/pool/start` but not a symmetric `/pool/stop`, so planning should account for either adding that endpoint or orchestrating stop explicitly through existing worker stop operations.

</code_context>

<specifics>
## Specific Ideas

- The user wants the overall product to look like a standard mobile chat-bot app rather than an operator-heavy tool.
- They explicitly want chat list, create-new-chat, text input, and image attachment in the future product shape.
- They want new chats to land in a fresh temporary or incognito browser conversation, and continuing chats to stay on the same underlying browser conversation.
- For this phase specifically, they did not want more abstract operator-design questions and preferred that the builder pick straightforward defaults.

</specifics>

<deferred>
## Deferred Ideas

- User-facing mobile chat list and create-new-chat UX
- Image attachment flow from the app into the browser worker
- Richer multi-chat management on the user side
- Per-worker host start and stop controls in admin if pool-level controls prove insufficient
- Automatic rollback or retry loops for partial pool lifecycle failures

</deferred>

---
*Phase: 09-internal-host-pool-orchestration*
*Context gathered: 2026-03-28*
