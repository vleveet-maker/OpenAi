# Phase 1 Tooling Evaluation

**Evaluated:** 2026-03-27
**Scope:** Browser runtime, Docker operations, and worker-management candidates for the household multi-worker architecture

## Recommendation Summary

| Tool | Fit | Recommendation | Why |
|------|-----|----------------|-----|
| DockerWakeUp | Low to medium | Defer | Good for waking idle HTTP services, but our family chat workers should stay warm, login-persistent, and immediately ready. It adds cold-start behavior and an NGINX-centric control plane we do not need in Phase 1. |
| DockMon | Medium | Optional later | Strong for Docker dashboards, logs, alerts, and restart workflows. Useful as an external ops layer, but it cannot replace app-specific states like `reauth_required` or worker assignment awareness. |
| Hero | Low | Do not adopt | Built for scraping and anti-detection rather than the Playwright-based worker orchestration we already chose. Adds another browser abstraction with little direct value to the product. |
| BrowserWing | Low | Do not adopt | Designed for AI-agent or MCP browser control, script recording, and agent integration. Our backend can call Playwright directly without an extra control plane. |
| BlitzBrowser | High | Best candidate for a Phase 1 spike | Headful browsers in Docker, Playwright or CDP connectivity, persistent sessions, live view, and parallel workers. This is the closest repo match to our worker-container architecture. |
| ScraperAI | Very low | Do not adopt | Scraping assistant, not runtime browser-worker infrastructure. |
| Browserless | Medium | Keep as backup reference, not primary | Great Playwright compatibility, queueing, debug viewer, and persistent-session features, but it is headless-first in positioning and the licensing is less friendly for a private or proprietary app. |

## Adopted Direction

- **Baseline:** Our own Playwright worker manager plus dedicated Docker worker containers.
- **Strongest runtime candidate:** BlitzBrowser as a focused spike or benchmark against the raw Playwright container baseline.
- **Optional external ops layer:** DockMon after the product's own internal status and recovery model exists.
- **Deferred or rejected for Phase 1:** DockerWakeUp, Hero, BrowserWing, ScraperAI, Browserless.

## Tool Notes

### BlitzBrowser

Why it stands out:

- It explicitly targets headful browsers in Docker.
- It supports Playwright and CDP connectivity.
- It supports persistent browser user data.
- It supports multiple concurrent browsers and live view.
- It uses an Apache-2.0 license, which is simpler for future private product development than some alternatives.

Caveats:

- It is still an additional runtime layer, so we should keep a raw Playwright plus Docker fallback path.
- We still need our own worker naming, assignment, household access model, and application-level status semantics.

### DockMon

Why it may help later:

- Real-time Docker dashboard, logs, alerts, and restart actions are useful for operations.
- It can watch multiple Docker hosts and expose container-level health.

Why it is not a core dependency:

- Our product-specific status model includes `reauth_required`, worker assignment, and session failure context that Docker-only monitoring will not infer.
- The README states it is under Business Source License 1.1 until 2027-01-01, so it should be treated as an optional ops tool rather than embedded product infrastructure.

### DockerWakeUp

Why it is not a good Phase 1 fit:

- It is optimized for waking and sleeping reverse-proxied services on HTTP access.
- Our workers need predictable readiness for interactive chat, not just eventual wake-on-request behavior.
- Cold starts and idle shutdown policies can complicate login persistence and operator expectations.

Potential later use:

- Optional cost-saving policy for rarely used workers after the always-on baseline is proven.

### Browserless

Why it is not the primary choice:

- Strong feature set for Playwright, queueing, and persistent sessions.
- Good debugging and browser-service ergonomics.

Why it is still secondary:

- The project positions itself around headless browser service deployment more than named headful family workers.
- The README includes SSPL or commercial licensing terms that are less convenient for a private proprietary application.
- It is likely more platform than we need for a small household deployment.

### Hero, BrowserWing, ScraperAI

These are not Phase 1 fits because:

- Hero is optimized for scraping and anti-detection.
- BrowserWing is optimized for AI-agent browser tooling and MCP workflows.
- ScraperAI is optimized for scraping assistance.

None of them solve the core need better than Playwright plus dedicated browser workers.

## Source Snapshot

| Tool | Repo | License | Checked Facts |
|------|------|---------|---------------|
| DockerWakeUp | https://github.com/jelliott2021/DockerWakeUp | MIT | On-demand container startup, idle shutdown, NGINX config generation |
| DockMon | https://github.com/darthnorse/dockmon | BSL 1.1 in README | Docker monitoring, logs, alerts, restart workflows, multi-host support |
| Hero | https://github.com/ulixee/hero | MIT | Browser built for scraping and anti-detection workflows |
| BrowserWing | https://github.com/browserwing/browserwing | MIT | AI-agent browser automation, MCP, script recording, session management |
| BlitzBrowser | https://github.com/blitzbrowser/blitzbrowser | Apache-2.0 | Headful Docker browsers, Playwright connectivity, persistent sessions, live view |
| ScraperAI | https://github.com/scraperai/scraperai | GPL-3.0 | AI scraping assistant with Selenium and LLM workflows |
| Browserless | https://github.com/browserless/browserless | SSPL-1.0 or commercial per README | Playwright support, queueing, persistent sessions, debug viewer, enterprise options |

## Planning Implications

- Phase 1 plans should compare **raw Playwright worker containers** against a **BlitzBrowser-backed worker runtime** before locking the final browser container implementation.
- Phase 1 should create a first-class worker status model independent from Docker status alone.
- Phase 5 can optionally add monitoring hooks that external tools like DockMon can consume.

---
*Evaluation date: 2026-03-27*
