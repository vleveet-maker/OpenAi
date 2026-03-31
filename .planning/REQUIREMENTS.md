# Requirements: v1.2 Rollout Stability

**Defined:** 2026-03-28
**Core Value:** A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.

## v1.2 Requirements

### Internal Orchestration

- [x] **ORCH-01**: Operator can start the proxied host-native household pool from the internal admin surface without opening PowerShell manually
- [x] **ORCH-02**: Operator can stop the proxied host-native household pool from the internal admin surface and see the workers return to expected statuses
- [x] **ORCH-03**: Internal admin shows clear lifecycle progress and failure reasons when host-pool start or stop actions fail

### ChatGPT UI Stability

- [x] **STAB-01**: Proxied live relay succeeds on all three household workers against the current ChatGPT UI, including `dad`
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

- [x] **ADST-01**: At least one worker can recover or confirm valid ChatGPT auth in `alternate_desktop` after visible auth and return to routine non-visible operation without reopening a routine visible browser window
- [x] **ADST-02**: At least one worker can pass the current `Temporary Chat` confirmation, preferred-model selection, and composer unlock path in `alternate_desktop` so the canonical proof reports `phase11Ready=true`
- [x] **ADST-03**: Operator and control-plane evidence distinguish `auth_required`, bootstrap selector drift, and assignment-timeout tails clearly enough to decide whether `Phase 11` can proceed

### Alternate Desktop Navigation Rescue And Auth Renewal

- [x] **ADNR-01**: At least one non-auth-blocked alternate-desktop worker can recover from the current `bootstrap_navigation_failed` tail and reach a usable fresh-chat bootstrap path without reopening routine visible browser windows
- [ ] **ADNR-02**: `dad` can be renewed through visible auth and revalidated in `alternate_desktop` through an explicit control-plane flow instead of staying stuck as `bootstrap_auth_required`
- [x] **ADNR-03**: Phase 10.5 ends with an evidence-backed worker-by-worker decision that either yields at least one `phase11Ready=true` worker or records why the selected runtime still cannot unblock `Phase 11`

### Repeatable Alternate Desktop Stability Gate

- [x] **RSG-01**: A non-visible validation run can target one named worker deterministically without depending on global session assignment luck or producing `assignment_timeout` false negatives
- [ ] **RSG-02**: At least one alternate-desktop worker can produce repeatable proof, defined for `v1.2` as two consecutive successful non-visible validations with a real relay pass and a reset on any auth/bootstrap/relay failure
- [x] **RSG-03**: Internal operator surfaces and milestone state expose whether a worker is still provisional or has reached the repeatable stability gate, and `Phase 11` only unblocks from that repeated proof

### Alternate Desktop Repeatability Rescue

- [ ] **ADRR-01**: At least one non-auth-blocked alternate-desktop worker can escape the current `bootstrap_navigation_failed @ navigation` tail through a bounded navigation rescue ladder, or emit branch-level failure evidence that names exactly which rescue branch still failed

### Compact Visible Runtime Rollout

- [x] **CVRT-01**: Internal admin and host-control paths can intentionally run household workers in `compact visible` mode with small corner windows and truthful runtime reporting instead of treating it as an ad-hoc fallback
- [x] **CVRT-02**: Compact-visible browser start and stop flows suppress the Edge `Restore pages` crash popup and clear only crash-recovery artifacts, without deleting durable login state
- [x] **CVRT-03**: Compact visible runtime produces written repeatability proof that either yields at least one rollout-usable worker or records why Phase 11 must still remain blocked

### Remote Server Extraction

- [x] **REMOTE-01**: The proven relay/session/bootstrap module can run as a standalone service on the dedicated SSH server without depending on the operator desktop being open
- [x] **REMOTE-02**: The remote relay service starts automatically after reboot through the host service manager and exposes one documented status or restart path
- [x] **REMOTE-03**: An authenticated HTTP API can start a fresh dialog, continue an existing dialog, and return the assistant reply to a remote caller
- [x] **REMOTE-04**: Phase 10.6 ends with an explicit topology and compatibility verdict about how the remote relay service reaches the browser-runtime layer, without silently downgrading to an unproven headless path

### Remote Relay Public Readiness

- [x] **EXTAPI-01**: The dedicated server exposes a repeatable verification path for process health, ingress health, autostart status, and current topology truth so the operator can tell whether the remote relay is genuinely up
- [x] **EXTAPI-02**: Every official worker session can be checked against the real remote-relay topology and classified clearly as usable, auth_required, bootstrap_failed, or relay_failed instead of relying on stale local assumptions
- [x] **EXTAPI-03**: The remote relay has one deliberate external ingress path for non-household callers, rather than depending on raw `:4010` behavior or ad-hoc SSH forwarding as the only client entry
- [x] **EXTAPI-04**: The external API contract, auth model, and operator docs are explicit enough that other clients can consume the service without exposing internal admin routes, runtime secrets, or hidden infrastructure assumptions

### MikroTik Public Ingress And NAT Hardening

- [x] **MTIK-01**: The project can prove which MikroTik services, interfaces, IPs, and firewall/NAT rules currently control public ingress to the relay server
- [x] **MTIK-02**: One deliberate public NAT path forwards the chosen relay edge to `192.168.88.2` instead of leaving the public path ambiguous
- [x] **MTIK-03**: Router management exposure is hardened so the same public path is not also a loose admin surface
- [x] **MTIK-04**: External proof shows that the public IP now reaches the server `nginx` edge, or records the exact remaining router/upstream blocker

### Dedicated Windows Browser Block Deployment

- [x] **WINBLK-01**: The seven-worker browser runtime (`dad`, `wife`, `shared-1`, `shared-2`, `shared-3`, `shared-4`, `shared-5`) can be packaged and deployed onto a dedicated Windows Server block instead of staying tied to the current operator laptop
- [x] **WINBLK-02**: The Windows block has prepared deployment assets for interactive-logon autostart, reverse SSH tunnels, and operator manual login/reauth without storing secrets in tracked repo files
- [x] **WINBLK-03**: The Linux relay/API keeps the same deliberate public contract while reaching the runtime through the Windows block, rather than pretending Linux now hosts the browsers
- [x] **WINBLK-04**: The phase ends with a direct seven-worker Windows block matrix that shows current usable vs flaky profiles explicitly instead of assuming all seven accounts are equally stable

### Local-Machine Rollout Smoke Confidence

- [x] **LSMOKE-01**: One repeatable local operator command can run a worker-by-worker `compact visible` smoke path across the official seven-worker set without leaving browser windows hanging open afterward
- [x] **LSMOKE-02**: The latest local-machine smoke result is captured as an explicit seven-worker matrix with `usable` / `unusable` truth and branch-level failure detail where needed
- [x] **LSMOKE-03**: Operator docs explain how to rerun the local-machine smoke snapshot while the server-hosted runtime migration remains paused or busy, without pretending that local confidence replaces server migration

### Shared-2 And Shared-4 Bootstrap Timeout Mitigation

- [x] **BTMIT-01**: The repeated `worker_chat_bootstrap_timeout` on `shared-2` and `shared-4` is classified from real browser-surface evidence instead of being treated as generic flakiness
- [x] **BTMIT-02**: A bounded mitigation lands in the bootstrap path or worker recovery path, and its branch behavior is covered by targeted tests
- [x] **BTMIT-03**: The worker matrix and docs are updated with a final verdict for `shared-2` and `shared-4`, whether that verdict is recovered, degraded, or manual-recovery-required

### Deployed Windows Server Account-Preserving Stabilization

- [x] **WSAFE-01**: The already-deployed Windows Server browser block with nine logged-in accounts can be audited, version-mapped, and backed up without deleting profiles, clearing cookies, or forcing relogin
- [x] **WSAFE-02**: Any code or config uplift for that server is staged through a non-destructive canary path with one-worker and small-subset validation before touching the full nine-worker pool
- [x] **WSAFE-03**: Public API enablement on the deployed Windows Server block is prepared as a shadow or staged cutover path with explicit rollback, instead of an in-place mass switch that could strand all logged-in workers
- [x] **WSAFE-04**: The final evidence for this phase records a truthful nine-worker matrix, current deployment provenance, backup/rollback assets, and a cutover verdict that prioritizes preserving the existing accounts over speed

### Windows Server Public API Edge Reconciliation

- [ ] **WEDGE-01**: The deployed Windows Server has one explicit preserve-first audit of the current public edge, including `Caddy`, listeners `80/443/4010/4040`, config ownership, and rollback-safe backup paths
- [ ] **WEDGE-02**: A shadow Windows-side public API path can be activated and proven locally on the deployed server with an allowlisted canary worker before any promoted public cutover touches the broader 9-account pool
- [ ] **WEDGE-03**: One deliberate promoted edge path reconciles the deployed Windows-side API with the current `Caddy` and MikroTik topology while keeping `host-controller` and worker ports private
- [x] **WEDGE-04**: The phase ends with external proof for `healthz`, `v1/models`, and one canary `v1/chat/completions` request, or with one precise preserve-first blocker verdict instead of another ambiguous edge state

### Direct Windows Caddy Edge Cutover And Canary Proof

- [x] **WCUT-01**: The deployed Windows Server gets one direct host-level preserve-first backup and audit pass that confirms the active `Caddy` service/config path, listener ownership, and exact rollback point before any new public edge proof
- [x] **WCUT-02**: A shadow `Caddy -> 127.0.0.1:4011` path is proven on the deployed Windows host with allowlisted canary `shared-6` without broad-starting or relogging the rest of the 9-account pool
- [x] **WCUT-03**: A promoted `Caddy -> 127.0.0.1:4010` path is either proven or rolled back cleanly on the deployed Windows host while `4040` and worker-agent ports remain private
- [x] **WCUT-04**: Outside-client proof against `77.66.186.75` confirms `healthz`, `v1/models`, and one canary `v1/chat/completions`, or records one exact preserve-first blocker verdict after the direct host-level pass

### Windows HTTPS And Independent Outside Chat Proof Finalization

- [x] **WTLS-01**: The exact public HTTPS/public-contract truth is recorded for the deployed Windows `Caddy` edge, including whether the intended client identifier is raw IP or hostname, what certificate path exists, and what rollback point protects the already-working HTTP edge
- [x] **WTLS-02**: The deliberate public edge can prove `healthz` and `v1/models` on the final intended contract, or record one exact TLS/public-contract blocker without regressing the preserve-first HTTP path
- [x] **WTLS-03**: One truly independent outside-client `POST /v1/chat/completions` succeeds through the final public edge on canary `shared-6`, or reduces the remaining uncertainty to one exact blocker class
- [x] **WTLS-04**: The phase ends with one explicit verdict (`safe_to_promote`, `safe_but_hold`, or `hold_preserve_accounts`) that directly controls whether `Phase 11` can resume

### Public Edge Ownership And Split-Ingress Reconciliation

- [x] **PEDGE-01**: The project has one explicit ownership map for public `77.66.186.75` across MikroTik/NAT, Ubuntu `nginx`, and the preserved Windows `Caddy` host, so the active public responder is not inferred from partial probes
- [x] **PEDGE-02**: The public client contract is reconciled to one deliberate owner path, either by routing public traffic to the preserved Windows edge or by recording one exact upstream ownership blocker without touching the 9 live accounts broadly
- [x] **PEDGE-03**: Preserve-first proof on canary `shared-6` confirms that the reconciled public owner serves `healthz`, `v1/models`, and one worker-backed chat path while `4040` and worker-agent ports remain private
- [x] **PEDGE-04**: The phase ends with one exact verdict that says whether `Phase 11` can resume, or whether rollout is still blocked only by public-edge ownership outside the browser/runtime layer

### Ubuntu Public Owner Reassignment And Windows Edge Unification

- [x] **UOWN-01**: The project has one preserve-first execution strategy that keeps Ubuntu as the deliberate public owner of `77.66.186.75`, preserves unrelated Ubuntu hostnames, and records a rollback-safe baseline before live reassignment
- [x] **UOWN-02**: The public contract on `77.66.186.75` is deliberately unified through the Ubuntu-owned path instead of remaining split between the conflicting Ubuntu responder and the preserved Windows `Caddy` edge
- [x] **UOWN-03**: Canary `shared-6` proves `healthz`, `v1/models`, and one worker-backed chat path through the unified public owner, or the phase records one exact blocker after the owner reassignment attempt
- [x] **UOWN-04**: The phase ends with one explicit verdict that says whether `Phase 11` can resume or remains blocked by one exact remaining owner-path issue

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
| STAB-01 | Phase 10 / 10.5.1.1.1 | Complete |
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
| ADST-01 | Phase 10.4 | Complete |
| ADST-02 | Phase 10.4 | Complete |
| ADST-03 | Phase 10.4 | Complete |
| ADNR-01 | Phase 10.5 | Complete |
| ADNR-02 | Phase 10.5.1.1 | Pending |
| ADNR-03 | Phase 10.5 | Complete |
| RSG-01 | Phase 10.5.1 | Complete |
| RSG-02 | Phase 10.5.1.1 | Pending |
| RSG-03 | Phase 10.5.1 | Complete |
| ADRR-01 | Phase 10.5.1.1 | Pending |
| CVRT-01 | Phase 10.5.1.1.1 | Complete |
| CVRT-02 | Phase 10.5.1.1.1 | Complete |
| CVRT-03 | Phase 10.5.1.1.1 | Complete |
| REMOTE-01 | Phase 10.6 | Complete |
| REMOTE-02 | Phase 10.6 | Complete |
| REMOTE-03 | Phase 10.6 | Complete |
| REMOTE-04 | Phase 10.6 | Complete |
| EXTAPI-01 | Phase 10.6.1 | Complete |
| EXTAPI-02 | Phase 10.6.1 | Complete |
| EXTAPI-03 | Phase 10.6.1 / 10.6.1.1 | Complete |
| EXTAPI-04 | Phase 10.6.1 | Complete |
| MTIK-01 | Phase 10.6.1.1 | Complete |
| MTIK-02 | Phase 10.6.1.1 | Complete |
| MTIK-03 | Phase 10.6.1.1 | Complete |
| MTIK-04 | Phase 10.6.1.1 | Complete |
| WINBLK-01 | Phase 10.6.1.2 | Complete |
| WINBLK-02 | Phase 10.6.1.2 | Complete |
| WINBLK-03 | Phase 10.6.1.2 | Complete |
| WINBLK-04 | Phase 10.6.1.2 | Complete |
| LSMOKE-01 | Phase 10.6.1.2.1 | Complete |
| LSMOKE-02 | Phase 10.6.1.2.1 | Complete |
| LSMOKE-03 | Phase 10.6.1.2.1 | Complete |
| BTMIT-01 | Phase 10.6.1.2.1.1 | Complete |
| BTMIT-02 | Phase 10.6.1.2.1.1 | Complete |
| BTMIT-03 | Phase 10.6.1.2.1.1 | Complete |
| WSAFE-01 | Phase 10.6.1.2.2 | Complete |
| WSAFE-02 | Phase 10.6.1.2.2 | Complete |
| WSAFE-03 | Phase 10.6.1.2.2 | Complete |
| WSAFE-04 | Phase 10.6.1.2.2 | Complete |
| WEDGE-01 | Phase 10.6.1.2.2.1 | Pending |
| WEDGE-02 | Phase 10.6.1.2.2.1 | Pending |
| WEDGE-03 | Phase 10.6.1.2.2.1 | Pending |
| WEDGE-04 | Phase 10.6.1.2.2.1 | Complete |
| WCUT-01 | Phase 10.6.1.2.2.1.1 | Complete |
| WCUT-02 | Phase 10.6.1.2.2.1.1 | Complete |
| WCUT-03 | Phase 10.6.1.2.2.1.1 | Complete |
| WCUT-04 | Phase 10.6.1.2.2.1.1 | Complete |
| WTLS-01 | Phase 10.6.1.2.2.1.1.1 | Complete |
| WTLS-02 | Phase 10.6.1.2.2.1.1.1 | Complete |
| WTLS-03 | Phase 10.6.1.2.2.1.1.1 | Complete |
| WTLS-04 | Phase 10.6.1.2.2.1.1.1 | Complete |
| PEDGE-01 | Phase 10.6.1.2.2.1.1.1.1 | Complete |
| PEDGE-02 | Phase 10.6.1.2.2.1.1.1.1 | Complete |
| PEDGE-03 | Phase 10.6.1.2.2.1.1.1.1 | Complete |
| PEDGE-04 | Phase 10.6.1.2.2.1.1.1.1 | Complete |
| UOWN-01 | Phase 10.6.1.2.2.1.1.1.1.1 | Complete |
| UOWN-02 | Phase 10.6.1.2.2.1.1.1.1.1 | Complete |
| UOWN-03 | Phase 10.6.1.2.2.1.1.1.1.1 | Complete |
| UOWN-04 | Phase 10.6.1.2.2.1.1.1.1.1 | Complete |
| CONF-01 | Phase 11 | Pending |
| CONF-02 | Phase 11 | Pending |

**Coverage:**
- v1.2 requirements: 68 total
- Mapped to phases: 68
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-31 after planning the Ubuntu public-owner unification follow-up*
