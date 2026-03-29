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
- [x] **STAB-02**: Fresh-chat bootstrap succeeds against the current `Temporary Chat` and reasoning-model picker UI on a logged-in worker
- [x] **STAB-03**: Selector and drift-sensitive browser automation paths are centralized enough that relay and bootstrap fixes do not require hunting across unrelated files

### Hidden Runtime Transition

- [x] **HIDE-01**: Operator can intentionally start one host worker in a visible interactive auth mode for first login or reauthentication and then switch that same durable profile back into hidden runtime
- [x] **HIDE-02**: Pool start and routine household relay use hidden runtime by default and do not open visible browser windows on the operator desktop
- [x] **HIDE-03**: If a worker loses ChatGPT auth in hidden runtime after manual login, the system surfaces explicit manual-reauth plus reliability-review status instead of silently reopening windows or treating the worker as healthy

### Hidden Runtime Reliability Review

- [x] **RREV-01**: The project has a live-evidence-backed answer on whether the current hidden/headless runtime can reach a usable ChatGPT session after manual login on the same durable worker profile
- [x] **RREV-02**: Pool and worker control-plane status reflects real runtime state closely enough that rollout decisions are not made on false `ready`, false `degraded`, or stale `idle` signals
- [x] **RREV-03**: If the current hidden runtime is not viable, the milestone chooses and documents a concrete alternative browser runtime path before rollout-confidence work continues

### Alternative Non-Visible Native Runtime

- [x] **NVRT-01**: A replacement steady-state native browser runtime can run outside the operator's main desktop while staying in the same Windows login context and reusing the same durable browser profile that was authenticated visibly
- [x] **NVRT-02**: Internal admin, control-api, and host-controller can transition a worker from `visible_auth` into the selected replacement non-visible native runtime instead of the rejected `hidden_runtime` path
- [x] **NVRT-03**: The project records a live evidence-backed accept/reject decision for the selected replacement non-visible native runtime before `Phase 11` rollout smoke resumes

### Alternate Desktop Stabilization

- [ ] **ADST-01**: At least one worker can recover or confirm valid ChatGPT auth in `alternate_desktop` after visible auth and return to routine non-visible operation without reopening a routine visible browser window
- [ ] **ADST-02**: At least one worker can pass the current `Temporary Chat` confirmation, preferred-model selection, and composer unlock path in `alternate_desktop` so the canonical proof reports `phase11Ready=true`
- [ ] **ADST-03**: Operator and control-plane evidence distinguish `auth_required`, bootstrap selector drift, and assignment-timeout tails clearly enough to decide whether `Phase 11` can proceed

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
| STAB-01 | Phase 10 | Partial |
| STAB-02 | Phase 10 | Complete |
| STAB-03 | Phase 10 | Complete |
| HIDE-01 | Phase 10.1 | Complete |
| HIDE-02 | Phase 10.1 | Complete |
| HIDE-03 | Phase 10.1 | Complete |
| RREV-01 | Phase 10.2 | Complete |
| RREV-02 | Phase 10.2 | Complete |
| RREV-03 | Phase 10.2 | Complete |
| NVRT-01 | Phase 10.3 | Complete |
| NVRT-02 | Phase 10.3 | Complete |
| NVRT-03 | Phase 10.3 | Complete |
| ADST-01 | Phase 10.4 | Pending |
| ADST-02 | Phase 10.4 | Pending |
| ADST-03 | Phase 10.4 | Pending |
| CONF-01 | Phase 11 | Pending |
| CONF-02 | Phase 11 | Pending |

**Coverage:**
- v1.2 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after completing Phase 10.3 Alternative non-visible native browser runtime design*
