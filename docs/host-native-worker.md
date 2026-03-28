# Host-Native Worker

Use this mode when Docker browser workers are less reliable than native Chromium on the Windows host.

## Runtime Policy

- `Start pool` uses hidden runtime only.
- `Start visible login` is used only for first login or manual reauthentication.
- `Complete login -> hidden` returns the same durable worker profile to routine hidden operation.
- Routine household use should run without any visible desktop browser.
- If hidden runtime loses auth after manual login, treat that as runtime architecture review evidence rather than a signal to keep silently retrying.

## Three-Worker Setup

1. Start the stack with the host-native override:
   `docker compose -f infra/docker-compose.yml -f infra/docker-compose.host-native.yml up -d edge control-api session-client`
2. Ensure the local proxy share links exist in the ignored file:
   `infra/data/proxy/share-links.local.json`
3. Open the internal admin surface:
   `http://127.0.0.1:8081/internal/admin`
4. Use `Start pool` when you need the proxied native worker pool in hidden runtime only.
5. If a worker needs first login or reauth, use `Start visible login` or `Start visible reauth` for that worker.
6. Finish the manual step in the visible browser, then press `Complete login -> hidden`.
7. Use `Stop pool` when the household browsers are no longer needed.

## Pool Status Meanings

- `idle`: the proxy is not listening and the host workers are down.
- `starting`: start was requested and the system is waiting for the proxy and hidden workers to come online.
- `ready`: proxy is listening and all configured host workers are reachable.
- `degraded`: partial success. Some part of the pool is reachable, but not all of it.
- `stopping`: stop was requested and the system is waiting for workers or proxy to shut down.
- `failed`: the last lifecycle action failed and the last error should be reviewed in internal admin.

## Validation Gate

- This setup is not considered live-complete until at least one worker has been manually logged in visibly, switched back to hidden runtime, and passed relay smoke without any visible desktop browser.
- The canonical maintainer probe is:
  `powershell -ExecutionPolicy Bypass -File .\infra\host-worker\test-hidden-runtime-transition.ps1 -WorkerId dad`
- If the probe reports `hidden_runtime_auth_unstable`, the correct next step is runtime architecture review.

## Notes

- The host-native workers use these ports:
  - `dad`: CDP `9222`, agent `4021`
  - `wife`: CDP `9223`, agent `4022`
  - `shared-1`: CDP `9224`, agent `4023`
- Browsers launch through the local mixed proxy at `127.0.0.1:7897`.
- sing-box automatically tests the three configured outbounds and routes through the healthy one.
- Docker restart actions do not apply to host-native workers.
- Fresh session bootstrap now expects `Temporary Chat` plus the latest configured reasoning model before the composer unlocks. The current default env is `WORKER_PREFERRED_REASONING_MODEL_LABELS=["GPT-5.4 Thinking","GPT-5.4"]`.
- Current ChatGPT UI drift may surface `Temporary Chat` as a direct control or as a model menu entry. Selector maintenance for both relay and bootstrap is centralized in the worker selector-map files instead of being scattered across runner logic.
