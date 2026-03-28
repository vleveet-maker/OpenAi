# Phase 10: ChatGPT UI drift hardening - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase hardens the existing browser relay and fresh-chat bootstrap against the current ChatGPT web UI. It covers selector centralization, clearer drift-specific failure codes, targeted live verification against the household host-native workers, and the worker-specific fixes needed to make `dad`, `wife`, and `shared-1` behave predictably again.

This phase does not add new public product surface area, change the session-routing contract, change the manual-login policy, or introduce anti-bot bypass tooling. It is a stability and maintenance phase for the existing worker/browser path.

</domain>

<decisions>
## Implementation Decisions

### Drift Scope

- **D-01:** Phase 10 should be judged primarily against the real household host-native workers, because that is the proven live path after Docker/browser fingerprint issues.
- **D-02:** The residual `dad` relay failure with `selector_not_found` is treated as a first-class phase input, not a minor follow-up.
- **D-03:** Phase 10 should harden both relay and fresh-chat bootstrap against the current ChatGPT UI; fixing only relay is not enough.

### Selector Strategy

- **D-04:** Drift-sensitive selectors should live in centralized, named selector maps or contracts instead of ad hoc locator logic spread across runners and tests.
- **D-05:** Failure output should distinguish auth or challenge problems from relay-composer drift, send-control drift, assistant-capture drift, temporary-chat entry drift, and model-picker drift.
- **D-06:** The preferred reasoning model should remain a configurable label policy through `WORKER_PREFERRED_REASONING_MODEL_LABELS`; this phase may broaden safe aliases but should not freeze the project around one forever-assumed label.

### Live Verification

- **D-07:** Execution should include targeted live verification against logged-in workers, especially `dad`, but the polished repeatable operator smoke path still belongs to Phase 11.
- **D-08:** A maintainer-focused live verification utility is acceptable in this phase if it helps harden selectors, as long as it does not become a second public or operator product surface.

### Explicit Non-Goals

- **D-09:** Keep manual login and reauthentication. This phase should not attempt CAPTCHA bypass or stealth anti-detection tooling.
- **D-10:** Keep the current app/session model intact. The future mobile multi-chat UX and image attachment remain outside this phase.

### the agent's Discretion

- Exact selector abstraction shape, as long as relay and bootstrap drift fixes end up centralized and easy to update.
- Whether targeted live verification is expressed as a maintainer script, an internal worker route, or another internal-only mechanism.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and product context
- `.planning/PROJECT.md` - current product shape, host-native path, and rollout-stability focus
- `.planning/REQUIREMENTS.md` - `STAB-01` through `STAB-03` for this phase
- `.planning/ROADMAP.md` - Phase 10 goal and success criteria
- `.planning/STATE.md` - current rollout debt, especially the residual `dad` selector failure

### Prior phase evidence
- `.planning/phases/08-per-chat-temporary-chat-isolation-and-latest-reasoning-model-selection/08-RESEARCH.md` - prior `Temporary Chat` and preferred-model planning assumptions
- `.planning/phases/08-per-chat-temporary-chat-isolation-and-latest-reasoning-model-selection/08-VERIFICATION.md` - phase-8 residual live drift warning
- `.planning/phases/09-internal-host-pool-orchestration/09-VERIFICATION.md` - phase-9 completion and the remaining live-smoke tail

### Relay and bootstrap code paths
- `workers/agent/src/chat-relay/selector-map.ts` - current relay selector candidates
- `workers/agent/src/chat-relay/relay-runner.ts` - current relay submission and capture logic
- `workers/agent/src/chat-relay/relay-types.ts` - current relay result contract
- `workers/agent/src/chat-bootstrap/bootstrap-selector-map.ts` - current fresh-chat selector candidates
- `workers/agent/src/chat-bootstrap/temporary-chat-runner.ts` - current temporary-chat bootstrap logic
- `workers/agent/src/chat-bootstrap/bootstrap-types.ts` - current bootstrap result contract
- `workers/agent/src/server.ts` - worker runtime wiring and preferred-model env handling

### Existing tests and backend consumers
- `workers/agent/test/relay-runner.test.ts` - current relay behavior and failure-code expectations
- `workers/agent/test/temporary-chat-runner.test.ts` - current bootstrap behavior and failure-code expectations
- `workers/agent/test/bootstrap-selector-map.test.ts` - existing selector-map utility coverage
- `services/control-api/src/chat/chat-relay-service.ts` - current relay failure propagation and retry logic
- `services/control-api/src/chat/worker-relay-client.ts` - control-api relay result parsing
- `services/control-api/src/chat/worker-chat-bootstrap-client.ts` - control-api bootstrap result parsing

### Operator guidance
- `docs/internal-worker-ops.md` - current operator rules for `Temporary Chat`, preferred model, and drift handling
- `docs/host-native-worker.md` - current host-native workflow and current preferred-model assumption

</canonical_refs>

<specifics>
## Specific Ideas

- The current relay selector map is still coarse and produces a generic `selector_not_found`, which makes worker-specific drift hard to debug.
- The current bootstrap selector map already lives in one place, but it mainly assumes the text `Temporary Chat` rather than the newer UI entrypoints documented by OpenAI.
- The preferred reasoning model policy should still target the latest reasoning model in ChatGPT. As of 2026-03-28, the project currently treats `GPT-5.4 Thinking` as the correct default.
- The user-facing product direction remains a standard mobile chat UX, but this phase should not drift into that future scope.

</specifics>

<deferred>
## Deferred Ideas

- Public mobile multi-chat UX
- Image attachment in the end-user app
- Operator-facing rollout smoke history and visible smoke status reporting
- Billing, entitlement, or broader product-layer access control

</deferred>

---
*Phase: 10-chatgpt-ui-drift-hardening*
*Context gathered: 2026-03-28*
