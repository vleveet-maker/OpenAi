# Phase 35-01 Summary

- Extended [prepare-isolated-account-browser-roots.ps1](D:/OpenAi/infra/windows-block/prepare-isolated-account-browser-roots.ps1) so the same helper can now be reused for preserve-first server transfer without falling back to the retired shared browser-root layout.
- The helper now supports:
  - explicit `SourceBrowserDataBasePath`
  - explicit `SourceBrowserDataManifestPath`
  - optional `CopySourceBrowserData`
  - per-account `sourceBrowserDataPath`, `sourceBrowserDataExists`, `sourceBrowserDataCopied`, `copyResult`, and `copyError`
  - `serverTransferMode` and `serverAccountInventory`
- The helper keeps the isolated-account contract explicit:
  - one account = one browser root
  - one account = one browser-data root
  - `crossAccountReuseDetected` remains visible per account
- Added the canonical server wrapper [revalidate-server-isolated-external-chat-proof.ps1](D:/OpenAi/infra/windows-block/revalidate-server-isolated-external-chat-proof.ps1).
- Added the GitHub-first host handoff prompt [35-DEPLOYED-HOST-AGENT-TASK.md](D:/OpenAi/.planning/phases/35-server-transfer-and-revalidation-of-isolated-per-account-external-chat-proof/35-DEPLOYED-HOST-AGENT-TASK.md) in Russian with exact Windows/Ubuntu sync steps and the final server proof command.
- Updated docs so the server path now explicitly reuses the isolated per-account browser-root model instead of reopening the retired shared-root browser layout:
  - [windows-browser-block.md](D:/OpenAi/docs/windows-browser-block.md)
  - [windows-public-api-block.md](D:/OpenAi/docs/windows-public-api-block.md)
  - [remote-relay-server.md](D:/OpenAi/docs/remote-relay-server.md)
  - [internal-worker-ops.md](D:/OpenAi/docs/internal-worker-ops.md)

Checks run:

- PowerShell parser:
  - `infra/windows-block/prepare-isolated-account-browser-roots.ps1`
  - `infra/windows-block/revalidate-server-isolated-external-chat-proof.ps1`
  - result: `PARSER_OK`

Outcome:

- Phase 35-01 is complete.
- The canonical preserve-first server transfer harness and GitHub-first operator handoff are now ready for the live server run.
