# One Hour With My ChatGPT

## What This Is

One Hour With My ChatGPT is a household application that gives a user a timed 60-minute conversation through one of several persistent ChatGPT browser workers. The actual chat runs in managed browser sessions; the application handles session routing, relay, recovery, and operator visibility without exposing the raw browser to end users.

## Core Value

A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.

## Current State

- `v1.0 Household MVP` shipped on `2026-03-28`
- `v1.1 Household Rollout Hardening` shipped on `2026-03-28` and hardened real-world household rollout without expanding public product scope yet
- The core app stack still runs through `control-api`, the public shared-screen client, and the internal admin surface
- Docker browser workers remain a supported infrastructure baseline, but host-native Chromium workers are now the proven fallback when Docker/browser fingerprinting causes Cloudflare login loops
- A six-worker host-native pool can be launched only when needed and routed through a local sing-box mixed proxy built from several proxy share links with automatic outbound failover
- A seventh host-native slot (`shared-5`) is now provisioned so the next dedicated Windows browser block can move a seven-worker pool instead of stopping at six
- The proxied host-native pool can now be started and stopped from the internal admin surface with explicit lifecycle states and PowerShell fallback tools
- Host-native worker profiles stay on durable host storage and can be stopped cleanly when the pool is idle
- Host-native workers now support an explicit visible-auth then hidden-runtime split, so routine pool start no longer needs visible browser windows after manual login is complete
- New session-backed chats now bootstrap through an explicit fresh-chat contract that prefers `Temporary Chat` and the latest configured reasoning model before the composer unlocks
- Current ChatGPT UI drift hardening now has centralized selector maintenance, localized `Temporary Chat` support, and fresh compact-visible proof that passes on the official six-worker pool
- A standalone `remote_relay` service now runs on `77.66.186.75` under `systemd`, and the authenticated relay API has been proven against the real Linux host through a separate-host runtime path
- The public-owner conflict is now resolved preserve-first: Ubuntu deliberately owns public `77.66.186.75` and proxies the API contract to the preserved Windows `Caddy` edge over LAN HTTP with forced `Host: 77.66.186.75`
- The browser runtime is now packaged as a separate Windows browser block for Windows Server handoff, while keeping Linux as the relay/API host
- A direct Windows-block worker probe now exists and bypasses Docker plus local `control-api`; the latest full matrix on 2026-03-30 is `7/7 usable` on the current machine
- Phase 10.2 runtime review now confirms that neither the current host hidden runtime nor the current headed Docker/Xvfb candidate is trustworthy enough to use as the rollout-confidence baseline
- Phase 10.3 now targets a same-session alternate Windows desktop as the primary replacement non-visible runtime direction, so routine browser work can leave the operator's main desktop without introducing a second Windows identity
- The current shared-screen client is still an interim household surface, not the final user-facing mobile chat experience
- The runtime policy is now explicit: first login or reauthentication may use a visible interactive browser, and the current steady-state rollout baseline is `compact visible` with small corner windows; alternate non-visible runtimes remain historical debt until they are proven again

## Validated

- [x] A small household worker pool can be represented as named workers with dedicated identity and durable profile storage.
- [x] Manual ChatGPT authentication and reauthentication can be modeled as internal-only operator workflows without storing plaintext credentials.
- [x] A 60-minute session contract can be enforced server-side with durable queueing, worker pinning, expiry, and manual end.
- [x] The shared-screen application can relay messages through a managed worker and keep history visible across active and ended states.
- [x] Retry, reconnect, and worker restart flows can recover service without exposing raw worker internals publicly.
- [x] Public and internal traffic can be separated behind one edge while operator health and event visibility remain available.
- [x] Protected internal browser access can support manual ChatGPT login or reauthentication without publishing worker viewers publicly.
- [x] Persistent worker profiles can recover to a healthy ready pool after container recreate and restart.
- [x] A host-native Chromium worker can replace a Docker browser worker without changing the `control-api` session and relay contract.
- [x] A local proxy layer built from VLESS, Trojan, and Shadowsocks share links can launch the household host-native worker pool on demand and prefer a healthy outbound automatically for new worker traffic.
- [x] The proxied host-native household pool can be stopped again cleanly so browsers do not remain open when the pool is idle.
- [x] Each newly activated shared-screen chat can now be blocked behind explicit fresh-chat bootstrap state until `Temporary Chat` and preferred-model selection are ready or have failed clearly.
- [x] Internal admin can now start and stop the proxied host-native pool with explicit `idle`, `starting`, `ready`, `degraded`, `stopping`, and `failed` lifecycle meaning.
- [x] Relay and bootstrap selector maintenance is now centralized and live-verified against the current localized ChatGPT UI on two logged-in household workers.
- [x] Host-native workers now expose explicit `visible_auth` and `hidden_runtime` modes, operator transition controls, and a canonical hidden-runtime validation probe.
- [x] Runtime review now distinguishes process reachability from ChatGPT usability and confirms that the current hidden runtime choices must not be treated as rollout-ready steady-state browser paths.
- [x] Alternate-desktop validation is now available from internal admin as a historical/runtime-research path, but it is no longer the rollout gate.
- [x] Fresh compact-visible proof on 2026-03-29 passed on `dad`, `wife`, `shared-1`, `shared-2`, `shared-3`, and `shared-4`, with `Temporary Chat`, `GPT-5.4 Thinking`, and live relay all succeeding.
- [x] The relay/session/bootstrap module now runs as `owmcgp-remote-relay` on the dedicated SSH server with verified autostart, and fresh plus continuing remote dialog calls succeeded through a reverse-tunneled `wife` worker.

## Current Milestone: v1.2 Rollout Stability

**Goal:** Make household rollout predictable enough for routine use by removing the remaining operator friction and ChatGPT UI drift tails left after `v1.1`.

**Target features:**
- Start and stop the proxied host-native household pool from the internal admin surface instead of relying only on PowerShell scripts.
- Harden relay and fresh-chat bootstrap against the current ChatGPT UI so all three workers, including `dad`, can be trusted more evenly.
- Finish the last `dad` live proof only after the hidden-runtime transition is in place for the household path.
- Replace the rejected non-visible runtime assumptions with a same-session alternate-desktop native runtime candidate and prove or reject it explicitly before rollout smoke resumes.
- Add a repeatable rollout smoke path so the operator can confirm readiness before the family starts using the pool again.
- Use the fresh compact-visible runtime as the rollout baseline, with the Windows browser block now packaged and ready for Windows Server handoff before wider rollout.
- Treat raw public ingress for the Linux relay as a separate hardening concern, not as a reason to pretend the remote extraction itself did not work.
- Add one deliberate public-ready relay boundary so other clients can call the service safely without depending on localhost-only checks or improvised tunnels.
- Keep alternate desktop as historical runtime debt and optional research, not as the current blocker for household rollout.

**Current runtime gate:** The runtime gate is now "compact visible on a dedicated Windows browser block". Alternate desktop remains historical debt, Linux browser-hosting is explicitly reverted, and the current local Windows block has now produced a fresh `7/7 usable` direct proof. Actual cutover onto a dedicated Windows Server remains a separate infrastructure handoff, not a hidden claim inside the current runtime proof.

## Out of Scope

- Native OpenAI API integration - the product still deliberately relays existing ChatGPT browser sessions
- Automated login, CAPTCHA bypass, or unattended reauthentication - auth remains manual by design
- Public multi-tenant SaaS scaling - the current target remains a small private household deployment
- Billing, entitlements, voice, file upload, and image generation workflows - deferred beyond rollout hardening
- The current shared-screen client is not yet the intended mobile multi-chat product UX

## Context

- The product is not a new chatbot; it is a controlled relay around already logged-in ChatGPT web sessions.
- The backend still owns browser automation, worker assignment, session timing, health monitoring, and recovery.
- The client application should never expose raw browser controls, account credentials, or recovery tools.
- The long-term user-facing product should feel like a standard mobile chat-bot app with a chat list, a create-new-chat action, a message composer, and an image-attachment entry point.
- After each meaningful GSD part, wave, or follow-up step, the operator should receive a short plain-language report in Russian in addition to the technical artifact trail.
- Host-native workers can now be started and stopped from internal admin, while PowerShell scripts remain fallback tools.
- The current live ChatGPT UI on household profiles is localized, not reliably English-only, so bootstrap maintenance now has to tolerate Russian `Temporary Chat` labels, onboarding copy, and model-menu presentation.
- A new chat should feel like a fresh dialog, not like a continuation of the previous household conversation on the same worker.
- Fresh-chat behavior now prefers ChatGPT `Temporary Chat` so the dialog does not land in history and does not use or create memories.
- The current default model policy for a fresh chat is "latest available reasoning model", implemented through `WORKER_PREFERRED_REASONING_MODEL_LABELS` with `GPT-5.4 Thinking` as of 2026-03-28.
- Each app-level chat should map to one underlying browser conversation: a new chat should claim a free worker and start a fresh `Temporary Chat`, while continuing an existing chat should stay pinned to the same underlying browser conversation.
- Image attachment belongs in the future user-facing app flow and should relay into the same active browser conversation rather than creating a separate hidden path.
- The largest remaining real-world risks are no longer ordinary selector drift; they are the reliability of the non-visible runtime choice after manual login and the need for a more dependable steady-state browser path.
- `wife` produced the first live `Temporary Chat -> GPT-5.4 Thinking -> smoke-ok` proof on alternate desktop, but the latest revalidation regressed `wife` and `shared-1` back into `bootstrap_navigation_failed`; `dad` still fails as `bootstrap_auth_required`.
- If saved ChatGPT login state still proves unreliable after a deliberate visible-login then hidden-runtime split, that should be treated as evidence that the current multi-browser runtime choice is not robust enough and needs architectural replacement rather than more patching.
- `v1.2` intentionally keeps scope on rollout reliability rather than adding billing, entitlements, or broader product expansion yet.
- The current dedicated server target for Phase 10.6 is `77.66.186.75` over SSH port `2222` with user `mi50`; credentials and runtime secrets must stay out of tracked repo state and `.planning` artifacts.
- The current proven remote topology is `Linux remote relay + reverse-tunneled compact-visible Windows worker`, and direct outside callers now reach it through the deliberate MikroTik NAT -> server `nginx` edge on port `80`.
- External-client readiness now means three separate truths must all be explicit: server health, worker/session usability over the remote topology, and one deliberate ingress/auth path for non-household callers.
- The next remote-runtime target is a dedicated Windows Server browser block for the full seven-worker pool (`dad`, `wife`, `shared-1`, `shared-2`, `shared-3`, `shared-4`, `shared-5`) so external chat use no longer depends on the operator PC being on.
- If Windows Server access is temporarily busy, the operator can now rely on a truthful local compact-visible seven-worker snapshot while keeping the handoff package ready for later cutover.
- The latest direct Windows-block worker matrix on 2026-03-30 is explicit: `7/7` usable on the current machine.
- One target Windows Server now already runs a 9-slot browser block with logged-in ChatGPT accounts from repo code; that environment must now be treated as preserve-first and non-destructive.
- The next runtime move is no longer "put browsers on Linux"; it is "stabilize the already-deployed Windows Server browser block and stage API cutover without harming live accounts".
- Preserve-first truth is now explicit: canary and small-subset uplift are safe on the deployed Windows Server, but broad public API promotion remains on hold until the Windows-side edge is reconciled.
- The current Windows-side public API edge truth is now explicit too: external `80/443` currently terminate in `Caddy` redirect behavior, raw `:4010` is not the public contract, and safe activation must be `Caddy -> 127.0.0.1:4011/4010` with rollback.
- The direct Windows-host `Caddy` pass has now happened preserve-first: shadow canary and promoted HTTP proof passed on `shared-6`, but the newer blocker is narrower than TLS alone.
- Public edge ownership is no longer the active gate for rollout smoke: Ubuntu now deliberately owns public `77.66.186.75`, the API contract reaches the preserved Windows edge behind it, and the remaining public debt is certificate trust hardening rather than split ingress.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use browser relay instead of direct OpenAI API | The product is about controlled access to existing ChatGPT browser sessions | - Validated in v1.0 |
| Keep the application as a thin client | The remote browser should stay hidden; the app only needs session and chat UX | - Validated in v1.0 |
| Use several persistent named browser workers for household use | The product serves a small family pool rather than one shared slot | - Validated in v1.0 |
| Use Playwright as the control layer | One automation API across all workers reduces integration churn | - Validated in v1.0 |
| Keep login and reauthentication manual | Automating ChatGPT auth would be brittle and higher risk early | - Validated in v1.0 |
| Put one Nginx edge in front of the stack | Public and internal surfaces need a clean operational boundary | - Validated in v1.0 |
| Prefer host-native Chromium workers when Cloudflare blocks the Docker browser path | Real household login and relay reliability matters more than strict browser-container purity | - Validated in v1.1 |
| Launch host-native workers only on demand through a local proxy pool | The browsers should not stay visible when idle, and proxy choice needs to be resilient | - Validated in v1.1 |
| Keep proxy share links in ignored local files and generate sing-box config at runtime | Secrets and provider links should stay off tracked repo state | - Validated in v1.1 |
| Treat each new user chat as a clean dialog boundary | Users should not get confused by inheriting previous thread context from the same worker | - Implemented in v1.1 |
| Prefer `Temporary Chat` for fresh dialogs | The new chat should stay out of history and avoid using or creating memories | - Implemented in v1.1 |
| Prefer the latest ChatGPT reasoning model for a new chat | Fresh dialogs should start on the strongest current reasoning default instead of a stale model selection | - Implemented in v1.1 |
| Allow visible interactive browser only for manual login or reauthentication, then require hidden runtime for normal use | The operator should not have browser windows popping up during routine household use, but manual auth still needs a real interactive surface | - Recorded during v1.2 |
| Treat post-login auth instability as an architectural signal, not an operational nuisance | If a worker still loses ChatGPT auth after a clean visible-login then hidden-runtime transition, the current multi-browser approach is not trustworthy enough and should be reconsidered | - Recorded during v1.2 |
| Block rollout confidence on ambiguous hidden runtime assumptions | Phase 10.2 live evidence showed both current host hidden runtime and current Docker/Xvfb candidate falling into non-usable ChatGPT paths, so Phase 11 must wait for a new runtime design | - Recorded during v1.2 |
| Target a standard mobile chat-app UX for the future user-facing surface | The household product should eventually look and behave like a familiar chat app rather than an operator-first shared screen | - Preserved as future direction in v1.2 |
| Keep chat continuity at the app-dialog level | A new chat should start clean on an available worker, while continuing a chat should stay on the same underlying browser thread | - Preserved as future direction in v1.2 |
| After each meaningful part, provide a short simple-language report | The operator wants quick status in plain Russian, not only technical phase artifacts and logs | - Recorded during v1.2 |
| Treat remote relay extraction and browser-runtime placement as separate truths | The Linux service is now real, but the browser runtime is still proven only on the separate Windows host through reverse tunnels | - Recorded during Phase 10.6 |
| Keep Linux as relay/API and package browsers as a separate Windows block | The attempted Linux browser-hosting path was reverted; the honest next deployment shape is a dedicated Windows Server block that carries `host-controller`, seven durable profiles, and reverse tunnels into the Linux relay | - Recorded during replanning of Phase 10.6.1.2 |
| Treat public API readiness as separate from raw port reachability | A process listening on `:4010` is not yet the same thing as a stable external API that other clients should depend on | - Validated in Phase 10.6.1.1; deliberate public ingress now uses MikroTik NAT -> server `nginx`, while raw `:4010` stays private |
| Treat the deployed Windows Server browser block as a preserve-first environment | Once nine real accounts are already logged in on that host, speed matters less than avoiding profile loss; freeze, backup, canary uplift, and rollback must come before any broad change | - Recorded during v1.2 follow-up planning after the first live Windows Server deployment |
| Do not promote the deployed Windows Server API edge until it is proven locally and externally | Safe canary/subset runtime uplift is not enough by itself; the Windows-side edge still needs a verified `4010` or deliberate reverse-proxy path before broad cutover | - Validated in Phase 10.6.1.2.2 with verdict `hold_preserve_accounts` |
| On the deployed Windows Server, public API must live behind `Caddy` on loopback, not as raw public `:4010` | Current edge truth shows `Caddy` already owns `80/443`; the safer cutover is `Caddy -> 127.0.0.1:4011/4010` with backup and rollback, not exposing more internal listeners | - Recorded during Phase 10.6.1.2.2.1 |
| Resolve the deployed Windows edge by one direct host-level canary pass, not more blind repo-only prep | The direct preserve-first host pass is now complete: shadow canary and promoted HTTP proof succeeded on `shared-6`, and the remaining blocker is narrowed to Windows HTTPS/TLS plus one outside-NAT independent chat proof | - Updated after executing Phase 10.6.1.2.2.1.1 |
| Treat public edge ownership as a separate rollout gate from Windows API correctness | The preserved Windows edge can still be locally healthy while the real public IP lands on another responder entirely; Phase 11 stayed blocked until the public owner of `77.66.186.75` was reconciled explicitly | - Validated during Phase 10.6.1.2.2.1.1.1 and resolved in Phase 10.6.1.2.2.1.1.1.1.1 |
| Treat Ubuntu-side public ownership as the current live blocker, not another Windows-edge mystery | Public `77.66.186.75` was explicitly observed on Ubuntu `nginx` while the preserved Windows `Caddy` edge stayed LAN-only; the next safe change belonged to public-owner reconciliation, not to the 9-account browser block | - Recorded after executing Phase 10.6.1.2.2.1.1.1.1 and resolved in Phase 10.6.1.2.2.1.1.1.1.1 |
| Prefer Ubuntu-side public-owner unification before any direct public-IP move to Windows | The public IP already terminated on Ubuntu, so the smallest preserve-first change was to make Ubuntu the deliberate API owner and unify the Windows edge behind it instead of moving ingress wholesale onto the Windows host | - Validated in Phase 10.6.1.2.2.1.1.1.1.1 |
| Keep Ubuntu as public owner and proxy to Windows over LAN HTTP with forced Host header | The preserved Windows edge already served the right contract when addressed as `Host: 77.66.186.75`, so the smallest safe production shape was `Ubuntu nginx -> Windows Caddy/API` rather than another public-IP move | - Recorded after executing Phase 10.6.1.2.2.1.1.1.1.1 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to active milestone scope
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-31 after planning Phase 10.6.1.2.2.1.1.1.1.1 for Ubuntu public-owner unification*
