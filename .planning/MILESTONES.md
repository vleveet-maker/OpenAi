# Milestones

## v1.1 Household Rollout Hardening (Shipped: 2026-03-28)

**Phases completed:** 2 phases, 4 plans, 10 tasks

**Key accomplishments:**

- Host-native Chromium workers became the proven fallback when Docker browser workers hit Cloudflare-style login friction.
- A three-worker household pool can now be launched on demand through a local sing-box proxy layer built from VLESS, Trojan, and Shadowsocks share links.
- Live proxied relay was verified across multiple household workers without changing the existing `control-api` session and routing contract.
- Fresh-chat bootstrap now blocks send until a newly activated session has prepared a clean dialog boundary on the assigned worker.
- Worker automation now prefers ChatGPT `Temporary Chat` plus the latest configured reasoning model before the shared-screen composer unlocks.
- The shared-screen client and operator docs now surface preparing, ready, and failed fresh-chat setup states clearly.

**Tracked tech debt:**

- One proxied `dad` relay still showed `selector_not_found`, pointing to worker-specific ChatGPT DOM drift that should be hardened later.
- Live smoke against the current production ChatGPT `Temporary Chat` and model-picker UI is still the remaining external validation tail.

---

## v1.0 Household MVP (Shipped: 2026-03-28)

**Phases completed:** 7 phases, 18 plans, 26 tasks

**Key accomplishments:**

- Worker runtime baseline for named Playwright containers, durable profiles, and manual-auth internal recovery boundaries
- Express control-api with named worker registry, canonical status model, and Docker topology for dedicated household workers
- Persistent Playwright browser launch, internal-only recovery controls, and a household operator playbook for manual login workflows
- Durable SQLite-backed timed-session queue with FIFO promotion, worker pinning, restart rehydrate, and timer sweep
- Public timed-session API with create, resume, cancel, end, and safe worker-state integration around recovery flows
- Vite and React shared-screen client with queued and active lifecycle views, local countdown, and a disabled Phase 3 chat shell
- Session-scoped chat history with pending assistant placeholders and public `/messages` routes on control-api
- Worker-agent Playwright relay runner with internal `/internal/relay/messages` plus control-api transport wiring back into pending assistant placeholders
- Shared-screen React chat UI with persisted conversation history, pending assistant bubbles, and closed-session history review

---
