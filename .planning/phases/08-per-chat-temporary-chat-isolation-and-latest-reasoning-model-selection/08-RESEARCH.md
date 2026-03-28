# Phase 8: Per-chat Temporary Chat isolation and latest reasoning model selection - Research

**Completed:** 2026-03-28
**Question answered:** What do we need to know to plan and execute clean per-chat isolation, `Temporary Chat`, and latest reasoning model selection on top of the current worker/session architecture?

## Findings

### Temporary Chat Product Semantics

- OpenAI's `Temporary Chat FAQ` says a temporary chat starts with a blank slate, ChatGPT is not aware of previous conversations, and it does not access memories.
- The same FAQ says temporary chats do not appear in history and are not used to improve OpenAI's models.
- OpenAI's `Memory FAQ` separately says temporary chats do not reference memories and do not create new memories.
- For this project, that means `Temporary Chat` is the closest official product behavior to the user's requirement that each new dialog should be clean and non-confusing.

### Latest Reasoning Model Is Time-Sensitive

- OpenAI's `Introducing GPT-5.4` release notes say that in ChatGPT, `GPT-5.4 Thinking` is rolling out and replacing `GPT-5.2 Thinking`.
- That makes `GPT-5.4 Thinking` the correct default target at planning time on `2026-03-28`.
- However, "latest reasoning model" is inherently time-unstable, so execution should encode a configurable candidate-label policy rather than freeze the implementation around one forever-assumed label.

### Persistent Login vs Fresh Chat Boundary

- The current system depends on durable logged-in worker profiles, especially for the host-native fallback.
- A new browser profile or true browser-incognito context would likely break the stable login that Phase 7 just validated.
- Therefore the correct isolation boundary for this phase is not "new browser profile per chat," but "fresh ChatGPT conversation surface per new session-backed dialog" within the existing logged-in worker profile.

### Best Integration Point

- The current `SessionService` activates a worker for a session and the current `ChatRelayService` allows sending as soon as the session is active.
- If Phase 8 is implemented only inside the first relay send path, the user can still enter a session that visually looks ready before the fresh chat is actually prepared.
- A better contract is to add an explicit session-scoped fresh-chat bootstrap state owned by `control-api`, scheduled when the session becomes active, and exposed to the shared-screen UI before the first send.

### Worker Automation Shape

- `worker-agent` already owns direct browser automation and should keep that responsibility for new-chat preparation.
- The existing relay runner already centralizes selectors and uses per-worker locking; the same pattern should be used for fresh-chat bootstrap so new-chat preparation and relay do not race.
- A dedicated worker bootstrap endpoint is more testable and more observable than trying to hide `Temporary Chat` and model selection deep inside relay submission code.

### Recommended Direction

- Add a session-scoped chat-bootstrap record with statuses `pending`, `ready`, and `failed`.
- When a session becomes active, schedule one fresh-chat bootstrap job for that worker and session.
- Block public send until bootstrap reaches `ready`.
- In `worker-agent`, add a dedicated fresh-chat runner that:
  - opens a clean chat surface,
  - enables `Temporary Chat`,
  - chooses the first available label from an ordered preferred reasoning model list,
  - and returns structured metadata including mode and chosen model label.
- In the client, show a preparing banner and disabled composer until bootstrap is ready, then show that the chat is isolated and which model was selected.

## Validation Architecture

- `services/control-api` should add unit and route coverage for bootstrap scheduling, bootstrap state transitions, and send gating while fresh-chat preparation is pending or failed.
- `workers/agent` should add unit coverage around selector fallback, temporary-chat enablement, model selection, and failure-code mapping using doubles instead of live ChatGPT.
- `apps/session-client` should add component or hook coverage for the preparing state, failed bootstrap state, and ready-to-send transition.
- One manual smoke check remains important after implementation: start a new session and confirm that the first visible chat is marked temporary, does not reuse the previous thread, and shows the current reasoning model.

## Sources

- Temporary Chat FAQ - https://help.openai.com/en/articles/8914046-temporary-chat-faq
- Memory FAQ - https://help.openai.com/en/articles/8590148-memory-faq//
- Data Controls FAQ - https://help.openai.com/en/articles/7730893-temporary-chat
- Introducing GPT-5.4 - https://openai.com/index/introducing-gpt-5-4/
- Playwright `launchPersistentContext` docs - https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context
- Playwright locator guidance - https://playwright.dev/docs/locators
- Playwright actionability and auto-waiting - https://playwright.dev/docs/actionability

---
*Phase: 08-per-chat-temporary-chat-isolation-and-latest-reasoning-model-selection*
*Research completed: 2026-03-28*
