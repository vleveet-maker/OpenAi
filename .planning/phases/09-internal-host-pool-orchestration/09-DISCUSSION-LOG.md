# Phase 9: Internal host-pool orchestration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md; this log preserves the discussion and defaults chosen.

**Date:** 2026-03-28
**Phase:** 09-internal-host-pool-orchestration
**Areas discussed:** phase framing, pool lifecycle scope, operator feedback, failure handling, future product direction

---

## Product Direction Clarification

**User input:** The user clarified that the broader product should look like a standard mobile chat-bot app with:
- chat list and create-new-chat controls
- text input and image attachment
- new chats going into a fresh temporary or incognito browser conversation
- continued chats staying in the same underlying browser conversation

**Outcome:** Preserved as future-direction guidance, not folded into Phase 9 scope because Phase 9 is operator control only.

---

## Pool Lifecycle Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Pool-level only | Add `Start pool` / `Stop pool` for the full household pool in internal admin | ✓ |
| Per-worker controls too | Add host-native start or stop for each worker as part of this phase | |

**Decision:** Start with pool-level controls only.
**Reasoning:** The user did not want further operator-detail questions, and pool-level control is the simplest path that still satisfies the phase goal.

---

## Operator Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Simple explicit lifecycle | Reuse the existing admin page and show clear states like starting, ready, degraded, and failed via polling | ✓ |
| Separate operator panel | Build a more complex dedicated lifecycle view | |
| Minimal/no lifecycle detail | Only show buttons and leave the operator to infer what happened | |

**Decision:** Use simple explicit lifecycle feedback on the existing internal admin page.

---

## Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Degraded, no rollback | Keep successful workers up, show degraded state, and let operator decide the next action | ✓ |
| Automatic rollback | Tear everything down if the pool starts only partially | |
| Automatic retry | Retry partial failures automatically during the same action | |

**Decision:** Degraded with no automatic rollback or automatic retry in this phase.

---

## the agent's Discretion

- Exact routing and service shape inside `control-api`
- Whether `pool stop` is implemented as a new host-controller endpoint or coordinated through existing worker stop operations
- Exact lifecycle labels and copy on the internal admin page

## Deferred Ideas

- Standard mobile app chat list and create-new-chat interface
- Image attachment support from the app
- Routing each new chat into a fresh temporary or incognito browser conversation as part of a user-facing multi-chat experience
- Per-worker host-native lifecycle controls if pool-only controls prove insufficient
