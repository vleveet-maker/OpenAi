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
- The canonical public API path is now `internet -> MikroTik -> Ubuntu nginx -> 127.0.0.1:4010`; live Ubuntu `nginx -T` on 2026-04-12 shows `80/443/8080` proxy locally and no longer references `192.168.88.250`
- The historical Windows `Caddy` edge is no longer part of the active public path: `192.168.88.250` currently only listens on loopback `4040` and `8081`, and no `Caddy` service or process is running on that host
- Phase 11 rollout confidence is now real and operator-visible: the latest live smoke on 2026-03-31 proved the public canary path on `shared-6` and the internal latest-smoke surface, but the final verdict is still `hold_rollout` because the deployed Windows pool snapshot remained `0/9 ready` and `9/9 disconnected`
- Phase 12 readiness recovery is now also real: on 2026-03-31 the deployed Windows browser-block host recovered all `9/9` preserved workers to `ready` and `usable`, but the required post-recovery smoke rerun still ended with `hold_rollout` because the smoke-time snapshot fell back to `0/9 ready` and `9/9 disconnected`
- Phase 13 post-recovery regression truth is now real and operator-visible too: the deployed-host live run on 2026-03-31 ended with `hold_rollout`, the final phase-13 wrapper copies were synced back through the archive, and the internal latest-regression surface now shows the same result; however this run never restored a healthy post-recovery baseline (`after_recovery = 0/9 ready`, temporary `after_canary_start = 1/9 ready` on `shared-6`, and `after_settle = 0/9 ready`), while the final public canary returned `502` on all three public checks
- Phase 14 root-cause truth is now real and operator-visible too: the deployed-host live run on 2026-03-31 ended with `root_cause_confirmed`, the baseline stayed at `0/9 ready` and `9/9 disconnected`, `loopback_api` stayed green with `200/200/200`, the first failing hop is now explicitly `windows_edge_forced_host`, and the public owner `http://77.66.186.75` still returns `502` with `Server: nginx/1.18.0 (Ubuntu)`
- Phase 15 remediation truth is now real and operator-visible too: the deployed-host live run on 2026-04-01 ended with `hold_rollout`, `GET /internal/disconnected-baseline-remediation/latest` and `/internal/admin` showed the latest remediation result, the exact post-remediation smoke rerun also happened, but the runtime still failed the rollout contract because `windows_edge_forced_host` stayed `transport_error`, the public canary returned `502/502/502`, and the final smoke settled at only `1/9 ready`
- Phase 16 stabilization truth is now real and operator-visible too: the deployed-host live run on 2026-04-01 ended with `hold_rollout`, `GET /internal/post-remediation-degraded-smoke/latest` and `/internal/admin` showed the latest stabilization result, the parity-synced archive and compatibility marker were exercised end-to-end, but the runtime still failed the rollout contract because the host only reached `1/9 ready` before smoke, regressed to `0/9 ready` by the final smoke snapshot, stayed `degraded`, and the public canary on `shared-6` again returned `502`
- Phase 17 runtime-investigation truth is now real and operator-visible too: the deployed-host live run on 2026-04-01 ended with `runtime_blocker_confirmed`, `GET /internal/post-stabilization-runtime-investigation/latest` and `/internal/admin` showed the same latest result, the baseline stayed at `0/9 ready`, the bounded canary only reached `1/9 ready`, the final snapshot returned to `0/9 ready`, the dominant runtime blocker is now explicitly `disconnected`, and the first failing hop remains `windows_edge_forced_host`
- Phase 18 disconnected-runtime remediation truth is now real and operator-visible too: the deployed-host live run on 2026-04-01 ended with `hold_rollout`, `GET /internal/disconnected-runtime-remediation/latest` and `/internal/admin` showed the same latest remediation result, the parity-synced remediation still stayed at `0/9 ready`, and the required post-remediation smoke rerun still finished at `after_settle` with only `1/9 ready`, pool `degraded`, and public canary `502/502/502` on `shared-6`; the repo now also backports the string-or-object `Worker.status` compatibility that the deployed host had to restore during the smoke rerun
- Phase 19 persistent follow-up truth is now real and operator-visible too: the deployed-host live run on 2026-04-01 ended with `hold_rollout`, `GET /internal/persistent-disconnected-runtime-followup/latest` and `/internal/admin` showed the same latest result, the follow-up stayed at `0/9 ready`, the dominant runtime blocker remained `disconnected`, the first failing hop remained `windows_edge_forced_host`, the public owner still returned `502`, and the required post-follow-up smoke rerun still ended at `after_settle` with only `1/9 ready` and public canary `502/502/502` on `shared-6`
- Phase 20 runtime-parity backport truth is now real and operator-visible too: the deployed-host live run on 2026-04-01 ended with `hold_rollout`, `GET /internal/runtime-parity-backport-remediation/latest` and `/internal/admin` showed the same latest result, the parity-clean archive ran without any newly reported post-overlay compat fix, but the remediation still stayed at `0/9 ready` and the required smoke rerun still ended at `after_settle` with only `1/9 ready` and public canary `502/502/502` on `shared-6`
- Phase 21 post-parity remediation truth is now fully real and operator-visible: the deployed-host live remediation run on 2026-04-01 ended with `hold_rollout`, `GET /internal/post-parity-disconnected-runtime-remediation/latest` and `/internal/admin` showed the same latest result, the remediation stayed at `0/9 -> 0/9 ready`, the dominant runtime blocker stayed `disconnected`, the first failing hop stayed `windows_edge_forced_host`, both forced-host plus public-owner checks failed, and the exact smoke rerun still ended at `after_settle` with only `1/9 ready` plus public canary `502/502/502`
- Phase 22 follow-up truth is now real and operator-visible too: the deployed-host live run on 2026-04-01 ended with `hold_rollout`, `GET /internal/post-phase21-disconnected-runtime-followup/latest` and `/internal/admin` showed the same latest result, the follow-up stayed at `0/9 -> 0/9 ready`, the dominant runtime blocker stayed `disconnected`, the first failing hop stayed `windows_edge_forced_host`, `loopbackStatus` stayed green while forced-host plus public-owner stayed red, and the exact smoke rerun still ended at `after_settle` with only `1/9 ready` plus public canary `502/502/502`; the successful smoke used the current server-working `test-rollout-smoke.ps1` because the checkpoint archive copy was stale
- Phase 23 truth is now also real and operator-visible: the deployed-host live run on 2026-04-02 ended with `hold_rollout`, `GET /internal/post-phase22-smoke-wrapper-parity-remediation/latest` and `/internal/admin` showed the same latest result, the parity-remediation stayed at `0/9 -> 0/9 ready`, the dominant runtime blocker stayed `disconnected`, the first failing hop stayed `windows_edge_forced_host`, the exact smoke rerun still ended at `after_settle` with only `1/9 ready` plus public canary `502/502/502`, and the deployed host still needed post-overlay compatibility restores in `probe-public-api.ps1`, `test-rollout-smoke.ps1`, and `remediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1`
- Reverse SSH tunnels from the Windows workers to Ubuntu are now the runtime-critical dependency for external chat: when the tunnel was restored, Ubuntu again exposed `127.0.0.1:14021..14027` and `127.0.0.1:14040`, `readyz` returned `7/7 ready`, and external authenticated chat smoke returned `200 ping-ok` on worker `shared-2`
- Phase 25 external-readiness truth is now real too: the deployed Windows host synced branch `windows-browser-block-api-20260331` at commit `8d269d6`, reran parser/tests/build successfully, and wrote the readiness artifact, but Ubuntu sync/topology could not be re-verified, the reverse-tunnel task fell back to `Ready` with `LastTaskResult=1`, and outside proof regressed to `/healthz=404`, `/v1/models=404`, `/v1/chat/completions=501`, so the final verdict remains `hold_rollout`
- Phase 26 external-restoration truth is now real and operator-visible too: the repo-backed Windows run on 2026-04-12 synced branch `windows-browser-block-api-20260331` at commit `8317e78`, kept parser/tests/build green, and explicitly confirmed both `GET /internal/post-phase25-external-restoration/latest` and the matching `/internal/admin` section, but Ubuntu SSH still closed immediately, the reverse-tunnel task fell back to `Ready` with `LastTaskResult=1`, Ubuntu listeners `14021..14027` and `14040` stayed missing, and the accessible Windows-host outside proof stayed at `/healthz=404`, `/v1/models=404`, `/v1/chat/completions=501`, so the final verdict remains `hold_rollout`
- Phase 27 is now complete with `hold_rollout`: the local Windows plus Ubuntu proof confirmed the exact Ubuntu deployment-unit path `/opt/owmcgp-remote-relay/services/control-api`, the canonical `nginx -> 127.0.0.1:4010` public path, authenticated public `healthz` plus `v1/models`, and the matching latest-state/admin surface, but external chat still fails because the bounded local worker runtime never becomes `ready`
- Phase 28 is now complete with `hold_rollout`: the canonical local proxy/bootstrap wrapper, latest-state route, and `/internal/admin` surface are all real on the current machine, but proxy TLS on `127.0.0.1:7897` still resets and bounded `shared-2` still remains unusable, so external chat readiness cannot be claimed yet
- Phase 29 is now complete with `hold_rollout`: the new transport-diagnostics wrapper proved every tracked proxy outbound still fails TLS, bounded `shared-2` can now reach internal `ready` via `no_proxy_fallback`, temporary reverse tunnels can expose Ubuntu `14021..14027` and `14040`, authenticated public `healthz` plus `v1/models` pass in the same tracked flow, but external `v1/chat/completions` still fails with `409` on `shared-2`
- Phase 30 is now complete with `hold_rollout`: the exact external chat `409` branch on bounded `shared-2` is now classified as `chat_bootstrap_failed`, authenticated public `healthz` plus `v1/models` pass in the same tracked flow, but public chat still fails with `bootstrap_navigation_failed` and bounded `shared-2` remains externally unusable
- Phase 31 is now complete with `hold_rollout`: the bounded `shared-2` blocker is no longer a vague bootstrap failure and is now classified as `worker_registry_drift`, where host-controller still reports local `ready` while the internal worker registry returns `worker_not_found` and direct browser evidence remains `cdp_not_listening`
- Phase 31.1 is now complete with `canary_reselected`: the preserve-first local inventory proved that `dad`, `wife`, `shared-1`, `shared-3`, `shared-4`, and `shared-5` are already on usable ChatGPT surfaces, while `shared-2` currently sits on `needs_login`
- The next honest bounded canary is now `dad`, not `shared-2`
- Phase 32 is now complete with `hold_rollout`: `shared-2` stayed explicit `needs_login` deferred debt, the honest selected canary `dad` reached a usable local ChatGPT surface, temporary reverse tunnels plus authenticated public `healthz` and `v1/models` passed in the same tracked flow, but external `chat` still failed on `dad` with `409 chat_bootstrap_failed / bootstrap_auth_required`
- The next external-chat recovery step must no longer fixate on a single account: start from the first ready canary, but if the blocker looks account-specific, move preserve-first to the next ready local profile and keep going until one real external chat pass succeeds or the same blocker repeats across the ready set
- Phase 33 is now complete with `hold_rollout`: the live proof rotated through `dad`, `wife`, `shared-1`, `shared-3`, `shared-4`, and `shared-5` preserve-first, and no account produced one real outside chat success
- The useful new truth from Phase 33 is that the same blocker repeats across the full ready set: local ChatGPT surfaces are visible, but the bounded runtime still ends at `listener_only / surface_unusable` with `selected_canary_not_usable`
- The next follow-up should classify and repair this repeated ready-account blocker instead of going back to account-specific loops
- The old shared browser-root/storage model is now considered untrustworthy for local proof because account/session files can bleed across profiles and make one account appear inside another account's browser surface
- The next urgent local step is dedicated per-account desktop Chrome isolation: one full browser root plus one browser-data root per account before any more outside-chat proof
- External chat proof should not resume on the current local machine until that browser-isolation baseline exists, because otherwise we can keep debugging false blockers on cross-linked storage
- Phase 33.1 is now complete: the current local machine has one isolated desktop Chrome root plus one isolated browser-data root per account, and that isolation baseline is now the only honest foundation for the next outside-chat proof
- After manual operator activation on 2026-04-14, all seven isolated local accounts (`dad`, `wife`, `shared-1`, `shared-2`, `shared-3`, `shared-4`, `shared-5`) now sit on real ChatGPT pages with composer visible, so the next honest move is one preserve-first external chat proof on that isolated baseline
- The next honest move after Phase 34 is no longer more local browser debugging; it is a GitHub-first preserve-first server transfer and server-side revalidation of that same isolated per-account browser-root model
- The browser runtime is now packaged as a separate Windows browser block for Windows Server handoff, while keeping Linux as the relay/API host
- A direct Windows-block worker probe now exists and bypasses Docker plus local `control-api`; the latest full matrix on 2026-03-30 is `7/7 usable` on the current machine
- When one bounded worker shows suspicious runtime truth that may actually be a manual confirm/login/interstitial surface, the project must first inventory all currently available local account surfaces before continuing deeper single-worker root-cause debugging
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
- [x] A repeatable rollout-smoke flow now checks the real public-owner path, writes durable smoke artifacts, and ends with one explicit `ready_for_household_use` or `hold_rollout` verdict instead of guesswork.
- [x] The latest rollout-smoke result is now visible through `/internal/rollout-smoke/latest` and the internal admin page instead of living only in raw terminal output.
- [x] A bounded preserve-first readiness recovery can restore the deployed nine-account Windows pool to `ready` and `usable` without profile deletion, cookie clearing, relogin, or mass restart, but that recovery is not yet stable enough to survive the rollout smoke contract.
- [x] A durable root-cause artifact can now separate a healthy Windows loopback API path from the failing forced-Host/public-owner edge branch, so the rollout blocker is no longer just "public canary 502" in the abstract.
- [x] A preserve-first remediation flow plus latest-remediation operator surface can now be run end-to-end on the deployed Windows host, but the current truthful result is still `hold_rollout` because the post-remediation smoke only settles at `1/9 ready` and the public canary still returns `502`.
- [x] A post-stabilization runtime-investigation artifact can now prove the dominant runtime blocker and first failing public-canary hop from the deployed host instead of relying on repeated degraded-smoke notes.
- [x] A persistent disconnected-runtime follow-up harness plus latest follow-up operator surface can now be run end-to-end on the deployed Windows host, but the truthful result is still `hold_rollout` because the follow-up stays at `0/9 ready` and the post-follow-up smoke still settles at only `1/9 ready` with a red public canary.

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
- The canonical public API path is now explicit too: Ubuntu `nginx` owns public `77.66.186.75` and proxies `80/443/8080` to `127.0.0.1:4010`; direct Ubuntu probes now return `200` on `/healthz` and `401` on `/v1/models` without a bearer token.
- The Windows browser-block host still matters, but as the worker and tunnel origin rather than as the active public `80/443` edge; its live listeners remain loopback `4040` and `8081`.
- Reverse SSH tunnels from Windows to Ubuntu are now the critical runtime dependency for external chat: when they died, chat failed as `worker_chat_bootstrap_unreachable`; when restored, authenticated external chat smoke returned `200 ping-ok`.
- Phase 29 narrowed the blocker again: even with temporary reverse tunnels restored and a real bearer token, external chat can still fail on `shared-2` with `409`, so the remaining work is now worker usability/relay behavior rather than public ingress, token discovery, or tunnel mapping alone.
- Phase 30 now targets that last blocker directly: the next proof must classify the exact `409` branch and either stabilize `shared-2` into externally usable chat or leave one honest final blocker artifact.
- File transfer workflow is now explicit for GSD handoff: when another host or agent needs files, publish the updated files to GitHub, replace older copies there, and hand off a prompt that points to the GitHub source instead of relying on local-only archives.
- Phase 22 is now complete with hold_rollout: the stale checkpoint archive proved that smoke-wrapper parity still matters, and Phase 23 is now also complete with hold_rollout, proving that the live runtime branch still fails even after the parity-remediation pass and exact smoke rerun.
- Phase 24 live remediation is now complete too: the deployed host wrote `24-COMPAT-REMEDIATION-SUMMARY.json/.md` and confirmed the matching latest route plus admin section, but the archive overlay still needed post-overlay compat restores before smoke, so the phase remains open until the exact smoke rerun finishes on the current server-working copy.
- Phase 24 is now fully complete with `hold_rollout`: the exact smoke rerun finished on the current Phase 24-compatible server-working copy and still ended at `after_settle` with pool `degraded`, only `1/9 ready`, and public canary `503/503/503`, which proves exact compat backport still needs another follow-up.
- Phase 24 is now planned: the next pass stays narrow around exact smoke-wrapper compat backport for probe-public-api.ps1, 	est-rollout-smoke.ps1, and emediate-post-phase22-smoke-wrapper-parity-and-persistent-disconnected-runtime.ps1, followed by the same preserve-first remediation plus exact smoke rerun on the archive-overlaid scripts.

- Phase 34 is now complete with `externally_ready`: on the isolated per-account browser-root baseline, `wife` produced the first honest outside `/v1/chat/completions = 200` with `assistantReplyText = probe-ok`, which means local external API readiness is now proven on this machine.
- Phase 35 is now complete with `hold_rollout`: server transfer/revalidation reached public `/healthz=200`, but `tokenSource=missing` blocked authenticated `/v1/models` and `/v1/chat/completions`, Ubuntu SSH/listener truth stayed unconfirmed, and all seven server browser-data copy attempts reported `robocopy exit code 11`.
- Phase 36 is now complete with `hold_rollout`: the token/SSH/listener wrapper, latest route, admin section, focused tests, full tests, and build are green, but live SSH to `77.66.186.75:2222` returned intermittent empty/banner-timeout responses, so bearer-token lookup, Ubuntu listener truth, and authenticated external chat were correctly skipped.

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
| Keep Ubuntu `nginx -> 127.0.0.1:4010` as the canonical public API path | Live 2026-04-12 Ubuntu checks show `80/443/8080` proxy locally while Windows `Caddy` is absent from the active edge | - Recorded during Phase 25 replanning |
| Treat reverse SSH tunnels as the critical dependency for external chat | `/v1/models` already worked through the public API, and chat recovered only after the Windows worker tunnels back to Ubuntu were restored | - Recorded during Phase 25 replanning |
| Transfer cross-host handoff files only through GitHub | Local-only archives are too easy to lose, desync, or forget on the destination host; the receiving agent should get a prompt that points to the committed GitHub source | - Recorded on 2026-04-12 as a standing GSD workflow rule |
| Treat Ubuntu SSH reachability and reverse-tunnel task retention as rollout-critical operational dependencies | Phase 25 proved that repo-backed Windows code alone is not enough; if Ubuntu cannot be re-verified and the reverse-tunnel task falls back to `Ready`, the external path can regress to `404/404/501` even without destructive account changes | - Recorded during Phase 25 execution |
| Run authenticated external smoke from the host that actually has a valid bearer token | Phase 25 showed that Windows-local token absence can block proof even when the public API itself is healthy; the public path, not the token's storage location, is the real contract | - Recorded during Phase 26 planning |
| Treat bounded `shared-2` `worker_registry_drift` as the current external-chat blocker | Phase 31 showed a narrower mismatch than generic bootstrap failure: host-controller still reports local `ready`, but the internal worker registry returns `worker_not_found` and no usable CDP/browser surface appears | - Recorded during Phase 31 |
| Keep Phase 32 bounded to one honest canary before any new public claim | After Phase 31.1, the next safe move was to prove externally usable chat on `dad` first and stop treating `shared-2` as if it were required for API readiness right now; the Phase 32 result confirmed this was the right branch and narrowed the remaining blocker to `dad` public chat bootstrap auth | - Updated during Phase 32 completion |
| Inventory all local account surfaces before trusting one suspicious worker as the active canary | The observed `shared-2` surface turned out to be a manual account-confirm/interstitial screen, which means narrow single-worker debugging can chase a false blocker unless the current account pool is inventoried first | - Recorded during Phase 31.1 planning |
| After full local inventory, switch the bounded canary to the first genuinely ready profile instead of staying attached to the old suspicious worker | Phase 31.1 proved that `shared-2` is currently `needs_login`, while `dad` and five other local profiles are already usable, so the next honest narrow proof must start from `dad` | - Recorded during Phase 31.1 completion |
| Do not loop on one canary when the blocker may be account-specific | After Phase 32, the safer and faster API-readiness strategy is to try ready profiles one by one preserve-first and stop as soon as one account proves external chat, instead of burning more time on one stubborn profile | - Recorded during Phase 32 follow-up correction |
| Do not trust one shared Chrome footprint across multiple local accounts | The current local browser/storage layout can let one account's session files bleed into another account's runtime surface, which makes worker/account proof fundamentally unreliable | - Recorded during Phase 33.1 replanning |
| Isolate browser roots per account before more local external-chat proof | The project now needs one dedicated desktop Chrome root and one dedicated browser-data root per account so manual inspection and runtime proof operate on clean boundaries | - Recorded during Phase 33.1 planning |
| Once the isolated account roots are manually activated and composer-visible, the next proof should use the full isolated ready set and stop at the first real outside chat success | After the 2026-04-14 manual activation pass, the blocker is no longer account-surface readiness; the product now needs one honest external `chat` success on the isolated baseline rather than more surface debugging | - Recorded during Phase 34 planning |
| Keep the isolated per-account browser-root model as the current local truth baseline | Phase 34 proved that the isolated model can carry the first honest outside `/v1/chat/completions = 200`, so server transfer should reuse this shape instead of revisiting the retired shared-root browser model | - Recorded during Phase 34 completion |
| Treat server transfer as a revalidation of the proven isolated model, not as a return to the retired shared-root browser layout | Phase 34 already proved the local architecture, so the next honest risk is server transfer/revalidation on Windows browser-block plus Ubuntu public owner, performed GitHub-first and preserve-first | - Recorded during Phase 35 planning |
| Fix Ubuntu SSH/NAT stability before more browser or proxy debugging | Phase 36 proved the current blocker is the public SSH ingress returning empty/banner-timeout responses on repeated attempts; without stable SSH, the agent cannot safely retrieve token source or confirm Ubuntu-side reverse-tunnel listeners | - Recorded during Phase 36 completion |

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
*Last updated: 2026-04-14 after live completion of Phase 36 with `hold_rollout`*
