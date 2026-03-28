---
id: SEED-001
status: dormant
planted: 2026-03-28
planted_during: v1.1 / Phase 7
trigger_when: when we plan a milestone that touches chat lifecycle semantics, dialog isolation, or stricter session isolation rules
scope: Medium
---

# SEED-001: Per-chat clean dialog isolation with Temporary Chat and latest reasoning model

## Why This Matters

The user wants every new chat to start in a clean context so the next dialog does not inherit confusing conversation state from the previous one.

This matters because the current system is optimized for stable long-lived worker profiles and durable login, but the product contract may need a stronger boundary between one chat and the next. Without that boundary, a user can feel like a fresh chat is still "inside" the previous conversation or page state.

The user also wants that fresh chat to open through ChatGPT `Temporary Chat` semantics so it does not appear in history and does not use or create memories, while defaulting to the newest available reasoning model instead of whatever stale model may already be selected on that worker.

## When to Surface

**Trigger:** when we plan a milestone that touches chat lifecycle semantics, dialog isolation, or stricter session isolation rules

This seed should be presented during `$gsd-new-milestone` when the milestone scope matches any of these conditions:
- we redesign what "new chat" means in the product beyond the current active-session flow
- we need stronger isolation so a fresh chat never reuses the previous chat or tab context
- we introduce UI or backend rules for explicit chat reset, fresh thread creation, or per-dialog isolation
- we add browser automation around model selection or temporary-chat toggles

## Scope Estimate

**Medium** - this is likely one focused phase or a small couple of phases because it touches product semantics, browser-context behavior, and relay assumptions.

## Breadcrumbs

Related code and decisions found in the current codebase:

- [session-service.ts](/d:/OpenAi/services/control-api/src/sessions/session-service.ts) - owns the active 60-minute session contract and worker pinning
- [chat-relay-service.ts](/d:/OpenAi/services/control-api/src/chat/chat-relay-service.ts) - assumes relay happens inside the currently assigned worker conversation flow
- [use-session-view.ts](/d:/OpenAi/apps/session-client/src/use-session-view.ts) - preserves and resumes the current active session from the shared-screen client
- [browser-launch.ts](/d:/OpenAi/workers/agent/src/browser-launch.ts) - current worker runtime centers on durable logged-in profiles, not clean per-chat contexts
- [host-native-worker.md](/d:/OpenAi/docs/host-native-worker.md) - current real-world fallback path uses long-lived host-native logged-in workers
- [PROJECT.md](/d:/OpenAi/.planning/PROJECT.md) - project context now records the rule that a new chat should feel like a fresh dialog
- [STATE.md](/d:/OpenAi/.planning/STATE.md) - current milestone is ready to complete, so this is better captured as forward-looking seed than mixed into the shipped hardening slice
- OpenAI Temporary Chat docs - official behavior for history and memory isolation
- OpenAI GPT-5.4 release notes - official source for the current latest reasoning model in ChatGPT as of 2026-03-28

## Notes

- Working assumption: "clean dialog" here means a fresh conversation or browser-context boundary for each new chat, not deleting the durable logged-in household worker profile itself.
- This likely needs an explicit product decision about what must reset between chats:
  - only ChatGPT thread history
  - the active tab and page state
  - browser storage beyond the logged-in account session
- Working assumption: "Temporary Chat" is the preferred mode for a fresh dialog because OpenAI says temporary chats do not show in history, do not use or create memories, and are not used to train models.
- Working assumption: the model should be selected dynamically as "latest reasoning model available in ChatGPT"; as of 2026-03-28 that is `GPT-5.4 Thinking`, but this part is intentionally time-sensitive and should be revalidated when implemented.
- If we implement this later, we should validate that clean per-chat isolation does not force manual login every single time.
