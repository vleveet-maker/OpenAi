---
id: SEED-002
status: dormant
planted: 2026-03-28
planted_during: v1.2 / Phase 9
trigger_when: when we plan a milestone that expands the end-user app beyond the current shared-screen session flow, especially multi-chat UX, mobile-first UI, or image attachments
scope: Large
---

# SEED-002: Mobile multi-chat app with image attachments and browser-thread continuity

## Why This Matters

The user clarified the intended product shape much more simply than the operator-control discussion: the app should eventually look like a normal mobile chat bot, not like a shared-screen operator tool.

That means the end-user surface should support a visible chat list, a clear create-new-chat action, a normal text composer, and an image-attachment button. It also means chat continuity should make sense to a normal person: starting a new chat must create a fresh `Temporary Chat` on an available browser worker, while continuing an existing chat must keep using the same underlying browser conversation so the dialog does not get mixed up.

Capturing this now prevents the current rollout-stability milestone from accidentally becoming the long-term UX contract.

## When to Surface

**Trigger:** when we plan a milestone that expands the end-user app beyond the current shared-screen session flow, especially multi-chat UX, mobile-first UI, or image attachments

This seed should be presented during `$gsd-new-milestone` when the milestone scope matches any of these conditions:
- we redesign the end-user app from a shared-session screen into a multi-chat product surface
- we add chat list, create-new-chat, or per-dialog lifecycle semantics
- we add image attachment from the app into the browser relay path
- we move from one clean dialog per active session toward several intentionally separate chats

## Scope Estimate

**Large** - this likely spans a full milestone because it changes the user-facing product model, the app UX, the browser-conversation mapping contract, and the relay payload surface.

## Breadcrumbs

Related code and decisions found in the current codebase:

- [app.tsx](/d:/OpenAi/apps/session-client/src/app.tsx) - current shared-session shell is single-threaded and does not yet offer chat list or image attachment
- [use-session-view.ts](/d:/OpenAi/apps/session-client/src/use-session-view.ts) - current client state assumes one active session flow rather than several separate app chats
- [public-chat.ts](/d:/OpenAi/services/control-api/src/routes/public-chat.ts) - current public chat API accepts only text `bodyText`
- [chat-relay-service.ts](/d:/OpenAi/services/control-api/src/chat/chat-relay-service.ts) - current relay contract is text-only and tied to one active worker conversation
- [PROJECT.md](/d:/OpenAi/.planning/PROJECT.md) - now records the intended mobile chat-app direction and app-level chat continuity rule
- [REQUIREMENTS.md](/d:/OpenAi/.planning/REQUIREMENTS.md) - future requirements now call out mobile chat UX, new-chat continuity, and image attachment explicitly
- [09-CONTEXT.md](/d:/OpenAi/.planning/phases/09-internal-host-pool-orchestration/09-CONTEXT.md) - preserves the user's clarification while keeping Phase 9 scoped to admin orchestration
- [SEED-001-per-chat-clean-dialog-isolation.md](/d:/OpenAi/.planning/seeds/SEED-001-per-chat-clean-dialog-isolation.md) - related seed for clean per-chat isolation, `Temporary Chat`, and preferred model selection

## Notes

- This seed is intentionally about the end-user product surface, not the internal admin flow.
- A "new chat" should keep the existing clean-dialog rules from `SEED-001`: fresh `Temporary Chat`, no confusing carry-over, and the latest reasoning model policy.
- A "continued chat" should stay pinned to its existing browser conversation instead of hopping to another worker mid-dialog.
- Image attachment should travel through the same app chat and underlying browser conversation instead of becoming a separate operator-only upload tool.
