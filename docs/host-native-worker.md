# Host-Native Worker

Use this mode when a Docker browser worker gets stuck in Cloudflare or similar challenge loops.
The current setup now supports on-demand start through the internal admin page, backed by a local sing-box mixed proxy with automatic outbound failover.

## What Changes

- `control-api` still runs in Docker.
- The selected worker browser runs as a native Chromium browser on the Windows host.
- The worker agent connects to that browser over CDP instead of launching its own Docker Chromium instance.

## Three-Worker Setup

1. Start the stack with the host-native override:
   `docker compose -f infra/docker-compose.yml -f infra/docker-compose.host-native.yml up -d edge control-api session-client`
2. Ensure the local proxy share links exist in the ignored file:
   `infra/data/proxy/share-links.local.json`
3. Open the internal admin surface:
   `http://127.0.0.1:8081/internal/admin`
4. Use `Start pool` when you need the proxied native worker pool.
5. Sign in directly inside the three native Edge or Chrome windows that open on the host.
6. Verify control-api can reach it:
   `http://127.0.0.1:8081/readyz`
7. Use `Stop pool` from the same internal admin page when you no longer need the browsers.

## Pool Status Meanings

- `idle`: the proxy is not listening and the host workers are down.
- `starting`: start was requested and the system is waiting for the proxy and browsers to come online.
- `ready`: proxy is listening and all configured host workers are reachable.
- `degraded`: partial success. Some part of the pool is reachable, but not all of it.
- `stopping`: stop was requested and the system is waiting for workers or proxy to shut down.
- `failed`: the last lifecycle action failed and the last error should be reviewed in internal admin.

## Operator Rules

- `degraded` means partial success and this phase does not auto-rollback or auto-retry.
- The PowerShell scripts remain fallback tools if the internal admin page is unavailable:
  - `powershell -ExecutionPolicy Bypass -File .\infra\host-worker\start-proxied-host-pool.ps1 -SkipInstall`
  - `powershell -ExecutionPolicy Bypass -File .\infra\host-worker\stop-proxied-host-pool.ps1`
- Internal admin is now the primary operator path for pool lifecycle, not the scripts.

## Notes

- The host-native workers use these ports:
  - `dad`: CDP `9222`, agent `4021`
  - `wife`: CDP `9223`, agent `4022`
  - `shared-1`: CDP `9224`, agent `4023`
- Browsers launch through the local mixed proxy at `127.0.0.1:7897`.
- sing-box automatically tests the three configured outbounds and routes through the healthy one.
- The verified on-demand path is exposed through `http://127.0.0.1:8081/internal/admin`.
- The scheduler already distributes load across ready workers using least-recently-assigned selection, so once all three are signed in the app can spread sessions automatically.
- Docker restart actions do not apply to host-native workers.
- Fresh session bootstrap now expects `Temporary Chat` plus the latest configured reasoning model before the composer unlocks. The current default env is `WORKER_PREFERRED_REASONING_MODEL_LABELS=["GPT-5.4 Thinking"]`.
