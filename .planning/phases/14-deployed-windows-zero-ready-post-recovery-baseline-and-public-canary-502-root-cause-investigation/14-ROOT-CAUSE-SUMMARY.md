# Zero-Ready Root Cause Summary

- Generated: 2026-03-31T21:47:17.3391297+03:00
- Reconstructed from operator report: yes
- Script compatibility version: phase14-zero-ready-root-cause-v1
- Verdict: root_cause_confirmed
- Summary: Reconstructed from the deployed-host operator report: the zero-ready baseline remained at `0/9 ready` and `9/9 disconnected`, `loopback_api` stayed green with `200/200/200`, the first failing hop was `windows_edge_forced_host`, and the Ubuntu public owner `http://77.66.186.75` returned `502` through `nginx/1.18.0 (Ubuntu)`.
- Canary worker: shared-6
- Ready workers: 0/9
- Dominant blocker class: disconnected
- Dominant blocker code: operator_report_disconnected
- First failing hop: windows_edge_forced_host
- Inventory mismatch: false
- Internal latest route matched artifact: yes
- Internal admin section visible: yes

## Baseline Counts

- reauth_required: 0
- reachable_but_unusable: 0
- disconnected: 9

## Hop Results

| Hop | Passed | healthz | models | chat | Host header | Server | Via |
|-----|--------|---------|--------|------|-------------|--------|-----|
| loopback_api | True | 200 | 200 | 200 | none | n/a | n/a |
| windows_edge_forced_host | False | not synced | not synced | not synced | 77.66.186.75 | n/a | n/a |
| ubuntu_public_owner | False | 502 | 502 | 502 | none | nginx/1.18.0 (Ubuntu) | n/a |

## Worker Blockers

| Worker | Class | Blocker | Runtime capability | Runtime status | Agent | Browser |
|--------|-------|---------|--------------------|----------------|-------|---------|
| dad | disconnected | operator_report_disconnected | compact_visible | disconnected | False | False |
| wife | disconnected | operator_report_disconnected | compact_visible | disconnected | False | False |
| shared-1 | disconnected | operator_report_disconnected | compact_visible | disconnected | False | False |
| shared-2 | disconnected | operator_report_disconnected | compact_visible | disconnected | False | False |
| shared-3 | disconnected | operator_report_disconnected | compact_visible | disconnected | False | False |
| shared-4 | disconnected | operator_report_disconnected | compact_visible | disconnected | False | False |
| shared-5 | disconnected | operator_report_disconnected | compact_visible | disconnected | False | False |
| shared-6 | disconnected | operator_report_disconnected | compact_visible | disconnected | False | False |
| shared-7 | disconnected | operator_report_disconnected | compact_visible | disconnected | False | False |

## Notes

- Local Phase 14 summary files are reconstructed from the operator report because the raw deployed-host artifacts were not synced back into this checkout.
- The repo copy of `investigate-zero-ready-root-cause.ps1` was updated to pass named parameters into `probe-public-api.ps1`, matching the deployed-host compat fix required for the live run.
- After the bounded probe, `shared-6` was stopped again and port `4028` was no longer listening.
