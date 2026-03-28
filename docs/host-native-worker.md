# Host-Native Worker

Use this mode when a Docker browser worker gets stuck in Cloudflare or similar challenge loops.
The current setup now supports on-demand start through local PowerShell launcher scripts and a sing-box mixed proxy with automatic outbound failover.

## What Changes

- `control-api` still runs in Docker.
- The selected worker browser runs as a native Chromium browser on the Windows host.
- The worker agent connects to that browser over CDP instead of launching its own Docker Chromium instance.

## Three-Worker Setup

1. Start the stack with the host-native override:
   `docker compose -f infra/docker-compose.yml -f infra/docker-compose.host-native.yml up -d edge control-api session-client`
2. Ensure the local proxy share links exist in the ignored file:
   `infra/data/proxy/share-links.local.json`
3. Start the full proxied native worker pool only when you need it:
   `powershell -ExecutionPolicy Bypass -File .\infra\host-worker\start-proxied-host-pool.ps1 -SkipInstall`
4. Sign in directly inside the three native Edge or Chrome windows that open on the host.
5. Verify control-api can reach it:
   `http://127.0.0.1:8081/readyz`
6. Stop the pool again when you no longer need it:
   `powershell -ExecutionPolicy Bypass -File .\infra\host-worker\stop-proxied-host-pool.ps1`

## Notes

- The host-native workers use these ports:
  - `dad`: CDP `9222`, agent `4021`
  - `wife`: CDP `9223`, agent `4022`
  - `shared-1`: CDP `9224`, agent `4023`
- Browsers launch through the local mixed proxy at `127.0.0.1:7897`.
- sing-box automatically tests the three configured outbounds and routes through the healthy one.
- The verified on-demand path is script-driven, not automatic from `control-api`.
- The scheduler already distributes load across ready workers using least-recently-assigned selection, so once all three are signed in the app can spread sessions automatically.
- Docker restart actions do not apply to host-native workers.
- Fresh session bootstrap now expects `Temporary Chat` plus the latest configured reasoning model before the composer unlocks. The current default env is `WORKER_PREFERRED_REASONING_MODEL_LABELS=["GPT-5.4 Thinking"]`.
