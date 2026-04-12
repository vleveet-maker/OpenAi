# Persistent Disconnected Runtime Follow-Up Summary

- Generated: `2026-04-01` (date-level repo sync from the deployed-host operator report; the exact remote `generatedAt` was not copied back into this checkout)
- Script compatibility version: `phase19-persistent-followup-v1`
- Upstream compatibility version: `phase18-runtime-remediation-v1`
- Verdict: `hold_rollout`
- Public API base URL: `http://77.66.186.75`
- Canary worker: `shared-6`
- Summary: Hold rollout. The Phase 19 follow-up started at `0/9` ready, stayed at `0/9` ready, the dominant runtime blocker remained `disconnected`, the first failing hop remained `windows_edge_forced_host`, and the public owner still returned `502`.

## Follow-Up Result

- preFollowupReadyCount: `0/9`
- postFollowupReadyCount: `0/9`
- dominantRuntimeBlocker: `disconnected`
- firstFailingHop: `windows_edge_forced_host`
- forcedHostStatus: `transport_error`
- publicOwnerStatus: `502 / 502 / 502`
- operator surface matched the artifact through `/internal/persistent-disconnected-runtime-followup/latest` and `/internal/admin`

## Preserve-First Result

- profiles and sessions preserved
- no profile deletion or reset
- no cookie or local-storage clearing
- no blind full-pool restart
- no relogin
- `shared-6` was stopped again after the follow-up
- port `4028` was not left listening

## Runtime Parity Note

- During the live follow-up the deployed host had to restore compatibility in:
  - `probe-public-api.ps1`
  - `recover-browser-block-readiness.ps1`
  - `remediate-disconnected-runtime-and-forced-host-edge.ps1`
  - `remediate-persistent-disconnected-runtime-and-public-502.ps1`
  - `test-rollout-smoke.ps1`
  - `test-host-worker-relay.ps1`
- Those raw deployed-host compatibility restores are not yet synced back into this checkout verbatim.
