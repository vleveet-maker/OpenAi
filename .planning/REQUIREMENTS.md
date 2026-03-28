# Requirements: v1.2 Rollout Stability

**Defined:** 2026-03-28
**Core Value:** A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.

## v1.2 Requirements

### Internal Orchestration

- [x] **ORCH-01**: Operator can start the proxied host-native household pool from the internal admin surface without opening PowerShell manually
- [x] **ORCH-02**: Operator can stop the proxied host-native household pool from the internal admin surface and see the workers return to expected statuses
- [x] **ORCH-03**: Internal admin shows clear lifecycle progress and failure reasons when host-pool start or stop actions fail

### ChatGPT UI Stability

- [ ] **STAB-01**: Proxied live relay succeeds on all three household workers against the current ChatGPT UI, including `dad`
- [ ] **STAB-02**: Fresh-chat bootstrap succeeds against the current `Temporary Chat` and reasoning-model picker UI on a logged-in worker
- [ ] **STAB-03**: Selector and drift-sensitive browser automation paths are centralized enough that relay and bootstrap fixes do not require hunting across unrelated files

### Rollout Confidence

- [ ] **CONF-01**: Operator can run a repeatable rollout smoke flow that checks worker readiness, fresh-chat bootstrap, and at least one live relay
- [ ] **CONF-02**: The latest rollout smoke result is visible in internal operator surfaces or logs before the household starts using the pool again

## Future Requirements

### Product Expansion

- **BILL-01**: Household access rights and billing or entitlement rules can be enforced before a new timed session begins
- **CHAT-01**: The end-user app can present a standard mobile chat-bot UX with a chat list and a create-new-chat flow instead of only the current shared-session screen
- **CHAT-02**: Starting a new app chat claims an available worker and opens a fresh `Temporary Chat`, while continuing an existing app chat stays pinned to its current underlying browser conversation
- **MEDIA-01**: The end-user app can attach at least one image to a message and relay it into the active underlying browser conversation
- **MEDIA-02**: Voice, file, or richer attachment workflows can be added later without breaking the bounded-session model

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automated CAPTCHA bypass or stealth anti-detection stacks | The rollout stability milestone keeps manual login and avoids building the product around anti-bot evasion |
| Replacing browser relay with the OpenAI API | This milestone focuses on stabilizing the current browser-mediated product shape, not changing the core architecture |
| Billing, entitlements, or public SaaS access control | Valuable later, but not the biggest operational blocker right now |
| Major UX redesign unrelated to rollout stability | This milestone is about trust and operability, not broad product expansion |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ORCH-01 | Phase 9 | Complete |
| ORCH-02 | Phase 9 | Complete |
| ORCH-03 | Phase 9 | Complete |
| STAB-01 | Phase 10 | Pending |
| STAB-02 | Phase 10 | Pending |
| STAB-03 | Phase 10 | Pending |
| CONF-01 | Phase 11 | Pending |
| CONF-02 | Phase 11 | Pending |

**Coverage:**
- v1.2 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after completing Phase 9 internal host-pool orchestration*
