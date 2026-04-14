---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planned
stopped_at: Phase 37 planned; next action is `$gsd-execute-phase 37`
last_updated: "2026-04-15T00:20:42.225+03:00"
last_activity: 2026-04-15 -- Phase 37 planned for reverse SSH tunnel listener restoration and final authenticated external chat smoke
progress:
  total_phases: 51
  completed_phases: 50
  total_plans: 153
  completed_plans: 150
  percent: 98
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-14)

**Core value:** A family user gets a stable, bounded 60-minute conversation through a managed ChatGPT worker without touching the server browser directly.
**Current focus:** Phase 37 -- restore Ubuntu reverse SSH tunnel listeners and complete authenticated external chat smoke

## Current Position

Phase: 37 (restore-ubuntu-reverse-ssh-tunnel-listeners-and-complete-external-authenticated-chat-smoke-after-token-models-proof) -- PLANNED
Plan: 0 of 3
Milestone: `v1.2 Rollout Stability`
Status: Ready to execute Phase 37
Last activity: 2026-04-15 -- Phase 37 planned

Progress: [#########-] 98%

## Milestone Snapshot

- Phases completed: `50 / 51`
- Plans completed: `150 / 153`
- Current roadmap: `.planning/ROADMAP.md`
- Current requirements: `.planning/REQUIREMENTS.md`

## Carry-Forward Context

### Decisions

- Browser relay through managed ChatGPT web sessions remains the product shape.
- Manual operator login and reauthentication remain the deliberate safety model.
- Compact visible runtime remains the official rollout baseline for `v1.2`.
- The deployed Windows host remains preserve-first: no profile deletion, cookie clearing, local-storage clearing, blind full-pool restart, or mass relogin.
- The canonical public API path is `internet -> MikroTik -> Ubuntu nginx -> 127.0.0.1:4010`.
- Windows `Caddy` is no longer part of the active public edge path; the Windows host now only exposes loopback `4040` and `8081`.
- Reverse SSH tunnels from Windows workers to Ubuntu are the runtime-critical dependency for external chat.
- Cross-host file handoff is GitHub-first: publish tracked files to GitHub and point receiving agents at the GitHub source instead of local-only archives.
- Authenticated external smoke should run from whichever host actually has a valid bearer token while still targeting the public path `77.66.186.75`; absence of a token on the Windows host is not itself proof that the API is broken.
- Before trusting one suspicious worker as the next canary, the project now requires a preserve-first all-account surface inventory whenever a bounded browser/runtime branch may actually be stuck on a manual confirm/login/interstitial screen.
- Phase 31.1 is complete with `canary_reselected`: `dad`, `wife`, `shared-1`, `shared-3`, `shared-4`, and `shared-5` are already `ready`, while `shared-2` is `needs_login`, so the honest next canary became `dad`.
- Phase 32 is complete with `hold_rollout`: `shared-2` stayed explicit `needs_login` deferred debt, the honest selected canary `dad` reached a usable local ChatGPT surface, temporary reverse tunnels plus authenticated public `/healthz` and `/v1/models` passed in the same tracked flow, but external `/v1/chat/completions` still failed on `dad` with `409 chat_bootstrap_failed / bootstrap_auth_required`.
- The next external-chat follow-up must use preserve-first rotating canaries across the currently ready local profiles (`dad`, `wife`, `shared-1`, `shared-3`, `shared-4`, `shared-5`) instead of getting stuck on one account-specific blocker.
- Phase 33 is complete with `hold_rollout`: the project rotated preserve-first across `dad`, `wife`, `shared-1`, `shared-3`, `shared-4`, and `shared-5`, and every attempted ready account repeated the same blocker `selected_canary_not_usable` with local ChatGPT visible but bounded runtime truth still at `listener_only / surface_unusable`.
- The old shared browser-root/storage model is now explicit technical debt: account/session files can bleed across profiles, so new runtime proof must stop assuming that one shared Chrome footprint can safely represent isolated accounts.
- Phase 33.1 is now complete with `isolated_browser_roots_ready`: every current local account has one dedicated desktop Chrome root plus one dedicated browser-data root, and the isolated windows stayed open for inspection without cross-account reuse.
- After manual activation on the isolated roots, all seven local accounts (`dad`, `wife`, `shared-1`, `shared-2`, `shared-3`, `shared-4`, `shared-5`) now sit on real ChatGPT pages with a visible composer, so Phase 34 can treat the full isolated set as ready again.
- Phase 34 is now complete with `externally_ready`: on the isolated browser-root baseline, `dad` still failed with `409 chat_bootstrap_failed / worker_chat_bootstrap_timeout`, but `wife` produced the first honest outside `/v1/chat/completions = 200` with `assistantReplyText = probe-ok`.
- Phase 35 is now complete with `hold_rollout`: the server-transfer wrapper and operator surface are live, public `/healthz` returned `200`, but bearer-token discovery was missing, Ubuntu SSH/listener truth was unconfirmed, authenticated models/chat were not proven, and server browser-data copy reported `robocopy exit code 11` for all seven accounts.

### Remaining Rollout Debt

- Durable reverse-tunnel retention still needs a stable non-manual path; temporary password-backed tunnels can expose the right Ubuntu listeners, but this is still a proof path, not durable retention.
- The local external chat proof remains green on the isolated browser-root baseline; the remaining rollout work is now server-side token/SSH/listener recovery and revalidation of the same proven shape.
- Phase 36 is complete with `hold_rollout`: token source and public `/v1/models` are now green through `77.66.186.75`, but Ubuntu listeners `14021..14027` and `14040` are missing, so authenticated external chat was correctly skipped.
- `shared-2` is back in the active isolated ready set after manual activation, but it is no longer the gate for local API readiness because `wife` has already proven the first honest outside chat success.
- Local proxy TLS egress on `127.0.0.1:7897` still needs repair: `CONNECT` succeeds, but TLS resets on `https://www.gstatic.com/generate_204` and `https://chatgpt.com`.
- Dedicated per-account browser isolation has now landed and already produced the first real external chat success locally; any next rollout step should preserve that isolated model instead of going back to the retired shared-root layout.

## Session Continuity

Last session: 2026-04-15
Stopped at: Phase 37 planned; next action is `$gsd-execute-phase 37`

## Accumulated Context

### Roadmap Evolution

- Phase 27 complete: local Windows plus Ubuntu proof confirmed Ubuntu path, canonical public topology, authenticated `/healthz` plus `/v1/models`, and the operator surface, but external chat remained blocked by the bounded local worker runtime.
- Phase 28 complete: local proxy/bootstrap truth and operator surface became explicit, but proxy TLS still reset and bounded `shared-2` still remained unusable.
- Phase 29 complete: proxy transport truth became explicit, bounded `shared-2` could reach internal `ready` through fallback, temporary reverse tunnels plus authenticated public `/healthz` and `/v1/models` passed in the same tracked flow, but external chat still failed with `409`.
- Phase 30 complete: the exact public chat `409` branch on bounded `shared-2` was classified as `chat_bootstrap_failed`, but public chat still stayed blocked by `bootstrap_navigation_failed`.
- Phase 31 complete: the remaining bounded `shared-2` blocker was narrowed to `worker_registry_drift`.
- Phase 31.1 complete: preserve-first local inventory proved that `shared-2` currently sits on `needs_login`, six other local profiles are already `ready`, and the next honest bounded canary is `dad`.
- Phase 32 complete: the selected-canary proof confirmed that `dad` is the honest active path, temporary reverse tunnels and authenticated public `healthz` plus `v1/models` pass in the same run, and the remaining blocker is narrowed to public chat bootstrap auth on `dad`.
- Follow-up correction after Phase 32: do not loop on `dad` forever; the next proof should walk the ready local profiles one by one preserve-first and stop at the first real external chat success or at a repeated common blocker.
- Phase 33 added: Preserve-first rotating ready-account external chat proof until first real outside success
- Phase 33 planned: rotating preserve-first proof now targets the ready local profiles in order and stops at the first real outside chat success or one honest repeated/common blocker
- Phase 33 complete: the rotating preserve-first proof did not find one outside chat success, but it proved that the same blocker `selected_canary_not_usable` now repeats across the whole current ready-account set.
- Phase 33.1 inserted after Phase 33: Dedicated per-account desktop Chrome roots and isolated account-browser storage before external chat proof (URGENT)
- Phase 33.1 complete: the shared-root browser model is now retired locally, and the current machine has one dedicated browser root and one dedicated browser-data root per account before the next external chat proof.
- Phase 34 added: Preserve-first external chat proof on isolated per-account browser roots
- Phase 34 complete: the preserve-first isolated-root proof reached the first real outside chat success, with `dad` failing narrowly on `worker_chat_bootstrap_timeout` and `wife` succeeding on `/v1/chat/completions = 200` with `probe-ok`.
- Phase 35 added: Server transfer and revalidation of isolated per-account external chat proof
- Phase 35 complete: the live server transfer/revalidation wrote the Phase 35 artifact and latest-state truth, reached public `/healthz=200`, but stopped at `hold_rollout` because `tokenSource=missing`, Ubuntu SSH/listener truth was unconfirmed, and server browser-data copy reported `robocopy exit code 11` across all seven accounts.
- Phase 36 added: Server bearer token and Ubuntu SSH listener recovery before isolated external chat revalidation
- Phase 36 planned: three plans now target token source recovery/classification, Ubuntu SSH plus listener truth, operator-surface visibility, and one authenticated external isolated chat revalidation.
- Phase 36 complete: implementation/tests/operator surface passed, direct SSH retry to `77.66.186.75:2222` resolved token source and authenticated public `/v1/models=200`, but Ubuntu listeners `14021..14027` plus `14040` are missing, so the next blocker is `ubuntu_listeners_missing`.
- Phase 37 added: Restore Ubuntu reverse SSH tunnel listeners and complete external authenticated chat smoke after token/models proof
- Phase 37 planned: three plans now target hardened reverse-tunnel startup, Ubuntu-side listener proof, operator-surface visibility, and one authenticated external chat smoke after listeners are green.

### Pending Todos

- Restore local proxy TLS egress before final closeout of this local external-chat branch: `.planning/todos/pending/2026-04-12-restore-local-proxy-tls-egress-before-phase-27-closeout.md`
