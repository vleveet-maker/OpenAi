# Phase 10: ChatGPT UI drift hardening - Research

**Completed:** 2026-03-28
**Question answered:** What do we need to know to plan and execute selector hardening for relay and fresh-chat bootstrap against the current ChatGPT UI?

## Findings

### The Current Drift Problem Is Already Visible In Code

- The current relay path still collapses several different DOM failures into one generic `selector_not_found`.
- `workers/agent/src/chat-relay/selector-map.ts` currently holds only a small set of anonymous composer, send, assistant-turn, and generating candidates, so a live failure like `dad` gives too little evidence about which part of the UI drifted.
- By contrast, bootstrap is already somewhat more centralized in `bootstrap-selector-map.ts`, so the biggest architectural gap is still on the relay side.

### Temporary Chat Entry Points Have Shifted

- OpenAI's `Temporary Chat FAQ` says that on the web, a temporary chat starts by opening a new chat and clicking the pill-shaped `Temporary` button in the top-right corner.
- OpenAI's broader `What is ChatGPT: FAQ` also says to start a temporary chat from the model menu when extra privacy is needed.
- Taken together, that means the implementation should not assume only one `Temporary Chat` text label or one menu shape. The current selector map needs to support both a direct `Temporary` top-bar or pill-style control and model-menu entry patterns.
- This is an inference from OpenAI help-center guidance rather than a DOM contract, so execution still needs live confirmation.

### Latest Reasoning Model Is Still Time-Unstable

- OpenAI's `Introducing GPT-5.4` page says `GPT-5.4 Thinking` is rolling out in ChatGPT and replacing `GPT-5.2 Thinking`.
- As of **2026-03-28**, that keeps `GPT-5.4 Thinking` as the correct default target for this project.
- However, the code should still treat the preferred-model choice as a configurable ordered label policy, because the "latest reasoning model" target can change again.

### Playwright Guidance Favors User-Facing, Centralized Locators

- Playwright's locator docs recommend prioritizing user-facing locators like `getByRole()` and explicit contracts instead of brittle CSS-only selectors.
- Playwright's actionability docs say `click()` and similar actions auto-wait for visibility, stability, event reception, and enabled state.
- That means the right hardening direction is not random sleeps, but better locator bundles, better failure classification, and tighter per-action intent.

### Live Verification Is Required For This Phase

- Existing automated tests already cover basic relay and bootstrap flows, but they use fake pages and cannot prove the current ChatGPT production UI still matches the selector maps.
- The phase goal explicitly references the current ChatGPT UI and a real `dad` edge case, so code-only planning is insufficient.
- A targeted maintainer verification utility is appropriate here, as long as the polished repeatable operator smoke path is still deferred to Phase 11.

### Recommended Direction

- Create centralized, named selector contracts for relay and bootstrap, not anonymous arrays without drift semantics.
- Replace the generic `selector_not_found` with more specific failure codes tied to selector groups.
- Add support for the currently documented `Temporary` entry patterns and a broader preferred-model alias policy.
- Add a targeted live verification tool that can exercise relay and bootstrap against a logged-in host-native worker without pretending to be the final operator-smoke surface.

## Validation Architecture

- `workers/agent` should gain unit coverage for named selector groups, richer failure codes, and current-UI alias handling.
- `services/control-api` should gain coverage where relay/bootstrap failure codes are parsed or surfaced, so more detailed worker failures do not get collapsed back into generic errors.
- Execution should include a manual or scripted live check against all three household workers, with `dad` treated as a must-pass case rather than a nice-to-have.
- Phase 11 should still own the polished repeatable smoke workflow and visible confidence reporting, so this phase should stop at targeted maintainer verification.

## Sources

- Temporary Chat FAQ - https://help.openai.com/en/articles/8914046-temporary-chat-faq
- What is ChatGPT: FAQ - https://help.openai.com/en/articles/12677804-what-is-chatgpt-faq
- Memory FAQ - https://help.openai.com/en/articles/8590148-memory-faq//
- Introducing GPT-5.4 - https://openai.com/index/introducing-gpt-5-4/
- Playwright locators - https://playwright.dev/docs/locators
- Playwright auto-waiting and actionability - https://playwright.dev/docs/actionability
- Playwright best practices - https://playwright.dev/docs/best-practices

---
*Phase: 10-chatgpt-ui-drift-hardening*
*Research completed: 2026-03-28*
