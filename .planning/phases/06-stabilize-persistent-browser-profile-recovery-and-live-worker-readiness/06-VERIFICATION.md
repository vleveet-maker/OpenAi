---
phase: 06-stabilize-persistent-browser-profile-recovery-and-live-worker-readiness
verified: 2026-03-28T09:44:00+03:00
status: passed
score: 5/5 must-haves verified
---

# Phase 06: Stabilize Persistent Browser Profile Recovery and Live Worker Readiness Verification Report

Phase goal: make rebuilt and restarted workers recover their persistent Chromium profiles and return the full pool to `ready` without manual cleanup.

Verified: 2026-03-28T09:44:00+03:00
Status: passed

## Goal Achievement

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Worker runtime startup removes stale Chromium singleton artifacts before Playwright launches. | x VERIFIED | `infra/worker-runtime/start-worker-runtime.sh` |
| 2 | Worker runtime no longer uses watch-mode startup in the container runtime path. | x VERIFIED | `infra/worker-runtime/start-worker-runtime.sh` |
| 3 | Rebuilt worker containers recover to a full ready pool. | x VERIFIED | live `GET http://127.0.0.1:8081/readyz` after `docker compose up -d --build --force-recreate worker-dad worker-wife worker-shared-1` returned `workerStatusCounts.ready = 3` |
| 4 | A single worker restart recovers back to a full ready pool. | x VERIFIED | live `GET http://127.0.0.1:8081/readyz` after `docker restart worker-dad` returned `workerStatusCounts.ready = 3` |
| 5 | Worker package checks still pass after the runtime hardening change. | x VERIFIED | `cmd /c npm.cmd test` and `cmd /c npm.cmd run build` in `workers/agent` |

Score: 5/5 truths verified

## Automated Checks

| Command | Status |
|---------|--------|
| `cmd /c npm.cmd test` in `workers/agent` | x PASSED |
| `cmd /c npm.cmd run build` in `workers/agent` | x PASSED |
| `docker compose -f infra/docker-compose.yml config` | x PASSED |

## Live Smoke Checks

| Check | Result |
|------|--------|
| `docker compose -f infra/docker-compose.yml up -d --build --force-recreate worker-dad worker-wife worker-shared-1` | completed |
| `GET http://127.0.0.1:8081/readyz` after recreate | `200`, `workerStatusCounts.ready = 3` |
| `GET http://127.0.0.1:8081/internal/workers` after recreate | all three workers reported `status = ready` |
| `docker restart worker-dad` | completed |
| `GET http://127.0.0.1:8081/readyz` after restart | `200`, `workerStatusCounts.ready = 3` |

## Requirements Coverage

| Requirement | Status |
|-------------|--------|
| WORK-03: Each worker exposes one of the statuses `starting`, `ready`, `busy`, `disconnected`, or `reauth_required` | x HARDENED |
| WORK-04: Each worker keeps a persistent browser profile across container restarts | x HARDENED |
| OBSV-02: System exposes health signals that container or host monitors can consume without parsing the browser UI | x HARDENED |

## Residual Risk

The final real-world household smoke test is still the same one we already wanted: log into ChatGPT through the noVNC viewer on a live worker and verify the preserved profile remains authenticated on the next access session.
