# 01-01 Architecture Spike: Worker Runtime and Topology Baseline

**Date:** 2026-03-27
**Phase:** 01 - Managed Worker Pool Foundation
**Scope:** Short architecture spike for the family worker-pool baseline before implementation

## Decision Goal

Choose the minimum viable runtime and control topology for several named household ChatGPT workers before building the multi-worker manager and internal admin surface. The decision needs to lock down container boundaries, profile persistence, internal access rules, and the worker status contract early enough that 01-02 and 01-03 are implementation work instead of another round of architecture debate.

## Candidates Compared

### Option A: Raw Playwright worker-agent containers

- One `worker-agent` container per named worker.
- Each container owns a headful browser instance, its local Playwright control loop, and one durable profile mount.
- A central `control-api` service manages worker registry, assignment, health, and internal admin endpoints over a private Docker network.

Why this is strong:

- Maximum control over worker lifecycle, status mapping, profile handling, and internal security boundaries.
- No extra browser platform semantics before we prove the family worker model.
- Easier to shape around our own `reauth_required` state and operator recovery flow.

Tradeoff:

- We own more runtime ergonomics ourselves, including container images, browser startup behavior, and live recovery conventions.

### Option B: BlitzBrowser-backed workers

- Use BlitzBrowser as the browser runtime layer while keeping our own worker registry and internal control semantics above it.
- Connect from Playwright or CDP to BlitzBrowser-managed headful sessions.

Why this is attractive:

- Strong fit with headful Docker browsers, live view, persistent sessions, and parallel workers.
- Reduces some browser-runtime operational burden.

Tradeoff:

- Adds another runtime layer before we prove our own worker semantics.
- Increases coupling to an external browser platform earlier than necessary.

## Recommended Direction

Choose **raw Playwright worker-agent containers** as the primary implementation baseline for Phase 1.

Keep **BlitzBrowser** as a bounded fallback spike only if the cost of operating headful browser containers ourselves becomes the main blocker. This keeps the product architecture centered on our own worker contract instead of starting with a platform dependency.

Reasoning:

- The project-specific risk is not "can we run a browser in Docker"; it is "can we operate several persistent family workers with manual auth, durable profiles, and an internal-only recovery path."
- Raw Playwright worker-agent containers give the clearest ownership model for those risks.
- The existing tooling evaluation already shows BlitzBrowser is the best external match, so it remains a safe secondary path if needed.

## Proposed Runtime Topology

Recommended baseline topology:

1. `control-api`
   - Owns the worker registry, assignment logic, session bookkeeping, and internal admin endpoints.
   - Talks only to worker containers on a private Docker network such as `worker-net`.

2. `worker-agent` containers
   - One container per named worker, for example `worker-dad`, `worker-wife`, `worker-shared-1`.
   - Each container runs one headful browser plus a small local Playwright-driven agent process.
   - Each container owns one durable profile mount.

3. `admin` surface
   - May start as internal API only.
   - Can later become a minimal internal admin UI without changing the worker contract.

4. Durable profile storage
   - Host-mounted storage per worker, recommended path pattern: `/srv/chatgpt-workers/profiles/<worker-name>`.
   - The mount is attached into the worker container and reused across container restarts.

5. Private networking
   - Workers are not published directly to the public internet.
   - Only the `control-api` and trusted admin path can reach worker-agent control endpoints.

## Worker Status Contract

Every worker must expose exactly one current status from this set:

| Status | Meaning | Typical Trigger |
|--------|---------|-----------------|
| `starting` | Container or browser is booting and not ready for session assignment | Container restart or browser launch |
| `ready` | Worker is healthy, authenticated, and available for session assignment | Browser loaded and authenticated |
| `busy` | Worker is reserved by an active session and must not be reassigned | A user session is attached |
| `disconnected` | Worker agent cannot reliably control or observe the browser | Browser crash, agent failure, lost control channel |
| `reauth_required` | Worker is reachable but needs manual operator login or reauthentication | ChatGPT logout, expired session, challenge page |

Important rule:

- `reauth_required` is not the same as `disconnected`. The first is an operator workflow state, the second is a runtime failure state.

## Storage and Security Boundaries

- Cookies, browser profiles, local storage, and session artifacts remain only on server-side durable storage.
- End users talk only to the product application and never to raw worker browsers.
- Worker live view, login screens, and recovery endpoints are **internal-only**.
- Only the `control-api` can call worker-agent control endpoints over the private network.
- No phase should assume that storing profile data "inside the container" alone is durable enough; persistence must come from a reusable mount.

## Runtime Invariants

- Operator login into ChatGPT is always manual inside the worker browser; the system never automates account login.
- The platform must not store plaintext account credentials, reusable passwords, or any "remembered login" secret outside the browser profile itself.
- Recovery flows are allowed to open a browser session for the operator, but they must stop at "browser ready for manual login" and wait for the operator to finish authentication.
- Worker browsers remain a server-side operational surface, not a user-facing application feature.

## Minimal Internal API Shape

The baseline internal API can stay small:

- `GET /internal/workers` - list workers and statuses
- `GET /internal/workers/:id` - worker details, timestamps, and assigned user
- `POST /internal/workers/:id/restart` - restart one worker
- `POST /internal/workers/:id/reauth/start` - open or enable the recovery path for manual login
- `GET /internal/workers/:id/status` - lightweight machine-readable health state

This is enough to unblock the manager and admin flows without locking the public application API yet.

## Next Build Slice

`01-02` should implement:

- Worker registry shape in the backend
- Per-worker health and status reporting
- Internal status API for listing and inspecting workers

`01-03` should implement:

- Operator login and reauthentication path
- Worker restart and recovery flow
- Internal-only admin access rules around the worker UI

## Deferred From This Spike

- Auto-sleep or wake policies such as DockerWakeUp
- Public multi-tenant scaling
- Billing and entitlement logic
- Voice, file upload, and image generation
- Automatic login or CAPTCHA bypass

## Final Call

Build Phase 1 on **raw Playwright worker-agent containers** first. Keep the status contract, the profile mount pattern, and the internal-only admin boundary stable. If container ergonomics become the main delivery risk, run a narrow follow-up spike that swaps only the browser runtime layer to **BlitzBrowser** while preserving the same worker contract.
