# One Hour With My ChatGPT

## What This Is

One Hour With My ChatGPT is an application for household or family use that gives a user a timed 60-minute chat session through one of several persistent ChatGPT browser workers. The actual chat runs inside server-hosted browser containers; the application only relays user messages, receives assistant replies, and presents session and worker state.

## Core Value

A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.

## Requirements

### Validated

- [x] A small household worker pool can be represented as named workers with dedicated container identity and durable profile storage.
- [x] Manual ChatGPT authentication and reauthentication can be modeled as internal-only operator workflows without storing plaintext credentials.
- [x] Phase 1 has a concrete control-api, worker-agent skeleton, internal recovery routes, and a compose topology that match the planned worker contract.
- [x] Phase 2 has a durable SQLite-backed session engine with FIFO queueing, 60-minute expiry, and pinned worker assignment.
- [x] Phase 2 exposes a safe public session API for create, resume, cancel, and end flows without leaking internal worker profile or recovery details.
- [x] Phase 2 ships a separate shared-screen React client with Start, Queued, Active, and Ended states plus a disabled Phase 3 chat shell.

### Active

- [ ] Relay messages between the application and the assigned server-hosted ChatGPT worker reliably
- [ ] Show delivery or response progress clearly once real message relay begins
- [ ] Keep end-user access constrained to the application surface rather than the raw worker browser UI
- [ ] Add failure classification, reconnect behavior, and operator observability around live sessions

### Out of Scope

- Native OpenAI API integration - v1 is explicitly based on relaying existing ChatGPT browser sessions
- Public multi-tenant SaaS scaling - start with a small private household worker pool first
- Automated login, CAPTCHA solving, or unattended reauthentication - auth stays manual for now
- Voice, file upload, and image generation workflows - extra complexity beyond the core text relay loop
- Full billing or subscription platform - entitlement can be handled manually or later

## Context

- The product is not a new chatbot; it is a controlled relay around already logged-in ChatGPT web sessions.
- The backend owns browser automation, worker assignment, session timing, health monitoring, and recovery.
- Each worker is expected to run in its own Docker container with persistent profile storage and a manual operator login flow.
- The client application should never expose raw browser controls, account credentials, or recovery tools.
- The riskiest parts of the system are dependency on a third-party web UI, long-lived browser profile persistence, and keeping several workers healthy at once.

## Constraints

- **Runtime**: Use Playwright as the browser control layer - one automation model should drive all workers.
- **Containerization**: Each worker runs in its own dedicated Docker container - isolation and per-worker restart matter more than minimal infrastructure.
- **Persistence**: Each worker profile must live on durable server-side storage mounted into the container - login state must survive container restart.
- **Sessioning**: Each user session is capped at 60 minutes and pinned to one worker - the time box is the product unit and prevents cross-worker drift.
- **Security**: Cookies, login state, browser profiles, and recovery tooling must remain server-side - client exposure would create unacceptable account risk.
- **Operations**: Admin and status surfaces are internal only - login and reauthentication are manual operator actions.
- **Dependency**: The system depends on ChatGPT web UI behavior remaining automatable - UI changes must be expected and monitored.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use browser relay instead of direct OpenAI API | The idea is to give access to existing ChatGPT browser sessions and behavior | - Pending |
| Keep the application as a thin client | The remote browser should stay hidden; the app only needs chat and session UX | - Implemented in Phase 2 as a shared-screen session client |
| Use several persistent named browser workers for household use | The product now serves a small family pool rather than one shared slot | - Implemented in Phase 1 |
| Use Playwright as the control layer | One automation API across all workers reduces integration churn | - Implemented in Phase 1 baseline |
| Run each worker in a dedicated Docker container with durable profile storage | Isolation, restartability, and profile persistence are all first-class needs | - Implemented in Phase 1 |
| Keep login and reauthentication manual | Automating ChatGPT auth would be brittle and increase risk early | - Validated in Phase 1 |
| Start with an internal admin or status surface | Operators need readiness, recovery, and reauth visibility before user sessions begin | - Implemented in Phase 1 as internal API plus ops playbook |
| Treat BlitzBrowser as the strongest container-runtime candidate, not a hard dependency yet | It matches headful persistent worker needs well, but raw Playwright plus Docker should remain a baseline option | - Reconfirmed as fallback in Phase 1 |

---
*Last updated: 2026-03-27 after Phase 2 execution and verification*
