# One Hour With My ChatGPT

## What This Is

One Hour With My ChatGPT is a household application that gives a user a timed 60-minute conversation through one of several persistent ChatGPT browser workers. The actual chat runs in managed browser sessions; the application handles session routing, relay, recovery, and operator visibility without exposing the raw browser to end users.

## Core Value

A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.

## Current State

- `v1.0 Household MVP` shipped on `2026-03-28`
- `v1.1 Household Rollout Hardening` is now active and focuses on real-world household operation, not product expansion
- The core app stack still runs through `control-api`, the public shared-screen client, and the internal admin surface
- Docker browser workers remain a supported infrastructure baseline, but host-native Chromium workers are now the proven fallback when Docker/browser fingerprinting causes Cloudflare login loops
- A three-worker host-native pool can be launched only when needed and routed through a local sing-box mixed proxy built from several proxy share links with automatic outbound failover
- Host-native worker profiles stay on durable host storage and can be stopped cleanly when the pool is idle
- New session-backed chats now bootstrap through an explicit fresh-chat contract that prefers `Temporary Chat` and the latest configured reasoning model before the composer unlocks

## Validated

- [x] A small household worker pool can be represented as named workers with dedicated identity and durable profile storage.
- [x] Manual ChatGPT authentication and reauthentication can be modeled as internal-only operator workflows without storing plaintext credentials.
- [x] A 60-minute session contract can be enforced server-side with durable queueing, worker pinning, expiry, and manual end.
- [x] The shared-screen application can relay messages through a managed worker and keep history visible across active and ended states.
- [x] Retry, reconnect, and worker restart flows can recover service without exposing raw worker internals publicly.
- [x] Public and internal traffic can be separated behind one edge while operator health and event visibility remain available.
- [x] Protected internal browser access can support manual ChatGPT login or reauthentication without publishing worker viewers publicly.
- [x] Persistent worker profiles can recover to a healthy ready pool after container recreate and restart.
- [x] A host-native Chromium worker can replace a Docker browser worker without changing the `control-api` session and relay contract.
- [x] A local proxy layer built from VLESS, Trojan, and Shadowsocks share links can launch the household host-native worker pool on demand and prefer a healthy outbound automatically for new worker traffic.
- [x] The proxied host-native household pool can be stopped again cleanly so browsers do not remain open when the pool is idle.
- [x] Each newly activated shared-screen chat can now be blocked behind explicit fresh-chat bootstrap state until `Temporary Chat` and preferred-model selection are ready or have failed clearly.

## Current Milestone Goals

- Keep the proxied host-native worker pool and fresh-chat bootstrap rules in a state that is safe to close out as `v1.1`
- Carry forward only the remaining rollout debt around live selector drift and future app-driven host-worker orchestration

## Out of Scope

- Native OpenAI API integration - the product still deliberately relays existing ChatGPT browser sessions
- Automated login, CAPTCHA bypass, or unattended reauthentication - auth remains manual by design
- Public multi-tenant SaaS scaling - the current target remains a small private household deployment
- Billing, entitlements, voice, file upload, and image generation workflows - deferred beyond rollout hardening

## Context

- The product is not a new chatbot; it is a controlled relay around already logged-in ChatGPT web sessions.
- The backend still owns browser automation, worker assignment, session timing, health monitoring, and recovery.
- The client application should never expose raw browser controls, account credentials, or recovery tools.
- Host-native workers currently launch through a verified PowerShell operator path, not yet through a one-click `control-api` auto-start workflow.
- A new chat should feel like a fresh dialog, not like a continuation of the previous household conversation on the same worker.
- Fresh-chat behavior now prefers ChatGPT `Temporary Chat` so the dialog does not land in history and does not use or create memories.
- The current default model policy for a fresh chat is "latest available reasoning model", implemented through `WORKER_PREFERRED_REASONING_MODEL_LABELS` with `GPT-5.4 Thinking` as of 2026-03-28.
- The largest remaining real-world risks are worker-specific ChatGPT DOM drift and the ergonomics of running native browser windows on the host only when needed.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use browser relay instead of direct OpenAI API | The product is about controlled access to existing ChatGPT browser sessions | - Validated in v1.0 |
| Keep the application as a thin client | The remote browser should stay hidden; the app only needs session and chat UX | - Validated in v1.0 |
| Use several persistent named browser workers for household use | The product serves a small family pool rather than one shared slot | - Validated in v1.0 |
| Use Playwright as the control layer | One automation API across all workers reduces integration churn | - Validated in v1.0 |
| Keep login and reauthentication manual | Automating ChatGPT auth would be brittle and higher risk early | - Validated in v1.0 |
| Put one Nginx edge in front of the stack | Public and internal surfaces need a clean operational boundary | - Validated in v1.0 |
| Prefer host-native Chromium workers when Cloudflare blocks the Docker browser path | Real household login and relay reliability matters more than strict browser-container purity | - Validated in v1.1 |
| Launch host-native workers only on demand through a local proxy pool | The browsers should not stay visible when idle, and proxy choice needs to be resilient | - Validated in v1.1 |
| Keep proxy share links in ignored local files and generate sing-box config at runtime | Secrets and provider links should stay off tracked repo state | - Validated in v1.1 |
| Treat each new user chat as a clean dialog boundary | Users should not get confused by inheriting previous thread context from the same worker | - Implemented in v1.1 |
| Prefer `Temporary Chat` for fresh dialogs | The new chat should stay out of history and avoid using or creating memories | - Implemented in v1.1 |
| Prefer the latest ChatGPT reasoning model for a new chat | Fresh dialogs should start on the strongest current reasoning default instead of a stale model selection | - Implemented in v1.1 |

---
*Last updated: 2026-03-28 after completing Phase 8 fresh-chat isolation and preferred-model selection for v1.1*
