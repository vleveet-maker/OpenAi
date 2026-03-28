# Milestones

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
