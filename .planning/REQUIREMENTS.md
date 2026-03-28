# Requirements: One Hour With My ChatGPT

**Defined:** 2026-03-26
**Core Value:** A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.

## v1 Requirements

### Worker Pool

- [x] **WORK-01**: Admin can run multiple named browser workers for household or family use
- [x] **WORK-02**: Each worker runs in its own dedicated Docker container
- [x] **WORK-03**: Each worker exposes one of the statuses `starting`, `ready`, `busy`, `disconnected`, or `reauth_required`
- [x] **WORK-04**: Each worker keeps a persistent browser profile across container restarts

### Session Access

- [x] **SESS-01**: User can start a 60-minute session only when an assigned or available worker is `ready`
- [x] **SESS-02**: User stays attached to the same worker for the full active session
- [x] **SESS-03**: User sees remaining session time update throughout the active session
- [x] **SESS-04**: User can end the session manually, and new message submission is blocked after manual end or expiry

### Chat Relay

- [x] **CHAT-01**: User can send a text message from the application to the assigned worker's ChatGPT browser
- [x] **CHAT-02**: User receives the corresponding assistant reply back in the same conversation thread
- [x] **CHAT-03**: User sees a pending or streaming state while a reply is being generated
- [x] **CHAT-04**: User can view the full message history for the current active session

### Reliability

- [x] **RELY-01**: User sees a clear error state when message delivery or response capture fails on the worker
- [x] **RELY-02**: System retries transient relay failures without creating duplicate user messages
- [x] **RELY-03**: User can reconnect to an active session after a temporary network or application interruption and continue on the same worker

### Admin Operations

- [x] **ADMN-01**: Admin can manually authenticate each worker into the required ChatGPT account before user sessions begin
- [x] **ADMN-02**: Admin can see status for every worker in the pool from an internal admin surface or API
- [x] **ADMN-03**: Admin can restart an individual worker and recover service visibility after a failure
- [x] **ADMN-04**: Admin can open an internal-only recovery path to a worker for login or reauthentication

### Security

- [x] **SECU-01**: End users can access ChatGPT only through the approved application surface, not the raw worker browser UI
- [x] **SECU-02**: ChatGPT credentials, cookies, browser profiles, and session artifacts are stored only on server-side durable storage
- [x] **SECU-03**: Worker recovery endpoints and admin controls are reachable only from the trusted internal admin surface

### Observability

- [x] **OBSV-01**: Operator can inspect recent worker lifecycle events and session failures from the internal admin surface
- [x] **OBSV-02**: System exposes health signals that container or host monitors can consume without parsing the browser UI

## v2 Requirements

### Entitlements

- **BILL-01**: User can purchase a 60-minute session inside the application
- **BILL-02**: System grants or revokes session entitlement automatically after payment or refund

### Rich Interaction

- **RICH-01**: User can upload files or images into the remote ChatGPT session
- **RICH-02**: User can use voice input or voice output during a session

### Public Scale

- **SCAL-01**: System can support multiple households or tenants with isolated worker pools and quotas
- **SCAL-02**: System can scale worker containers by demand and cost policy rather than a fixed family pool

### Automation

- **AUTO-01**: System can automatically recover workers from safe known failure states
- **AUTO-02**: System can wake or sleep idle workers by policy without breaking login persistence

## Out of Scope

| Feature | Reason |
|---------|--------|
| Direct raw browser or remote desktop access for end users | Breaks the security boundary and the thin-client product shape |
| Automated ChatGPT login or CAPTCHA bypass | Manual auth is a deliberate safety and reliability choice for v1 |
| Public SaaS for third-party tenants | The current project targets a small private household deployment |
| Autonomous agent or tool execution inside ChatGPT | Different problem from delivering a timed family chat relay |
| Fine-tuning or custom model hosting | Product is about access to existing ChatGPT browser sessions, not model ownership |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| WORK-01 | Phase 1 | Satisfied |
| WORK-02 | Phase 1 | Satisfied |
| WORK-03 | Phase 1 | Satisfied |
| WORK-04 | Phase 1 | Satisfied |
| ADMN-01 | Phase 1 | Satisfied |
| ADMN-02 | Phase 1 | Satisfied |
| ADMN-04 | Phase 5.1 | Satisfied |
| SECU-02 | Phase 1 | Satisfied |
| SECU-03 | Phase 5.1 | Satisfied |
| SESS-01 | Phase 2 | Satisfied |
| SESS-02 | Phase 2 | Satisfied |
| SESS-03 | Phase 2 | Satisfied |
| SESS-04 | Phase 2 | Satisfied |
| CHAT-01 | Phase 3 | Satisfied |
| CHAT-02 | Phase 3 | Satisfied |
| CHAT-03 | Phase 3 | Satisfied |
| CHAT-04 | Phase 3 | Satisfied |
| RELY-01 | Phase 4 | Satisfied |
| RELY-02 | Phase 4 | Satisfied |
| RELY-03 | Phase 4 | Satisfied |
| ADMN-03 | Phase 4 | Satisfied |
| SECU-01 | Phase 5 | Satisfied |
| OBSV-01 | Phase 5 | Satisfied |
| OBSV-02 | Phase 5 | Satisfied |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-28 after Phase 05.1 execution and verification*
