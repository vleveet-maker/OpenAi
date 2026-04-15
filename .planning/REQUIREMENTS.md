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

- [x] **CONF-01**: Operator can run a repeatable rollout smoke flow that checks worker readiness, fresh-chat bootstrap, and at least one live relay
- [x] **CONF-02**: The latest rollout smoke result is visible in internal operator surfaces or logs before the household starts using the pool again

### Deployed Windows Readiness Recovery And Reconnect Stabilization

- [x] **WREC-01**: The deployed Windows browser-block can capture one preserve-first readiness-recovery snapshot that records host-controller truth, internal worker truth, and exact worker blocker classes instead of another opaque `disconnected` count
- [x] **WREC-02**: Operator has one bounded reconnect flow that can recover named preserved workers in compact-visible runtime, keep successful workers running, stop failed workers again, and avoid profile deletion, cookie clearing, blind full-pool restart, or mass relogin as the default path
- [x] **WREC-03**: The latest readiness-recovery result is visible through an internal operator surface or durable file-backed artifact before rollout-smoke reruns
- [x] **WREC-04**: After readiness recovery, the project reruns the proven rollout smoke and records one explicit verdict that says whether household rollout can resume or remains held by exact blocker workers

### Deployed Windows Post-Recovery Smoke Regression Investigation And Stabilization

- [x] **WREG-01**: The project can capture one durable stage-by-stage post-recovery regression artifact that records host-controller truth, internal worker truth, and per-worker deltas across recovery, canary start/stop, and smoke settle instead of only the final `0/9 ready`, `9/9 disconnected` snapshot
- [x] **WREG-02**: The repo copy of the relay, recovery, and smoke scripts is brought back into explicit parity with the deployed-host execution path through one recorded compatibility version so Phase 13 evidence is not based on hidden script drift
- [x] **WREG-03**: The latest post-recovery smoke regression or stabilization result is visible through an internal operator surface or durable file-backed artifact before any new rollout claim
- [x] **WREG-04**: The phase ends with one explicit verdict that says whether a bounded stabilization mode keeps the preserved nine-account pool healthy through smoke or whether rollout remains held by the exact first regression stage and blocker evidence

### Deployed Windows Zero-Ready Post-Recovery Baseline And Public-Canary 502 Root-Cause Investigation

- [x] **WROOT-01**: The project can capture one durable zero-ready baseline artifact that records host-controller truth, internal worker truth, and exact per-worker blocker classes instead of only saying `0/9 ready`
- [x] **WROOT-02**: The project can capture one hop-aware canary artifact that names the first failing hop across Windows loopback API, Windows edge with forced public `Host`, and the Ubuntu public owner instead of only returning an opaque public `502`
- [x] **WROOT-03**: The latest zero-ready root-cause result is visible through an internal operator surface or durable file-backed artifact before any new rollout claim
- [x] **WROOT-04**: The phase ends with one explicit verdict that names the dominant worker blocker class plus the first failing public-canary hop, or honestly keeps rollout on hold if the evidence is still inconclusive

### Deployed Windows Disconnected Baseline And Forced-Host Edge Remediation

- [x] **WREM-01**: The project can run one preserve-first remediation flow that records before/after worker truth for the live disconnected baseline and either restores named workers or records exact remaining blocker classes without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin
- [x] **WREM-02**: The remediation artifact records the post-repair truth for `windows_edge_forced_host` and `ubuntu_public_owner` separately, so the edge branch no longer collapses back into one vague public `502`
- [x] **WREM-03**: The latest disconnected-baseline remediation result is visible through an internal operator surface or durable file-backed artifact before the smoke rerun begins
- [x] **WREM-04**: After remediation, the project reruns the proven rollout smoke and records one explicit verdict that says whether the host is `remediated_through_smoke` or still `hold_rollout`

### Deployed Windows Runtime Parity Sync And Post-Remediation Degraded Smoke Stabilization

- [x] **WPAR-01**: The repo copy of the runtime-critical `control-api` and PowerShell files is brought back into explicit parity with the deployed-host execution path through one recorded compatibility version, so new archives no longer depend on manual server-only hotfixes
- [x] **WPAR-02**: The project can capture one durable post-remediation degraded-smoke stabilization artifact that records pre-smoke readiness, final smoke readiness, final pool status, and public-canary truth instead of only another terminal `1/9 ready` note
- [x] **WPAR-03**: The latest post-remediation degraded-smoke stabilization result is visible through an internal operator surface or durable file-backed artifact before any new rollout claim
- [x] **WPAR-04**: The phase ends with one explicit verdict that says whether parity-synced bounded stabilization produced `stabilized_through_smoke` or whether rollout remains `hold_rollout`

### Deployed Windows Post-Stabilization Degraded Runtime And Repeated Public-Canary 502 Investigation

- [x] **WRTI-01**: The project can capture one durable post-stabilization runtime-investigation artifact that correlates ready-count changes with host-controller truth, internal worker truth, and local listener/process evidence instead of only another degraded snapshot
- [x] **WRTI-02**: The project can record the repeated public-canary `502` branch hop-by-hop together with canary runtime facts, so the next remediation phase can target the real failing layer instead of treating `502` as one opaque symptom
- [x] **WRTI-03**: The latest post-stabilization runtime investigation result is visible through an internal operator surface or durable file-backed artifact before any new remediation claim
- [x] **WRTI-04**: The phase ends with one explicit verdict that names the dominant runtime blocker and first failing hop as `runtime_blocker_confirmed`, or honestly keeps `hold_rollout` if the evidence is still inconclusive

### Deployed Windows Disconnected Runtime Remediation, Forced-Host Edge Repair, And Runtime Parity Resync

- [x] **WREP-01**: The repo copy of the runtime-critical PowerShell and `control-api` files is brought back into explicit parity with the deployed-host execution path through one recorded compatibility version, so the next remediation archive no longer depends on manual server-only compatibility fixes
- [x] **WREP-02**: The project can run one preserve-first disconnected-runtime remediation flow that records before/after ready counts plus separate truth for `windows_edge_forced_host` and `ubuntu_public_owner` without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin
- [x] **WREP-03**: The latest disconnected-runtime remediation result is visible through an internal operator surface or durable file-backed artifact before the smoke rerun begins
- [x] **WREP-04**: After the parity-synced remediation run, the project reruns the proven rollout smoke and records one explicit verdict that says whether the host is `remediated_through_smoke` or still `hold_rollout`

### Deployed Windows Persistent Disconnected Runtime And Forced-Host Public-502 Remediation Follow-Up

- [x] **WFUP-01**: The project can run one canonical preserve-first follow-up harness on top of the Phase 18 parity-clean wrapper chain that records persistent disconnected-runtime truth plus forced-host/public-owner truth under one explicit compatibility version instead of another ad-hoc live command
- [x] **WFUP-02**: The project can capture one durable follow-up artifact that records before/after ready counts plus separate truth for `windows_edge_forced_host` and `ubuntu_public_owner` without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin
- [x] **WFUP-03**: The latest persistent disconnected-runtime follow-up result is visible through an internal operator surface or durable file-backed artifact before the smoke rerun begins
- [x] **WFUP-04**: After the follow-up run, the project reruns the proven rollout smoke and records one explicit verdict that says whether the host is `stabilized_through_smoke` or still `hold_rollout`

### Deployed Windows Runtime Parity Backport And Persistent Disconnected-Runtime Public-502 Remediation

- [x] **WPARB-01**: The repo copy of the runtime-critical PowerShell and relay helper files is brought back into explicit parity with the deployed-host execution path under one recorded compatibility version, so the next archive no longer depends on manual server-only fixes
- [x] **WPARB-02**: The project can run one preserve-first parity-clean remediation flow that records before/after ready counts plus separate truth for `windows_edge_forced_host` and `ubuntu_public_owner` without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin
- [x] **WPARB-03**: The latest runtime parity backport remediation result is visible through an internal operator surface or durable file-backed artifact before the smoke rerun begins
- [x] **WPARB-04**: After the parity-clean remediation run, the project reruns the proven rollout smoke and records one explicit verdict that says whether the host is `remediated_through_smoke` or still `hold_rollout`

### Deployed Windows Disconnected Runtime And Forced-Host/Public-Owner Remediation After Parity-Clean Proof

- [x] **WPCP-01**: The project can run one preserve-first remediation flow after Phase 20 that records before/after truth for the still-disconnected `0/9 ready` baseline without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin
- [x] **WPCP-02**: The remediation artifact records separate post-remediation truth for `windows_edge_forced_host` and the public-owner `502` branch, so the first failing hop and any downstream owner failure remain explicit instead of collapsing into one vague public `502`
- [x] **WPCP-03**: The latest Phase 21 remediation result is visible through an internal operator surface or durable file-backed artifact before the smoke rerun begins
- [x] **WPCP-04**: After the Phase 21 remediation run, the project reruns the proven rollout smoke and records one explicit verdict that says whether the host is `remediated_through_smoke` or still `hold_rollout`

### Deployed Windows Post-Phase21 Disconnected Runtime And Forced-Host/Public-Owner 502 Remediation Follow-Up

- [x] **WPFU-01**: The project can run one preserve-first follow-up flow after Phase 21 that records before/after truth for the still-disconnected `0/9 ready` baseline without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin
- [x] **WPFU-02**: The follow-up artifact records loopback, `windows_edge_forced_host`, and the public-owner `502` branch separately, so the first failing hop and any downstream owner failure remain explicit instead of collapsing into one vague public `502`
- [x] **WPFU-03**: The latest Phase 22 follow-up result is visible through an internal operator surface or durable file-backed artifact before the smoke rerun begins
- [x] **WPFU-04**: After the Phase 22 follow-up run, the project reruns the proven rollout smoke and records one explicit verdict that says whether the host is `stabilized_through_smoke` or still `hold_rollout`

### Deployed Windows Post-Phase22 Smoke-Wrapper Parity Recovery And Persistent Disconnected-Runtime Forced-Host/Public-Owner 502 Remediation

- [x] **WSPR-01**: The repo and archive copy of the smoke-critical PowerShell chain can stay in explicit parity, including `test-rollout-smoke.ps1`, so the next archive does not roll the smoke wrapper backward before the rerun starts
- [x] **WSPR-02**: The project can run one preserve-first post-Phase-22 remediation flow that records before/after truth for the still-disconnected baseline plus loopback, `windows_edge_forced_host`, and public-owner status without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin
- [x] **WSPR-03**: The latest Phase 23 parity-remediation result is visible through an internal operator surface or durable file-backed artifact before the smoke rerun begins
- [x] **WSPR-04**: After the parity-clean Phase 23 remediation run, the project reruns the proven rollout smoke on the archive-overlaid smoke wrapper and records one explicit verdict that says whether parity recovered through smoke or still `hold_rollout`

### Deployed Windows Post-Phase23 Exact Smoke-Wrapper Compat Backport And Persistent Disconnected-Runtime Forced-Host/Public-Owner 502 Remediation

- [x] **WSCB-01**: The repo and archive copy of the exact smoke-critical PowerShell chain can carry the deployed-host-compatible behavior forward, including `probe-public-api.ps1`, `test-rollout-smoke.ps1`, and `remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1`, so the next overlay no longer depends on a live-only smoke-wrapper edit before smoke starts
- [x] **WSCB-02**: The project can run one preserve-first post-Phase-23 remediation flow that records before/after truth for the still-disconnected baseline plus loopback, `windows_edge_forced_host`, and public-owner status without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin
- [x] **WSCB-03**: The latest Phase 24 exact smoke-wrapper compat remediation result is visible through an internal operator surface or durable file-backed artifact before the smoke rerun begins
- [x] **WSCB-04**: After the exact compat-backported Phase 24 remediation run, the project reruns the proven rollout smoke on the archive-overlaid smoke wrapper and records one explicit verdict that says whether compat was backported through smoke or still `hold_rollout`

### Deployed Windows Post-Phase24 Live-Fix Smoke-Wrapper Backport And Persistent Disconnected-Runtime Forced-Host/Public-Owner 503 Remediation

- [x] **WLFB-01**: The repo and archive copy of the deployment-critical chain reflects the exact live tunnel, task, and topology fixes, including `start-reverse-tunnels.ps1`, `register-browser-block-tasks.ps1`, package/docs assets, and the canonical Ubuntu `nginx -> 127.0.0.1:4010` upstream truth, so the next overlay no longer depends on server-only tunnel or topology edits
- [x] **WLFB-02**: The project can run one preserve-first Phase 25 external-readiness flow that records reverse-tunnel task health, Ubuntu tunnel-listener truth, ready-worker truth, and canonical public-upstream truth without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin
- [x] **WLFB-03**: The latest Phase 25 external-readiness result is visible through an internal operator surface or durable file-backed artifact before the authenticated external smoke claim
- [x] **WLFB-04**: After the live-fix-backed Phase 25 readiness run, the project reruns authenticated external smoke for `/healthz`, `/v1/models`, and `/v1/chat/completions` and records one explicit verdict `externally_ready` or `hold_rollout`

### Deployed Ubuntu Sync Recovery, Reverse-Tunnel Task Retention, And External Authenticated Smoke Restoration

- [x] **UTSR-01**: The repo-backed GitHub sync path can re-verify the Ubuntu public-owner host and confirm `80/443/8080 -> 127.0.0.1:4010` plus SSH/topology truth from live evidence instead of stale Windows-only assumptions
- [x] **UTSR-02**: The reverse-tunnel scheduled task on the Windows host can be retained in `Running` state long enough to preserve Ubuntu listeners `127.0.0.1:14021..14027` and `127.0.0.1:14040` and keep ready-worker truth explicit without destructive preserve-first violations
- [x] **UTSR-03**: The latest Phase 26 Ubuntu-sync and external-restoration result is visible through an internal operator surface or durable file-backed artifact before the final external claim
- [x] **UTSR-04**: Authenticated external smoke against `77.66.186.75` for `/healthz`, `/v1/models`, and `/v1/chat/completions` is rerun from a host that actually has a valid bearer token and ends with one explicit verdict `externally_ready` or `hold_rollout`

### Deployed Ubuntu SSH Recovery, Reverse-Tunnel Task Retention, And Authenticated External Smoke Completion

- [x] **URTS-01**: Repo-backed GitHub sync can recover or exactly classify Ubuntu SSH reachability, confirm the exact live Ubuntu repo path plus commit hash, and re-verify that public `80/443/8080` still proxy to `127.0.0.1:4010` instead of relying on stale topology assumptions
- [x] **URTS-02**: The reverse-tunnel scheduled task can stay `Running` long enough to preserve Ubuntu listeners `127.0.0.1:14021..14027` and `127.0.0.1:14040`, or the phase records the exact retention failure without collapsing it into vague external smoke noise
- [x] **URTS-03**: The latest Phase 27 Ubuntu SSH recovery result is visible through an internal operator surface or durable file-backed artifact before the final external claim
- [x] **URTS-04**: Authenticated external smoke against `77.66.186.75` for `/healthz`, `/v1/models`, and `/v1/chat/completions` is rerun from a host that actually has a valid bearer token and ends with one explicit verdict `externally_ready` or `hold_rollout`

### Local Proxy TLS Egress And Bounded Worker Bootstrap Stabilization For External Chat Readiness

- [x] **PXBT-01**: The project can capture one durable local artifact that proves whether proxy TLS egress on `127.0.0.1:7897` succeeds or still resets for `https://www.gstatic.com/generate_204` and `https://chatgpt.com`, instead of collapsing that branch into vague bootstrap failure
- [x] **PXBT-02**: One bounded preserve-first local worker flow can move or honestly reclassify `shared-2` from `disconnected` toward `ready`, while keeping profiles, cookies, local storage, and the rest of the worker pool untouched
- [x] **PXBT-03**: The latest Phase 28 local proxy/bootstrap result is visible through an internal operator surface or durable file-backed artifact before any external chat readiness claim
- [x] **PXBT-04**: Authenticated external smoke against `77.66.186.75` for `/healthz`, `/v1/models`, and `/v1/chat/completions` is rerun only after the bounded local runtime branch is explicit and ends with exactly one verdict `externally_ready` or `hold_rollout`

### Local Proxy TLS Transport Repair And Bounded Shared-2 Runtime Recovery For External Chat Completion

- [x] **PXTR-01**: The project can produce one durable local artifact that separates mixed proxy truth from pinned per-outbound truth and distinguishes `all_outbounds_failed`, `single_outbound_failed`, `auto_selection_failed`, and `runtime_unusable_after_transport` instead of collapsing everything into one vague bootstrap error
- [x] **PXTR-02**: One bounded preserve-first local worker flow can record both `proxy_backed` and `no_proxy_fallback` branches for `shared-2`, write one explicit `runtimePathUsed`, and keep profiles, cookies, local storage, and the rest of the local worker pool untouched
- [x] **PXTR-03**: The latest Phase 29 local proxy transport result is visible through an internal operator surface or durable file-backed artifact before any external chat completion claim
- [x] **PXTR-04**: Authenticated public smoke against `77.66.186.75` for `/healthz`, `/v1/models`, and `/v1/chat/completions` is rerun after the bounded runtime branch becomes explicit and ends with exactly one verdict `externally_ready` or `hold_rollout`

### Bounded Shared-2 External Chat 409 Root-Cause And Usability Stabilization

- [x] **CHAT409-01**: The project can produce one durable artifact that classifies the exact external chat `409` source for bounded `shared-2` across session, bootstrap, relay, and worker-usability state instead of collapsing the blocker into one vague chat failure
- [x] **CHAT409-02**: One bounded preserve-first local worker flow can move `shared-2` from internal `ready but unusable` toward externally usable chat, or honestly record the exact remaining mismatch without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin
- [x] **CHAT409-03**: The latest Phase 30 shared-2 chat-409 result is visible through an internal operator surface or durable file-backed artifact before any external-readiness claim
- [x] **CHAT409-04**: Authenticated public smoke against `77.66.186.75` for `/healthz`, `/v1/models`, and `/v1/chat/completions` is rerun in the same tracked flow and ends with exactly one verdict `externally_ready` or `hold_rollout`

### Bounded Shared-2 Bootstrap Navigation Failure Root-Cause And Usability Recovery

- [x] **S2BF-01**: The project can produce one durable artifact that reduces the bounded `shared-2` `chat_bootstrap_failed/bootstrap_navigation_failed` branch to one exact browser/bootstrap or worker-registration defect instead of another generic public-chat failure
- [x] **S2BF-02**: One bounded preserve-first local worker flow can either recover `shared-2` into externally usable chat or honestly record the exact remaining mismatch without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin
- [x] **S2BF-03**: The latest Phase 31 shared-2 bootstrap/usability result is visible through an internal operator surface or durable file-backed artifact before any new external-readiness claim
- [x] **S2BF-04**: The phase ends with one tracked final verdict `externally_ready` or `hold_rollout`, and if a public chat rerun is still unsafe, the artifact records the exact blocked reason in the same flow instead of pretending the run was inconclusive

### Full Local Account Surface Inventory And Bounded Canary Reselection

- [x] **ACINV-01**: The project can produce one durable local inventory artifact that records the visible surface classification for every current local account/profile instead of assuming one suspicious worker represents the whole pool
- [x] **ACINV-02**: One preserve-first local inventory flow can classify each current profile as `ready`, `needs_manual_confirm`, `needs_login`, `broken_surface`, `runtime_blocked`, or another explicit blocked state without deleting profiles, clearing cookies/local storage, or broad-starting the full pool
- [x] **ACINV-03**: The latest Phase 31.1 local account-surface inventory result is visible through an internal operator surface or durable file-backed artifact before any further narrow single-worker external-chat claim
- [x] **ACINV-04**: The phase ends with one explicit bounded-canary decision that names the next honest worker for narrow runtime/debug proof, or honestly records that no current local worker is safe to use as the next canary

### Bounded Shared-2 Worker-Registry Drift Reconciliation And Externally Usable Chat Recovery

- [x] **WRDR-01**: The project can produce one durable artifact that explains the bounded selected-canary (`dad`) runtime truth across host-controller truth, internal worker-registry truth, listener/CDP truth, and direct browser evidence instead of collapsing the blocker into another generic bootstrap failure
- [x] **WRDR-02**: One bounded preserve-first local worker flow can either reconcile the selected canary (`dad`) into externally usable chat or honestly record the exact remaining mismatch without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin
- [x] **WRDR-03**: The latest Phase 32 selected-canary reconciliation result is visible through an internal operator surface or durable file-backed artifact before any new external-readiness claim
- [x] **WRDR-04**: The phase ends with one tracked final verdict `externally_ready` or `hold_rollout`, and if a public chat rerun is still unsafe, the artifact records the exact blocked reason in the same flow instead of pretending the run was inconclusive

### Preserve-First Rotating Ready-Account External Chat Proof Until First Real Outside Success

- [x] **RRAC-01**: The project can produce one durable artifact that records the ordered preserve-first attempts across the current ready local accounts, including per-account local-surface truth, tunnel truth, public smoke truth, and one final stop reason
- [x] **RRAC-02**: One bounded preserve-first local flow can try the ready local accounts one by one until the first real external chat success or the ready set is exhausted, without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin
- [x] **RRAC-03**: The latest Phase 33 rotating ready-account result is visible through an internal operator surface or durable file-backed artifact before any new external-readiness claim
- [x] **RRAC-04**: The phase ends with one tracked final verdict `externally_ready` or `hold_rollout`, and if no account succeeds, the artifact records the exact repeated/common blocker or exhaustion reason instead of pretending the run was inconclusive

### Dedicated Per-Account Desktop Chrome Roots And Isolated Account-Browser Storage Before External Chat Proof

- [x] **ABIS-01**: Every current local account (`dad`, `wife`, `shared-1`, `shared-2`, `shared-3`, `shared-4`, `shared-5`) gets one dedicated desktop Chrome root and one dedicated browser-data root so no shared browser-storage chain can silently mix sessions across accounts
- [x] **ABIS-02**: A preserve-first local helper can open all current local accounts through those isolated roots and keep the windows open for manual inspection without deleting profiles, clearing cookies/local storage, or broad-starting the worker runtime
- [x] **ABIS-03**: The latest Phase 33.1 browser-isolation result is visible through an internal operator surface or durable file-backed artifact before any more external chat proof claims
- [x] **ABIS-04**: The phase ends with one tracked final verdict `isolated_browser_roots_ready` or `hold_rollout`, and if any account still fails launch or isolation, the artifact records the exact workers and failure branch

### Preserve-First External Chat Proof On Isolated Per-Account Browser Roots

- [x] **IECP-01**: The project can produce one durable artifact that records the ordered preserve-first external-chat attempts across the isolated local account roots, including per-account preflight surface truth, tunnel/token source truth, and external smoke truth
- [x] **IECP-02**: One bounded preserve-first local flow can try the isolated accounts one by one until the first real external `chat` success or the isolated ready set is exhausted, without deleting profiles, clearing cookies, clearing local storage, blind full-pool restart, or mass relogin
- [x] **IECP-03**: The latest Phase 34 isolated external-chat result is visible through an internal operator surface or durable file-backed artifact before any new external-readiness claim
- [x] **IECP-04**: The phase ends with one tracked final verdict `externally_ready` or `hold_rollout`, and if no isolated account succeeds, the artifact records the exact repeated/common blocker or exhaustion reason instead of pretending the run was inconclusive

### Server Transfer And Revalidation Of Isolated Per-Account External Chat Proof

- [x] **STRV-01**: The project can sync the Windows browser-block host and Ubuntu relay host from the same GitHub branch/commit and record the exact repo path/hash truth used for the live server revalidation run
- [x] **STRV-02**: One preserve-first server flow can transfer or reuse at least one preserved server account on the isolated per-account browser-root model, record exact transfer/preflight truth, and avoid cross-account browser-root or browser-data reuse without deleting profiles, clearing cookies/local storage, blind broad-starting the pool, or mass relogin
- [x] **STRV-03**: The latest Phase 35 server transfer/revalidation result is visible through an internal operator surface or durable file-backed artifact before any new server external-readiness claim
- [x] **STRV-04**: Public `/healthz`, `/v1/models`, and `/v1/chat/completions` are rerun against `http://77.66.186.75` after the server transfer and end with exactly one verdict `externally_ready` or `hold_rollout`

### Server Bearer Token And Ubuntu SSH Listener Recovery

- [x] **SBTU-01**: Bearer-token discovery can recover or exactly classify the token source for authenticated external smoke without committing, printing, or storing the token value in tracked artifacts
- [x] **SBTU-02**: Ubuntu SSH and listener truth can be verified directly, including repo path/hash, nginx `127.0.0.1:4010` upstream, and Ubuntu listeners `14021..14027` plus `14040`
- [x] **SBTU-03**: The latest Phase 36 token/SSH/listener recovery result is visible through an internal operator surface or durable file-backed artifact before any new external-readiness claim
- [ ] **SBTU-04**: Authenticated external `/healthz`, `/v1/models`, and `/v1/chat/completions` are rerun against `http://77.66.186.75` only after token plus listener truth, ending with exactly one verdict `externally_ready` or `hold_rollout`

### Reverse Tunnel Listener Restoration And Authenticated Chat Smoke

- [x] **RTUN-01**: Reverse-tunnel startup can use key or password auth preserve-first without committing, printing, or storing SSH passwords or bearer tokens, and it retries intermittent SSH banner/session failures before giving up
- [x] **RTUN-02**: Ubuntu listener truth for `127.0.0.1:14021..14027` and `127.0.0.1:14040` is verified directly after tunnel startup and is not inferred from Windows task/process state alone
- [x] **RTUN-03**: The latest Phase 37 reverse-tunnel/chat-smoke result is visible through a durable latest artifact and an internal operator surface, including tunnel owner, Ubuntu listener truth, token source label, external smoke truth, verdict, and next blocker
- [x] **RTUN-04**: One authenticated external `/v1/chat/completions` against `http://77.66.186.75` runs only after token plus Ubuntu listener truth are green, returning exactly one final verdict `externally_ready` or `hold_rollout`

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
| CONF-01 | Phase 11 | Complete |
| CONF-02 | Phase 11 | Complete |
| WREC-01 | Phase 12 | Complete |
| WREC-02 | Phase 12 | Complete |
| WREC-03 | Phase 12 | Complete |
| WREC-04 | Phase 12 | Complete |
| WREG-01 | Phase 13 | Complete |
| WREG-02 | Phase 13 | Complete |
| WREG-03 | Phase 13 | Complete |
| WREG-04 | Phase 13 | Complete |
| WROOT-01 | Phase 14 | Complete |
| WROOT-02 | Phase 14 | Complete |
| WROOT-03 | Phase 14 | Complete |
| WROOT-04 | Phase 14 | Complete |
| WREM-01 | Phase 15 | Complete |
| WREM-02 | Phase 15 | Complete |
| WREM-03 | Phase 15 | Complete |
| WREM-04 | Phase 15 | Complete |
| WPAR-01 | Phase 16 | Complete |
| WPAR-02 | Phase 16 | Complete |
| WPAR-03 | Phase 16 | Complete |
| WPAR-04 | Phase 16 | Complete |
| WRTI-01 | Phase 17 | Complete |
| WRTI-02 | Phase 17 | Complete |
| WRTI-03 | Phase 17 | Complete |
| WRTI-04 | Phase 17 | Complete |
| WREP-01 | Phase 18 | Complete |
| WREP-02 | Phase 18 | Complete |
| WREP-03 | Phase 18 | Complete |
| WREP-04 | Phase 18 | Complete |
| WFUP-01 | Phase 19 | Complete |
| WFUP-02 | Phase 19 | Complete |
| WFUP-03 | Phase 19 | Complete |
| WFUP-04 | Phase 19 | Complete |
| WPARB-01 | Phase 20 | Complete |
| WPARB-02 | Phase 20 | Complete |
| WPARB-03 | Phase 20 | Complete |
| WPARB-04 | Phase 20 | Complete |
| WPCP-01 | Phase 21 | Complete |
| WPCP-02 | Phase 21 | Complete |
| WPCP-03 | Phase 21 | Complete |
| WPCP-04 | Phase 21 | Complete |
| WPFU-01 | Phase 22 | Complete |
| WPFU-02 | Phase 22 | Complete |
| WPFU-03 | Phase 22 | Complete |
| WPFU-04 | Phase 22 | Complete |
| WSPR-01 | Phase 23 | Complete |
| WSPR-02 | Phase 23 | Complete |
| WSPR-03 | Phase 23 | Complete |
| WSPR-04 | Phase 23 | Complete |
| WSCB-01 | Phase 24 | Complete |
| WSCB-02 | Phase 24 | Complete |
| WSCB-03 | Phase 24 | Complete |
| WSCB-04 | Phase 24 | Complete |
| WLFB-01 | Phase 25 | Complete |
| WLFB-02 | Phase 25 | Complete |
| WLFB-03 | Phase 25 | Complete |
| WLFB-04 | Phase 25 | Complete |
| UTSR-01 | Phase 26 | Complete |
| UTSR-02 | Phase 26 | Complete |
| UTSR-03 | Phase 26 | Complete |
| UTSR-04 | Phase 26 | Complete |
| URTS-01 | Phase 27 | Complete |
| URTS-02 | Phase 27 | Complete |
| URTS-03 | Phase 27 | Complete |
| URTS-04 | Phase 27 | Complete |
| PXBT-01 | Phase 28 | Complete |
| PXBT-02 | Phase 28 | Complete |
| PXBT-03 | Phase 28 | Complete |
| PXBT-04 | Phase 28 | Complete |
| PXTR-01 | Phase 29 | Complete |
| PXTR-02 | Phase 29 | Complete |
| PXTR-03 | Phase 29 | Complete |
| PXTR-04 | Phase 29 | Complete |
| CHAT409-01 | Phase 30 | Complete |
| CHAT409-02 | Phase 30 | Complete |
| CHAT409-03 | Phase 30 | Complete |
| CHAT409-04 | Phase 30 | Complete |
| S2BF-01 | Phase 31 | Complete |
| S2BF-02 | Phase 31 | Complete |
| S2BF-03 | Phase 31 | Complete |
| S2BF-04 | Phase 31 | Complete |
| ACINV-01 | Phase 31.1 | Complete |
| ACINV-02 | Phase 31.1 | Complete |
| ACINV-03 | Phase 31.1 | Complete |
| ACINV-04 | Phase 31.1 | Complete |
| WRDR-01 | Phase 32 | Complete |
| WRDR-02 | Phase 32 | Complete |
| WRDR-03 | Phase 32 | Complete |
| WRDR-04 | Phase 32 | Complete |
| RRAC-01 | Phase 33 | Complete |
| RRAC-02 | Phase 33 | Complete |
| RRAC-03 | Phase 33 | Complete |
| RRAC-04 | Phase 33 | Complete |
| ABIS-01 | Phase 33.1 | Complete |
| ABIS-02 | Phase 33.1 | Complete |
| ABIS-03 | Phase 33.1 | Complete |
| ABIS-04 | Phase 33.1 | Complete |
| IECP-01 | Phase 34 | Complete |
| IECP-02 | Phase 34 | Complete |
| IECP-03 | Phase 34 | Complete |
| IECP-04 | Phase 34 | Complete |
| STRV-01 | Phase 35 | Complete |
| STRV-02 | Phase 35 | Complete |
| STRV-03 | Phase 35 | Complete |
| STRV-04 | Phase 35 | Complete |
| SBTU-01 | Phase 36 | Complete |
| SBTU-02 | Phase 36 | Complete; listener truth is missing ports 14021..14027 plus 14040 |
| SBTU-03 | Phase 36 | Complete |
| SBTU-04 | Phase 36 | Blocked until token plus Ubuntu listener truth are green |
| RTUN-01 | Phase 37 | Complete |
| RTUN-02 | Phase 37 | Complete |
| RTUN-03 | Phase 37 | Complete |
| RTUN-04 | Phase 37 | Complete |

  **Coverage:**
  - v1.2 requirements: 156 total
  - Mapped to phases: 156
  - Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-04-15 after executing Phase 37*
