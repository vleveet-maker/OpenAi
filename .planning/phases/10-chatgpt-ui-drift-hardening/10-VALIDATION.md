---
phase: 10-chatgpt-ui-drift-hardening
created: 2026-03-28
status: planning
---

# Phase 10 Validation Strategy

## Goal

Prove that relay and fresh-chat bootstrap behave predictably against the current ChatGPT UI, and that selector maintenance is centralized enough to absorb future drift without hunting through unrelated files.

## Validation Dimensions

### 1. Selector Architecture

- Relay and bootstrap selector candidates are grouped and named in dedicated files.
- Runner logic consumes selector groups instead of embedding DOM assumptions inline.
- Failure codes identify which selector group failed.

### 2. Automated Worker Coverage

- `workers/agent` tests cover relay selector fallback and granular failure codes.
- `workers/agent` tests cover temporary-chat entry aliases, preferred-model alias handling, and bootstrap failure-code mapping.

### 3. Backend Integration Coverage

- `services/control-api` tests still parse worker relay/bootstrap responses correctly after failure-code refinement.
- No retry, observability, or session code path silently collapses detailed worker failures back into opaque generic outcomes.

### 4. Live Household Verification

- A targeted live verification path exercises relay against `dad`, `wife`, and `shared-1`.
- A targeted live verification path confirms fresh-chat bootstrap still reaches `Temporary Chat` plus the preferred reasoning model on a logged-in worker.
- `dad` must be included explicitly because it is the known residual drift case.

## Expected Evidence

- Green `workers/agent` tests and build
- Green `services/control-api` tests and build if worker result contracts change
- A recorded live verification outcome for all three workers during execution
- Updated operator or maintainer docs if the selector maintenance path changes

## Not Covered Here

- Repeatable operator smoke history and last-smoke reporting belong to Phase 11.
- Billing, product UX expansion, and public multi-chat surface changes are outside this phase.
