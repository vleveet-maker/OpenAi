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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | n/a | 7 | Established the full browser-worker, relay, observability, and internal-access baseline |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 53 passing tests across 3 packages | milestone-wide behavior coverage with targeted live smoke checks | 0 |

### Top Lessons (Verified Across Milestones)

1. None yet - v1.0 is the first archived milestone.
