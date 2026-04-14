# Phase 35 Research

## Problem

Phase 34 already answered the local architecture question.

The new isolated per-account browser-root model is now the proven local baseline:

- each account has its own dedicated desktop Chrome root
- each account has its own dedicated browser-data root
- the old shared-root browser model is retired as untrustworthy
- one real outside `POST /v1/chat/completions = 200` has already been proven locally on `wife`

So Phase 35 should not reopen local architecture debates.

The honest next move is to transfer that same proven shape to the deployed server path:

- Windows browser-block host for the browser runtime
- Ubuntu public-owner host for the public API path

and then rerun the same outside-chat proof there.

## Scope

Phase 35 is a server-transfer and server-revalidation phase.

It does:

- stay GitHub-first for all cross-host handoff
- reuse the isolated per-account browser-root model proven in Phase 34
- treat Windows browser-block host plus Ubuntu public-owner host as one tracked execution path
- inventory the preserved server accounts before choosing the proof order
- transfer the isolated-browser shape preserve-first to a canary subset first
- rerun public `/healthz`, `/v1/models`, and `/v1/chat/completions` against `http://77.66.186.75`
- stop on the first real server-side outside-chat success or record one exact blocker

It does not:

- go back to the retired shared browser-root layout
- delete profiles
- clear cookies or local storage
- mass relogin all server accounts
- blindly broad-start the full server pool before one canary path is explicit
- treat local `externally_ready` as if it already proved the server

## Starting Truth

What is already proven:

- local external API proof is real on the isolated per-account browser-root baseline
- `wife` produced the first honest outside `/v1/chat/completions = 200`
- canonical public path remains `internet -> MikroTik -> Ubuntu nginx -> 127.0.0.1:4010`
- reverse SSH tunnels remain runtime-critical for outside chat
- GitHub-first handoff is now the standing cross-host rule

What is not yet proven:

- exact repo-backed server transfer of the isolated per-account browser model
- exact preserved-account inventory on the Windows server under that new model
- one server-side outside-chat success on the same isolated baseline

## Recommended Server Execution Shape

### 1. GitHub-first sync on both hosts

The Windows browser-block host and the Ubuntu relay host must both sync the same tracked branch/commit before the live run.

The phase artifact should record:

- Windows repo path
- Ubuntu repo path
- Windows commit hash
- Ubuntu commit hash

### 2. Preserve-first server account inventory before proof order

The local success on `wife` is useful, but the server must still tell the truth about its own preserved account set.

Phase 35 should therefore inventory the server-side preserved accounts first and then build an ordered canary list:

1. `wife` when present and ready
2. `dad`
3. `shared-1`
4. `shared-2`
5. `shared-3`
6. `shared-4`
7. `shared-5`
7. any additional preserved server-only accounts after the known local set

That order keeps the first locally successful account near the front without assuming the server inventory is identical to the local machine.

### 3. Transfer the isolated model canary-first

The server should not jump straight to a broad migration of every preserved account.

The safer contract is:

- materialize isolated browser roots and isolated browser-data roots for the selected server canary subset first
- record the exact source browser/profile paths used for each migrated account
- prove there is no cross-account root or browser-data reuse
- only then run the outside-chat proof path

### 4. Revalidate the same outside-chat contract

The revalidation target remains the real public API:

- `GET /healthz`
- `GET /v1/models`
- `POST /v1/chat/completions`

against:

- `http://77.66.186.75`

and with bearer-token resolution from whichever host actually has the valid token.

## Artifact Contract

Phase 35 should produce one durable server-transfer artifact with at least:

- `githubBranch`
- `windowsRepoPath`
- `ubuntuRepoPath`
- `windowsCommit`
- `ubuntuCommit`
- `serverAccountInventory[]`
- `accountOrder`
- `transferResults[]`
- `preflightAccounts[]`
- `attempts[]`
- `successfulWorkerId`
- `tokenSource`
- `commonBlocker`
- `verdict`

Each `transferResults[]` entry should capture:

- `workerId`
- `sourceBrowserDataPath`
- `browserRootPath`
- `browserDataPath`
- `copyResult`
- `launchResult`
- `crossAccountReuseDetected`

Each `attempts[]` entry should capture:

- `workerId`
- `surfaceClassification`
- `tunnelStatus`
- `externalSmoke.healthz`
- `externalSmoke.models`
- `externalSmoke.chat`
- `stopReason`

## Recommended Operator Surface

Recommended latest-state path:

- `infra/data/post-phase34-server-isolated-chat-transfer/latest.json`

Recommended route:

- `GET /internal/post-phase34-server-isolated-chat-transfer/latest`

Recommended admin section:

- `Latest post-phase34 server isolated external chat proof`

## Requirement IDs

Use:

- `STRV-01`
- `STRV-02`
- `STRV-03`
- `STRV-04`

## Planner Guidance

- Do not reopen the retired shared browser-root layout.
- Treat the local Phase 34 proof as the template, not as the final server proof.
- Keep the live run preserve-first and canary-first.
- Inventory server accounts before assuming the exact proof order.
- Stop on the first real server-side outside-chat success.
- If no account succeeds, record one exact common blocker or exhaustion reason.
