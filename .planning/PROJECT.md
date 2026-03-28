# One Hour With My ChatGPT

## What This Is

One Hour With My ChatGPT is a household application that gives a user a timed 60-minute conversation through one of several persistent ChatGPT browser workers. The actual chat runs in server-hosted browser containers; the application handles session routing, relay, recovery, and operator visibility without exposing the raw browser to end users.

## Core Value

A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.

## Current State

- `v1.0 Household MVP` shipped on `2026-03-28`
- Multi-worker Playwright browser pool runs in Docker with durable per-worker profiles
- Public shared-screen client supports timed session start, queueing, active countdown, chat history, and manual end
- `control-api` owns session routing, durable chat history, relay orchestration, restart logic, and internal observability
- Internal admin can inspect workers, open protected noVNC browser access, complete manual login or reauth, and monitor readiness
- Worker runtime startup now survives recreate and restart without manual Chromium lock cleanup

## Validated

- [x] A small household worker pool can be represented as named workers with dedicated container identity and durable profile storage.
- [x] Manual ChatGPT authentication and reauthentication can be modeled as internal-only operator workflows without storing plaintext credentials.
- [x] A 60-minute session contract can be enforced server-side with durable queueing, worker pinning, expiry, and manual end.
- [x] The shared-screen application can relay messages through a managed worker and keep history visible across active and ended states.
- [x] Retry, reconnect, and worker restart flows can recover service without exposing raw worker internals publicly.
- [x] Public and internal traffic can be separated behind one edge while operator health and event visibility remain available.
- [x] Protected internal browser access can support manual ChatGPT login or reauthentication through noVNC without publishing worker viewers publicly.
- [x] Persistent worker profiles can recover to a healthy ready pool after container recreate and restart.

## Next Milestone Goals

- Decide whether the next milestone is primarily `billing and entitlements`, `richer interaction`, or `household rollout hardening`
- Complete one real logged-in ChatGPT relay smoke against a live worker
- Complete one real household login or challenge-page smoke through the protected noVNC viewer

## Out of Scope

- Native OpenAI API integration - v1 deliberately relays existing ChatGPT browser sessions
- Public multi-tenant SaaS scaling - current target remains a small private household deployment
- Automated login, CAPTCHA solving, or unattended reauthentication - auth remains manual by design
- Voice, file upload, and image generation workflows - deferred beyond the v1 text relay baseline

## Context

- The product is not a new chatbot; it is a controlled relay around already logged-in ChatGPT web sessions.
- The backend owns browser automation, worker assignment, session timing, health monitoring, and recovery.
- Each worker runs in its own Docker container with persistent profile storage and a manual operator login flow.
- The client application should never expose raw browser controls, account credentials, or recovery tools.
- The biggest remaining real-world risk is third-party ChatGPT web UI drift, which still benefits from live operator smoke checks even when local tests are green.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use browser relay instead of direct OpenAI API | The product is about controlled access to existing ChatGPT browser sessions | - Validated in v1.0 |
| Keep the application as a thin client | The remote browser should stay hidden; the app only needs session and chat UX | - Validated in v1.0 |
| Use several persistent named browser workers for household use | The product serves a small family pool rather than one shared slot | - Validated in v1.0 |
| Use Playwright as the control layer | One automation API across all workers reduces integration churn | - Validated in v1.0 |
| Run each worker in a dedicated Docker container with durable profile storage | Isolation, restartability, and profile persistence are first-class needs | - Validated in v1.0 |
| Keep login and reauthentication manual | Automating ChatGPT auth would be brittle and higher risk early | - Validated in v1.0 |
| Put one Nginx edge in front of the stack | Public and internal surfaces need a clean operational boundary | - Validated in v1.0 |
| Keep the operator admin page inside control-api | A lightweight internal surface is enough for v1 visibility and recovery | - Validated in v1.0 |
| Protect browser viewers with time-bounded access sessions | Manual login needs a real browser without exposing raw worker viewer routes | - Validated in v1.0 |

---
*Last updated: 2026-03-28 after completing the v1.0 Household MVP milestone*
