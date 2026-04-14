---
phase: 36
slug: server-bearer-token-and-ubuntu-ssh-listener-recovery-before-isolated-external-chat-revalidation
status: complete
created: 2026-04-14
---

# Phase 36 Research

## Question

What do we need to know to plan Phase 36 well?

## Current Truth From Phase 35

Phase 35 proved that the local isolated browser-root model was ready for server revalidation, but the server-side run stayed `hold_rollout`.

Known good:

- Local Phase 34 proved real outside chat on `http://77.66.186.75/v1/chat/completions` with `200` and `probe-ok`.
- Phase 35 local validation passed: parser checks, focused tests, full `control-api` suite, and build.
- Phase 35 operator surface was confirmed through the latest route and `/internal/admin`.
- Public `GET http://77.66.186.75/healthz` returned `200`.
- Windows repo path was recorded as `D:\OpenAi`.
- Windows commit was recorded as `9f0d8b2`.
- Ubuntu repo path was recorded as `/opt/owmcgp-remote-relay/services/control-api`.

Known blockers:

- `tokenSource = missing`, so authenticated `/v1/models` and `/v1/chat/completions` were not proven.
- Ubuntu SSH did not come up during the run, so Ubuntu commit, `nginx`, and listener truth could not be rechecked.
- Reverse-tunnel task was `Running`, but Ubuntu listener truth for `14021..14027` and `14040` was not confirmed.
- All seven server browser-data copy attempts returned `robocopy exit code 11`; isolated roots were still prepared and launched.

## Planning Implications

Phase 36 must not reopen local browser architecture work. The local architecture already produced one outside chat success in Phase 34. The next useful work is to make the server proof runnable and trustworthy:

- bearer token discovery must produce a source label, not the token value
- Ubuntu SSH must be verified directly before using it as proof
- listener truth must be checked on Ubuntu, not inferred from Windows task state
- reverse tunnels must be considered live only when Ubuntu reports the expected listeners
- external smoke must target `http://77.66.186.75`
- the final phase verdict must be exactly `externally_ready` or `hold_rollout`

## Existing Assets To Reuse

- `infra/windows-block/prove-external-chat-on-isolated-account-browser-roots.ps1`
- `infra/windows-block/revalidate-server-isolated-external-chat-proof.ps1`
- `infra/windows-block/start-reverse-tunnels.ps1`
- `infra/windows-block/stop-reverse-tunnels.ps1`
- `infra/windows-block/probe-public-api.ps1`
- `services/control-api/src/routes/internal-post-phase34-server-isolated-chat-transfer.ts`
- `services/control-api/src/routes/internal-admin-page.ts`
- `.planning/phases/35-server-transfer-and-revalidation-of-isolated-per-account-external-chat-proof/35-SERVER-ISOLATED-CHAT-TRANSFER-SUMMARY.json`
- `.planning/phases/35-server-transfer-and-revalidation-of-isolated-per-account-external-chat-proof/35-VERIFICATION.md`

## Proposed Phase 36 Shape

Use three plans:

- `36-01`: Add a bounded token/SSH/listener recovery wrapper and GitHub-first operator prompt.
- `36-02`: Add latest-state route and `/internal/admin` section for Phase 36 truth.
- `36-03`: Run the live recovery and then rerun the isolated external chat revalidation only when token plus listener truth are sufficient.

## Artifact Contract

The durable Phase 36 artifact should include:

- `generatedAt`
- `scriptCompatibilityVersion`
- `githubBranch`
- `windowsRepoPath`
- `windowsCommit`
- `ubuntuSshReachability[]`
- `ubuntuRepoPath`
- `ubuntuCommit`
- `ubuntuNginxConfigOk`
- `canonicalPublicUpstream`
- `tokenResolution.status`
- `tokenResolution.source`
- `tokenResolution.secretValueRecorded = false`
- `reverseTunnelTask`
- `ubuntuListenerTruth`
- `externalSmoke.healthz`
- `externalSmoke.models`
- `externalSmoke.chatCompletions`
- `phase35CarryForward.robocopyExitCode11`
- `revalidationAttempted`
- `verdict`
- `nextBlocker`

The artifact must never store bearer-token values, SSH passwords, cookies, local storage, or profile secrets.

## Risks

- SSH may be reachable on one public IP but not the other; the wrapper should try the known external host candidates and record per-host truth.
- Token may exist only on Ubuntu; that is acceptable, but only the source label should be stored.
- Windows reverse-tunnel task state can be misleading; listener truth must come from Ubuntu `ss`.
- `robocopy exit code 11` may become the next blocker after token/SSH are fixed; Phase 36 should record it honestly instead of expanding scope into a broad profile-copy repair.

## Recommendation

Plan Phase 36 as a narrow operational recovery phase. Success is not "all server transfer debt gone"; success is either:

- token, SSH, listeners, and external chat are proven, producing `externally_ready`
- or the phase records the next exact blocker after token/SSH/listener recovery, producing `hold_rollout`
