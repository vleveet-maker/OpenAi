# Phase 37-01 Summary

## Result

- Hardened `infra/windows-block/start-reverse-tunnels.py` with Phase 37 compatibility, SSH connect retry/backoff, longer banner/auth timeouts, and environment-based password support.
- Updated `infra/windows-block/start-reverse-tunnels.ps1` so the password-backed Phase 37 path passes SSH password only through the child process environment, not through `--ssh-password` process arguments.
- Added `infra/windows-block/restore-reverse-tunnels-and-complete-external-chat-smoke.ps1` as the canonical Phase 37 wrapper.
- Updated remote relay and Windows browser-block docs with the Phase 37 tunnel restoration gate and GitHub-first / preserve-first operating rules.

## Verification

- PowerShell parser checks passed for:
  - `infra/windows-block/start-reverse-tunnels.ps1`
  - `infra/windows-block/register-browser-block-tasks.ps1`
  - `infra/windows-block/restore-reverse-tunnels-and-complete-external-chat-smoke.ps1`
- `python -m py_compile infra/windows-block/start-reverse-tunnels.py` passed.
- Secret handling review confirmed the wrapper writes only token source labels and `secretValueRecorded=false`, not token or SSH password values.

## Preserve-First

- Browser profiles were not deleted.
- Cookies/localStorage were not cleared.
- No mass relogin was performed.
- No full worker-pool restart was performed.

## Next Step

Run `37-02`: add the Phase 37 latest route and `/internal/admin` operator surface.
