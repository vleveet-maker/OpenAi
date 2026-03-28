---
phase: 07-proxy-backed-on-demand-host-worker-pool
status: complete
updated: 2026-03-28
---

# Phase 7 Context

## Why This Phase Exists

The archived v1.0 stack worked, but live household use exposed a practical login problem: Docker-managed browser workers could get trapped in Cloudflare challenge loops, while native Chromium on the Windows host behaved more like a normal household browser. At the same time, always leaving three native browser windows open was not acceptable for day-to-day use.

## Problem Statement

- The host-native fallback needs to launch only when it is actually needed.
- The three household browsers should route through several proxy provider links so the pool can survive a bad outbound.
- `control-api` should keep the same worker contract instead of learning a second scheduling model just for the host-native fallback.

## Chosen Fix

- Keep `control-api` and the household session and relay model unchanged.
- Run the fallback browsers as host-native Chromium profiles on the Windows host.
- Build a local sing-box mixed proxy from several share-link formats and let it prefer a healthy outbound automatically.
- Start and stop the full host-native pool on demand through verified PowerShell scripts.

## Files In Scope

- `infra/proxy/install-sing-box.ps1`
- `infra/proxy/start-sing-box.ps1`
- `infra/proxy/build-sing-box-config.mjs`
- `infra/host-worker/start-proxied-host-pool.ps1`
- `infra/host-worker/stop-proxied-host-pool.ps1`
- `infra/host-worker/start-host-native-worker.ps1`
- `infra/docker-compose.host-native.yml`
- `docs/host-native-worker.md`

## Exit Condition

This phase is complete when the operator can start the three host-native workers only when needed, those workers launch through a local proxy layer built from several share links with healthy-outbound failover, `control-api` reports them as normal workers, and live proxied relay succeeds on the household pool.
