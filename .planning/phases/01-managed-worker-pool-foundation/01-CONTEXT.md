# Phase 1: Managed Worker Pool Foundation - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

## Phase Boundary

This phase delivers the containerized browser-worker foundation for a small household deployment. Each named worker runs a headful browser in its own Docker container, is controlled through Playwright, keeps a persistent authenticated profile across restarts, and exposes internal-only status and recovery paths for the operator.

This phase does not yet deliver user chat relay, session countdown UX, billing, or public multi-tenant scaling.

## Implementation Decisions

### Worker Model

- Use several named browser workers for household or family use rather than one shared slot.
- Keep workers long-lived; do not launch a fresh browser for every user session.
- Treat one worker as one isolated browser runtime with its own persistent profile and lifecycle.
- Worker-to-account mapping may be one account per worker or a smaller shared set, but the system must not assume a single global browser anymore.

### Browser Runtime

- Use Playwright as the control layer for the worker browsers.
- Run each worker in a separate Docker container.
- Store each worker profile on durable server-side storage mounted into the container so login survives restart.
- Prefer headful or open browser operation for manual login, debugging, and recovery.

### Authentication and Recovery

- Login and reauthentication are manual operator actions.
- Do not attempt to automate the ChatGPT login flow in v1.
- Provide an internal-only way to attach to a worker for login or recovery.
- Keep cookies, profiles, and any recovery tooling server-side only.

### Status and Admin Surface

- Provide an internal admin or status screen, or at minimum an internal status API.
- Required worker statuses are `starting`, `ready`, `busy`, `disconnected`, and `reauth_required`.
- Docker container health is useful but does not replace app-level worker status.
- Operators need visibility per worker, not just overall project health.

### Tooling Decisions

- The baseline architecture remains our own Playwright worker manager plus Dockerized browser workers.
- BlitzBrowser is the strongest ready-made runtime candidate for a Phase 1 spike because it aligns with headful Docker browsers, Playwright connectivity, persistent sessions, and parallel workers.
- DockMon is optional as an external operations layer, but it does not replace the product's own worker status model.
- DockerWakeUp is deferred unless cost-saving idle sleep becomes important later.
- Hero, BrowserWing, ScraperAI, and Browserless are not chosen as the primary runtime for v1.

### Claude's Discretion

- Exact API shape for worker orchestration and status reporting.
- Whether profile persistence uses host-mounted storage, object storage, or another durable approach, as long as restart preserves login.
- Whether the first admin surface is API-only or a minimal internal UI.
- Whether a BlitzBrowser spike happens before or after a raw Playwright worker prototype, as long as the comparison stays within Phase 1.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project References

- `.planning/PROJECT.md` - Current product context, constraints, and key decisions
- `.planning/REQUIREMENTS.md` - v1 requirement set and traceability
- `.planning/ROADMAP.md` - Phase goals, dependencies, and success criteria
- `.planning/STATE.md` - Current project position and continuity

### Phase References

- `.planning/phases/01-managed-worker-pool-foundation/01-01-ARCHITECTURE-SPIKE.md` - Short architecture spike selecting the worker runtime baseline and topology
- `.planning/phases/01-managed-worker-pool-foundation/01-TOOLING-EVALUATION.md` - Repo-backed evaluation of Docker and browser infrastructure candidates for this phase

## Existing Code Insights

### Reusable Assets

- None yet - this is still a greenfield phase.

### Established Patterns

- Planning assumes a thin client, worker isolation, and server-only recovery surfaces.

### Integration Points

- Worker manager will later connect to session routing in Phase 2.
- Worker status model will feed relay and recovery behavior in Phases 3 and 4.
- Internal health and event signals should be designed so Phase 5 monitoring can consume them without redesign.

## Specific Ideas

- Keep family users on a small fixed worker pool instead of trying to solve public scaling immediately.
- Model workers as named resources such as `dad`, `mom`, `shared-1`, or similar labels rather than anonymous slots.
- Make `reauth_required` an explicit first-class state rather than overloading `disconnected`.
- Capture enough worker metadata that a minimal internal admin screen can explain why a worker is unavailable.

## Deferred Ideas

- Billing and entitlement automation belong to a later phase.
- Voice, file upload, and image generation belong to later phases.
- Worker auto-sleep and auto-wake policies are deferred until the always-on worker baseline is proven.
- Public multi-tenant scaling is out of scope for this phase and likely a later milestone.

---

*Phase: 01-managed-worker-pool-foundation*
*Context gathered: 2026-03-27*
