# Phase 36-01 Summary

## Result

- Implemented `infra/windows-block/recover-server-token-ssh-listeners-and-external-chat.ps1`.
- The wrapper writes the Phase 36 JSON/Markdown summary and the ignored latest-state file at `infra/data/post-phase35-server-token-ssh-listener-recovery/latest.json`.
- Added the GitHub-first deployed-host agent prompt in `36-DEPLOYED-HOST-AGENT-TASK.md`.
- Updated operator docs with the Phase 36 gate and the rule that bearer tokens and SSH passwords are execution-time secrets only.

## Live Truth

- Final live wrapper verdict: `hold_rollout`.
- Exact next blocker: `ubuntu_ssh_unreachable`.
- `77.66.186.75:2222` is TCP-open, but the SSH service/NAT path returned empty banner/session responses during the bounded wrapper run.
- Bearer token was not resolved because the Ubuntu-side token lookup could not be completed over SSH.
- Ubuntu listener truth for `14021..14027` and `14040` could not be confirmed.

## Preserve-First

- Browser profiles were not deleted.
- Cookies/localStorage were not cleared.
- No mass relogin was performed.
- No full worker-pool restart was performed.
