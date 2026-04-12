# 14 Verification

## Final Verdict

`root_cause_confirmed`

## Confirmed Live Truth

- The live Phase 14 harness ran on the deployed Windows browser-block host.
- The deployed host wrote `14-ROOT-CAUSE-SUMMARY.json` and `14-ROOT-CAUSE-SUMMARY.md`.
- The zero-ready baseline was explicit before the canary probe:
  - `ready = 0/9`
  - `disconnected = 9/9`
  - dominant blocker class = `disconnected`
- The canary hop ladder is now explicit too:
  - `loopback_api` passed `200/200/200`
  - first failing hop = `windows_edge_forced_host`
  - `ubuntu_public_owner` returned `502` on `healthz`, `v1/models`, and `v1/chat/completions`
  - public owner response header = `Server: nginx/1.18.0 (Ubuntu)`
- Operator-surface confirmation is complete:
  - `GET /internal/zero-ready-root-cause/latest` returned the current latest result
  - `/internal/admin` showed `Latest zero-ready root cause`
- Preserve-first safety held during the run:
  - profiles were not deleted
  - cookies and local storage were not cleared
  - no mass restart or relogin happened
  - canary `shared-6` was stopped again after the bounded probe
  - on `4040`, `shared-6` returned to `agentListening=false` and `browserListening=false`
  - port `4028` was no longer listening

## Requirement Status

- `WROOT-01`: complete
  - the phase now has one durable zero-ready baseline artifact with worker-level disconnected classification instead of only the old `0/9 ready` snapshot
- `WROOT-02`: complete
  - the hop-aware canary artifact now names `windows_edge_forced_host` as the first failing hop, while `loopback_api` stayed green and the public owner `ubuntu_public_owner` returned `502`
- `WROOT-03`: complete
  - `GET /internal/zero-ready-root-cause/latest` and `/internal/admin` both showed the same latest root-cause result
- `WROOT-04`: complete
  - the phase ends with one explicit final verdict: `root_cause_confirmed`

## Repo/Runtime Parity Note

- The deployed host needed one compat fix before the live wrapper would run cleanly: `investigate-zero-ready-root-cause.ps1` had to forward named parameters into `probe-public-api.ps1` instead of relying on array-based positional forwarding.
- That wrapper-invocation parity fix is now synced back into the repo copy of `infra/windows-block/investigate-zero-ready-root-cause.ps1`.

## Local Reconstruction Note

- The local copies of `14-ROOT-CAUSE-SUMMARY.json`, `14-ROOT-CAUSE-SUMMARY.md`, and `infra/data/zero-ready-root-cause/latest.json` are reconstructed from the operator report because the raw deployed-host JSON and Markdown artifacts were not synced back into this checkout.

## Remaining Rollout Blocker

1. Phase 14 is complete, and the remaining rollout blocker is no longer missing instrumentation: the baseline is already `0/9 ready`, `9/9 disconnected` before the canary path, and the first failing hop is `windows_edge_forced_host` even though `loopback_api` stays green.
2. The next phase should remediate the disconnected baseline and the forced-Host/public-owner edge failure path instead of repeating more visibility work.
