# Phase 36-01 Summary

## Result

- Implemented `infra/windows-block/recover-server-token-ssh-listeners-and-external-chat.ps1`.
- The wrapper writes the Phase 36 JSON/Markdown summary and the ignored latest-state file at `infra/data/post-phase35-server-token-ssh-listener-recovery/latest.json`.
- Added the GitHub-first deployed-host agent prompt in `36-DEPLOYED-HOST-AGENT-TASK.md`.
- Updated operator docs with the Phase 36 gate and the rule that bearer tokens and SSH passwords are execution-time secrets only.

## Live Truth

- Final live verdict: `hold_rollout`.
- Exact next blocker after direct SSH retry: `ubuntu_listeners_missing`.
- `77.66.186.75:2222` can connect as `mi50` with retry; `95.78.126.163:2222` still timed out waiting for SSH banner.
- Bearer token was resolved from `ssh:77.66.186.75:remote_env_file:REMOTE_RELAY_API_TOKEN`; the token value was not printed or stored.
- Ubuntu listener truth confirmed that `14021..14027` and `14040` are missing.

## Preserve-First

- Browser profiles were not deleted.
- Cookies/localStorage were not cleared.
- No mass relogin was performed.
- No full worker-pool restart was performed.
