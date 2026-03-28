---
phase: 06-stabilize-persistent-browser-profile-recovery-and-live-worker-readiness
status: complete
updated: 2026-03-28
---

# Phase 6 Context

## Why This Phase Exists

Phase 05.1 proved internal browser access, but live Docker smoke uncovered a runtime gap: after worker container recreation, some persistent Chromium profiles could come back as `disconnected` because stale singleton lock artifacts remained on the mounted profile and the worker runtime was still launching through a watch-mode process tree.

## Problem Statement

- Browser workers must come back `ready` after container recreate or restart without manual profile cleanup.
- `readyz` should reflect a healthy full pool again once workers finish a normal cold start.
- Operator recovery should not depend on entering containers and deleting Chromium lock files by hand.

## Chosen Fix

- Move the worker runtime to a single-process startup path using `npm run start` instead of `tsx watch`.
- Perform shell-level Chromium singleton cleanup in the worker runtime entrypoint before the Playwright browser boots.
- Re-verify with live Docker recreate and single-worker restart smoke checks.

## Files In Scope

- `infra/worker-runtime/start-worker-runtime.sh`
- `infra/docker-compose.yml`
- `workers/agent/src/browser-launch.ts`
- `workers/agent/test/browser-access-runtime.test.ts`

## Exit Condition

This phase is complete when a rebuilt worker stack reaches `readyz = ready` with all three workers `ready` after recreate, and a follow-up single-worker restart returns the pool to full readiness without manual profile intervention.
