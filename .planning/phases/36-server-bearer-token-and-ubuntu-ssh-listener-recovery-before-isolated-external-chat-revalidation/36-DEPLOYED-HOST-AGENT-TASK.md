# Phase 36 Deployed Host Agent Task

Цель: восстановить или точно классифицировать bearer token, SSH-доступ к Ubuntu и Ubuntu-side listener truth перед повторной проверкой внешнего isolated chat.

Важно:

- Не удалять профили.
- Не чистить cookies.
- Не чистить localStorage.
- Не делать mass restart browser pool.
- Не делать mass relogin.
- Не печатать bearer token или SSH password в отчёт.
- Не коммитить secrets.
- Файлы брать только из GitHub, не из локальных zip-архивов.

## 1. Синхронизировать репозиторий

На Windows checkout:

```powershell
cd D:\OpenAi
git fetch origin
git checkout windows-browser-block-api-20260331
git pull --ff-only
git rev-parse --short HEAD
```

На Ubuntu, если SSH доступен:

```bash
cd /opt/owmcgp-remote-relay/services/control-api
git fetch origin
git checkout windows-browser-block-api-20260331
git pull --ff-only
git rev-parse --short HEAD
```

## 2. Выполнить Phase 36 wrapper

На Windows:

```powershell
cd D:\OpenAi
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\recover-server-token-ssh-listeners-and-external-chat.ps1 `
  -RemoteHosts 77.66.186.75,95.78.126.163 `
  -RemotePort 2222 `
  -RemoteUser mi50 `
  -PublicBaseUrl http://77.66.186.75 `
  -WorkerId wife `
  -AttemptTunnelRecovery
```

Если нужен SSH password или bearer token, передать только как execution-time secret/env var. Не записывать в tracked files.

## 3. Проверить operator surface

После restart `control-api` на `127.0.0.1:8081`:

```powershell
Invoke-RestMethod http://127.0.0.1:8081/internal/post-phase35-server-token-ssh-listener-recovery/latest
Invoke-WebRequest http://127.0.0.1:8081/internal/admin -UseBasicParsing
```

В `/internal/admin` должна быть секция:

```text
Latest post-phase35 server token SSH listener recovery
```

## 4. Вернуть результаты

Вернуть без secrets:

- `36-TOKEN-SSH-LISTENER-RECOVERY-SUMMARY.json`
- `36-TOKEN-SSH-LISTENER-RECOVERY-SUMMARY.md`
- `36-03-SUMMARY.md`
- `36-VERIFICATION.md`
- verdict: `externally_ready` или `hold_rollout`
- token source label, но не token value
- Ubuntu SSH truth
- Ubuntu listener truth for `14021..14027` and `14040`
- external `/healthz`, `/v1/models`, `/v1/chat/completions` status

Следующий шаг после результата:

- если `externally_ready`, переходить к rollout readiness decision
- если `hold_rollout`, чинить только записанный `nextBlocker`
