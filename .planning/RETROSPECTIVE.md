# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 - Household MVP

**Shipped:** 2026-03-28
**Phases:** 7 | **Plans:** 18 | **Sessions:** n/a

### What Was Built
- A managed Docker pool of persistent ChatGPT browser workers with durable profiles and internal operator control
- A timed shared-screen session product with queueing, 60-minute limits, chat relay, reconnect, and manual end
- A guarded internal admin surface with observability, worker restart, protected noVNC browser access, and stable worker readiness recovery

### What Worked
- Phase-by-phase isolation kept the riskiest browser and routing problems small enough to verify incrementally
- Combining code verification with live Docker smoke tests caught the runtime issues that local tests alone could not surface

### What Was Inefficient
- Some Phase 5 and milestone-closeout artifacts lagged behind the implemented code and needed retroactive synchronization
- Validation coverage was uneven across phases, which made final milestone audit cleanup noisier than necessary

### Patterns Established
- Use one control plane (`control-api`) as the canonical owner of worker state, sessions, relay history, and observability
- Treat manual ChatGPT login and reauthentication as explicit operator workflows behind protected internal browser access

### Key Lessons
1. Persistent browser automation needs real restart and recreate smoke tests; green unit tests are not enough when browser profiles live on mounted storage.
2. Public and internal boundaries should be introduced early, because recovery and observability routes accumulate quickly once relay and worker control exist.

### Cost Observations
- Model mix: n/a
- Sessions: n/a
- Notable: Short focused phases plus live smoke checks produced a shippable v1 quickly, but retroactive planning cleanup still carries a cost.

---

## Milestone: v1.1 - Household Rollout Hardening

**Shipped:** 2026-03-28
**Phases:** 2 | **Plans:** 4 | **Sessions:** n/a

### What Was Built
- A host-native Chromium fallback that keeps the same `control-api` worker contract when Docker browser workers hit Cloudflare-style login friction
- A three-worker on-demand household pool routed through a local sing-box mixed proxy generated from ignored VLESS, Trojan, and Shadowsocks share links
- A fresh-chat bootstrap contract that prepares each new session as a clean `Temporary Chat` with preferred reasoning model selection before the composer unlocks

### What Worked
- Running live household smokes early made the Docker-versus-host-native tradeoff obvious and gave us a real fallback path instead of theory
- Keeping the host-native and fresh-chat work inside the existing control plane avoided a larger rewrite while still moving the product forward materially

### What Was Inefficient
- Validation and milestone closeout still needed manual cleanup because some GSD archival metadata came out incomplete and had to be corrected by hand
- Externally controlled ChatGPT UI behaviors still force partial manual validation even when local automated coverage is strong

### Patterns Established
- Preserve one worker contract across Docker and host-native runtimes so rollout changes do not cascade into session-routing logic
- Treat external ChatGPT UI drift as tracked operational debt instead of pretending purely automated tests can fully close it

### Key Lessons
1. For browser-mediated products, a real household smoke on the actual runtime path is often worth more than another layer of local abstraction.
2. Milestone closeout needs a human review pass even when archival automation exists, especially when audit status is `tech_debt`.

### Cost Observations
- Model mix: n/a
- Sessions: n/a
- Notable: v1.1 shipped in one concentrated iteration with 85 changed files and 69 passing tests across 4 packages, but the last few percent still lived in rollout validation and archival polish.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | n/a | 7 | Established the full browser-worker, relay, observability, and internal-access baseline |
| v1.1 | n/a | 2 | Added a host-native fallback and explicit fresh-chat bootstrap to make real household rollout viable |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 53 passing tests across 3 packages | milestone-wide behavior coverage with targeted live smoke checks | 0 |
| v1.1 | 69 passing tests across 4 packages | strong automated coverage plus manual live validation for host/browser and external UI behavior | 1 (`services/host-controller`) |

### Top Lessons (Verified Across Milestones)

1. Live runtime smoke is essential whenever the product depends on real browser behavior or external UI contracts.
2. Keep the control plane stable while swapping worker runtimes so rollout hardening does not become a product rewrite.
