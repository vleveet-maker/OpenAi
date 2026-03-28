# Roadmap: One Hour With My ChatGPT

## Overview

The roadmap starts by standing up a multi-worker browser foundation that can safely host several persistent ChatGPT sessions for household use, then layers timed session routing, core chat relay, resilience, and final guardrails. Each phase isolates one major delivery risk so the system can be proven step by step instead of mixing worker orchestration, UX, and recovery concerns all at once.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Managed Worker Pool Foundation** - Stand up several named browser workers in isolated containers
- [x] **Phase 2: Timed Session Routing** - Start 60-minute sessions and pin users to the correct worker
- [x] **Phase 3: Core Chat Relay** - Deliver the main send and receive chat loop on an assigned worker
- [x] **Phase 4: Resilience and Worker Recovery** - Handle failures, retries, reconnect, and worker restarts
- [x] **Phase 5: Guardrails and Observability** - Lock down access boundaries and instrument the worker pool
- [x] **Phase 5.1: Internal browser access for manual ChatGPT login and reauthentication (INSERTED)** - Add an internal-only path for opening worker browsers and completing manual login or reauth

## Phase Details

### Phase 1: Managed Worker Pool Foundation
**Goal:** Stand up a multi-worker, containerized browser pool with persistent profiles and internal operator control.
**Depends on:** Nothing (first phase)
**Requirements:** WORK-01, WORK-02, WORK-03, WORK-04, ADMN-01, ADMN-02, ADMN-04, SECU-02, SECU-03
**Success Criteria** (what must be TRUE):
  1. Admin can run several named workers, each isolated in its own Docker container with persistent profile storage.
  2. Admin can manually authenticate each worker and view statuses `starting`, `ready`, `busy`, `disconnected`, and `reauth_required`.
  3. Browser profiles, cookies, and recovery paths remain server-side and internal only.
**Plans:** 3 plans

Plans:
- [x] 01-01: Run a short architecture spike for worker topology, runtime baseline, and durable profile storage
- [x] 01-02: Build the multi-worker manager and internal status API
- [x] 01-03: Build the operator login and recovery path and document runtime candidates

### Phase 2: Timed Session Routing
**Goal:** Let a user start a bounded 60-minute session on the correct available worker and stay pinned to it.
**Depends on:** Phase 1
**Requirements:** SESS-01, SESS-02, SESS-03, SESS-04
**Success Criteria** (what must be TRUE):
  1. User can start a session only when an assigned or available worker is `ready`.
  2. User stays attached to the same worker for the full active session and sees remaining time update.
  3. User can end the session manually, and new message submission is blocked after manual end or expiry.
**Plans:** 3 plans

Plans:
- [x] 02-01: Design worker assignment and session reservation rules
- [x] 02-02: Build the session lifecycle API and timer enforcement
- [x] 02-03: Build the user-side flow for session start, countdown display, and manual end

### Phase 3: Core Chat Relay
**Goal:** Relay user messages to the assigned worker browser and return assistant replies in the same thread.
**Depends on:** Phase 2
**Requirements:** CHAT-01, CHAT-02, CHAT-03, CHAT-04
**Success Criteria** (what must be TRUE):
  1. User can send a text message from the application to the assigned worker's ChatGPT browser.
  2. User receives the corresponding assistant reply back in the same conversation thread.
  3. User sees a pending or streaming state while a reply is being generated and can review the full active-session history.
**Plans:** 3 plans

Plans:
- [x] 03-01: Define the message relay protocol between application, backend, and worker browser
- [x] 03-02: Implement outbound message submission and inbound reply capture
- [x] 03-03: Render active conversation history and pending states in the application

### Phase 4: Resilience and Worker Recovery
**Goal:** Make the relay robust against transient failures, temporary client disconnects, and single-worker crashes.
**Depends on:** Phase 3
**Requirements:** RELY-01, RELY-02, RELY-03, ADMN-03
**Success Criteria** (what must be TRUE):
  1. User sees a clear error state when delivery or response capture fails on the worker.
  2. Transient relay failures retry safely without creating duplicate user messages.
  3. User can reconnect to the same active worker after a temporary interruption, and admin can restart a failed worker cleanly.
**Plans:** 3 plans

Plans:
- [x] 04-01: Add relay acknowledgements, retry rules, and failure classification
- [x] 04-02: Add reconnect flow and same-worker session rehydration
- [x] 04-03: Add individual worker restart and recovery workflows

### Phase 5: Guardrails and Observability
**Goal:** Prevent unsafe access patterns and make the worker pool observable for operators and infrastructure.
**Depends on:** Phase 4
**Requirements:** SECU-01, OBSV-01, OBSV-02
**Success Criteria** (what must be TRUE):
  1. End users cannot reach the raw worker browser UI.
  2. Operator can inspect recent worker lifecycle events and session failures from the internal admin surface.
  3. The system exposes health signals that container or host monitors can consume without parsing the browser UI.
**Plans:** 2 plans

Plans:
- [x] 05-01: Enforce user and admin boundary at the app and reverse-proxy layers
- [x] 05-02: Add event trail, health endpoints, and monitoring hooks

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 5.1

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Managed Worker Pool Foundation | 3/3 | Complete | 2026-03-27 |
| 2. Timed Session Routing | 3/3 | Complete | 2026-03-27 |
| 3. Core Chat Relay | 3/3 | Complete | 2026-03-27 |
| 4. Resilience and Worker Recovery | 3/3 | Complete | 2026-03-27 |
| 5. Guardrails and Observability | 2/2 | Complete | 2026-03-27 |
| 5.1. Internal browser access for manual ChatGPT login and reauthentication | 3/3 | Complete | 2026-03-28 |

### Phase 05.1: Internal browser access for manual ChatGPT login and reauthentication (INSERTED)

**Goal:** Give the operator an internal-only way to open a live worker browser for first login and reauthentication without exposing raw browser access publicly.
**Requirements:** ADMN-04, SECU-03
**Depends on:** Phase 5
**Success Criteria** (what must be TRUE):
  1. Operator can start a time-bounded browser access session for one worker from the internal admin surface.
  2. Operator can drive the worker browser through an internal-only viewer path, complete ChatGPT login or reauth manually, and return the worker to `ready`.
  3. Public traffic cannot reach raw browser viewer routes, VNC services, or worker recovery tools.
**Plans:** 3/3 plans complete

Plans:
- [x] 05.1-01: Add worker viewer runtime and browser-access health metadata
- [x] 05.1-02: Add secure browser access session routes and protected internal proxying
- [x] 05.1-03: Add operator browser-access controls, docs, and smoke coverage
