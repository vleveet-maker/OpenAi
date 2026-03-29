# Host-Native Worker

Use this mode when Docker browser workers are less reliable than native Chromium on the Windows host.

## Runtime Policy

- `Start pool` uses the alternate desktop non-visible runtime.
- `Start visible login` is used only for first login or manual reauthentication.
- `Complete login and validate` returns the same profile to alternate-desktop operation and immediately records a non-visible validation result.
- Routine household use should run without any visible desktop browser.
- If the non-visible runtime loses auth after manual login, treat that as runtime architecture review evidence rather than a signal to keep silently retrying.

## Phase 10.2 Runtime Decision

- Phase 10.2 runtime decision: `block_phase_11_pending_new_runtime_design`.
- The current host hidden runtime is not selected for rollout because live evidence showed challenge or non-usable startup behavior after the visible-auth handoff.
- The explicit `docker_headed_xvfb` candidate is also not selected: a live bootstrap probe on `worker-dad` returned `bootstrap_challenge_detected` with a Cloudflare challenge URL.
- Phase 11 must not use the current host hidden runtime or the current Docker/Xvfb candidate as its assumed steady-state path.
- The next required step is a new runtime design phase for a more reliable non-visible browser runtime.

## Three-Worker Setup

1. Start the stack with the host-native override:
   `docker compose -f infra/docker-compose.yml -f infra/docker-compose.host-native.yml up -d edge control-api session-client`
2. Ensure the local proxy share links exist in the ignored file:
   `infra/data/proxy/share-links.local.json`
3. Open the internal admin surface:
   `http://127.0.0.1:8081/internal/admin`
4. Use `Start pool` when you need the proxied native worker pool in alternate desktop non-visible runtime.
5. If a worker needs first login or reauth, use `Start visible login` or `Start visible reauth` for that worker.
6. Finish the manual step in the visible browser, then press `Complete login and validate`.
7. Use `Validate non-visible runtime` for later rechecks or repeatability passes after that first complete-and-validate hand-off.
8. Use `Stop pool` when the household browsers are no longer needed.

## Pool Status Meanings

- `idle`: the proxy is not listening and the host workers are down.
- `starting`: start was requested and the system is waiting for the proxy and hidden workers to come online.
- `ready`: proxy is listening and all configured host workers are reachable.
- `degraded`: partial success. Some part of the pool is reachable, but not all of it.
- `stopping`: stop was requested and the system is waiting for workers or proxy to shut down.
- `failed`: the last lifecycle action failed and the last error should be reviewed in internal admin.

## Validation Gate

- This setup is not considered live-complete until at least one worker has been manually logged in visibly, switched back to alternate desktop runtime, and then reached a repeatability gate of `2/2` consecutive successful non-visible validations with a real relay pass.
- The operator-facing validation path is now:
  - `Start visible login` or `Start visible reauth`
  - complete the manual ChatGPT step
  - `Complete login and validate`
  - `Validate non-visible runtime` for additional repeatability passes
- Repeatability meanings are now:
  - `unstable (0/2)`: not rollout-ready
  - `provisional (1/2)`: one good pass exists, but it is not yet trusted
  - `stable (2/2)`: repeated proof is good enough to reopen rollout smoke
- Any auth, bootstrap, relay, or worker-assignment failure resets the gate back to `unstable`.
- The bounded rescue/proof order is now:
  - `wife` first
  - `shared-1` second
  - `dad` third
- Phase 11 is blocked again. The earlier one-off `wife` success from Phase 10.5 is now historical evidence only, not a rollout gate by itself.
- Every probe appends a row to `infra/data/host-worker-logs/runtime-matrix.jsonl` so alternate-desktop viability is evidence-backed instead of anecdotal.

## Current Phase 10.5.1.1 Result

- `wife` durable profile failed twice in a row after controlled alternate-desktop restarts:
  - pass 1 -> `bootstrap_navigation_failed @ navigation`
  - pass 2 -> `bootstrap_navigation_failed @ navigation`
- `wife` fresh-profile diagnostic proved that visible auth is alive:
  - visible bootstrap reached `Temporary Chat`
  - preferred model stayed `GPT-5.4 Thinking`
  - but `Complete login and validate` still returned `bootstrap_navigation_failed @ navigation` in alternate desktop
- `shared-1` still matches the same durable alternate-desktop navigation tail: `bootstrap_navigation_failed @ navigation`.
- `dad` remains the auth-recovery target. The latest control-plane validation returns `bootstrap_auth_required @ auth_check`.
- Phase 11 stays blocked until a follow-up stabilization phase proves one worker at `Repeatability: stable (2/2)` and fixes the alternate-desktop hand-off/runtime tail rather than only refreshing cookies.

## Notes

- The host-native workers use these ports:
  - `dad`: CDP `9222`, agent `4021`
  - `wife`: CDP `9223`, agent `4022`
  - `shared-1`: CDP `9224`, agent `4023`
- Browsers launch through the local mixed proxy at `127.0.0.1:7897`.
- sing-box automatically tests the three configured outbounds and routes through the healthy one.
- Docker restart actions do not apply to host-native workers.
- Alternate desktop runtime metadata is written under `infra/data/host-worker-state/<workerId>.json`.
- Fresh session bootstrap now expects `Temporary Chat` plus the latest configured reasoning model before the composer unlocks. The current default env is `WORKER_PREFERRED_REASONING_MODEL_LABELS=["GPT-5.4 Thinking","GPT-5.4"]`.
- Current ChatGPT UI drift may surface `Temporary Chat` as a direct control or as a model menu entry. Selector maintenance for both relay and bootstrap is centralized in the worker selector-map files instead of being scattered across runner logic.
