# Phase 27 - локальный Windows + Ubuntu handoff

## Что меняем

В этой фазе мы не трогаем Windows server `192.168.88.250`.

Работаем только в двух местах:

- на этом локальном Windows-хосте, где уже есть авторизованные аккаунты
- на Ubuntu `77.66.186.75`

Смысл такой:

1. доказать внешний API через текущую живую схему
2. сделать это preserve-first, без порчи аккаунтов
3. и только после этого переносить проверенный кусок на Windows server

## Источник файлов

Источник истины только GitHub.

Repo:

```text
https://github.com/vleveet-maker/OpenAi
```

Branch:

```text
windows-browser-block-api-20260331
```

Файл этого задания в GitHub:

```text
https://github.com/vleveet-maker/OpenAi/blob/windows-browser-block-api-20260331/.planning/phases/27-deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion/27-DEPLOYED-HOST-AGENT-TASK.md
```

Не использовать локальные zip как source of truth.

## Где выполнять

### Локальный Windows

Repo path:

```text
D:\OpenAi
```

### Ubuntu

Host:

```text
77.66.186.75
```

Нужен exact live repo checkout, который реально обслуживает relay/nginx.

Если путь checkout на Ubuntu неочевиден:

1. сначала найти его
2. потом явно указать exact path в отчете
3. только после этого считать Ubuntu sync подтвержденным

## Preserve-first правила

Нельзя:

- удалять профили
- чистить cookies
- чистить localStorage
- делать blind full-pool restart
- делать mass relogin
- переносить что-либо на Windows server в этой фазе

## Шаг 1. GitHub sync на локальном Windows

В `D:\OpenAi` выполнить:

```powershell
cd D:\OpenAi
git fetch origin
git checkout windows-browser-block-api-20260331
git pull --ff-only origin windows-browser-block-api-20260331
git rev-parse --short HEAD
```

В отчете вернуть итоговый commit hash.

## Шаг 2. Локальные проверки на Windows

### 2.1 Parser checks

```powershell
$files = @(
  "infra/windows-block/start-reverse-tunnels.ps1",
  "infra/windows-block/register-browser-block-tasks.ps1",
  "infra/windows-block/probe-public-api.ps1",
  "infra/windows-block/recover-ubuntu-sync-and-external-auth-smoke.ps1",
  "infra/windows-block/recover-ubuntu-ssh-reverse-tunnels-and-authenticated-smoke.ps1"
)

foreach ($file in $files) {
  $tokens = $null
  $parseErrors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $file), [ref]$tokens, [ref]$parseErrors)
  if ($parseErrors -and $parseErrors.Count -gt 0) {
    throw "Parser errors in $file"
  }
}
```

### 2.2 Targeted tests

```powershell
npm.cmd --prefix services/control-api test -- edge-config.test.ts internal-admin-page.test.ts internal-post-phase26-ubuntu-ssh-recovery.test.ts
```

### 2.3 Full suite

```powershell
npm.cmd --prefix services/control-api test
```

### 2.4 Build

```powershell
npm.cmd --prefix services/control-api run build
```

## Шаг 3. Локальный control plane без слепого старта пула

Если `4040` не слушает, поднять только host-controller:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-browser-block.ps1 -SkipInstall
```

Это не должно слепо запускать весь пул.

Если bearer token есть на этом Windows-хосте и нужен local relay runtime, его можно поднимать отдельно. Если token здесь нет, не выдумывать обходы и не считать это доказательством поломки API.

## Шаг 4. GitHub sync на Ubuntu

На Ubuntu в live repo checkout выполнить:

```bash
cd /path/to/live/repo
git fetch origin
git checkout windows-browser-block-api-20260331
git pull --ff-only origin windows-browser-block-api-20260331
pwd
git rev-parse --short HEAD
```

В отчете вернуть:

- exact Ubuntu repo path
- Ubuntu commit hash

## Шаг 5. Ubuntu truth

На Ubuntu выполнить:

```bash
sudo nginx -t
curl -i http://127.0.0.1:4010/healthz
sudo nginx -T | egrep -n 'server_name|listen|proxy_pass|4010|192\.168\.88\.250'
ss -ltnH | egrep '14021|14022|14023|14024|14025|14026|14027|14040'
```

В отчете явно указать:

- отвечает ли `127.0.0.1:4010/healthz`
- показывает ли `nginx -T` `proxy_pass http://127.0.0.1:4010`
- нет ли активного `proxy_pass http://192.168.88.250`
- есть ли listeners `14021..14027` и `14040`

## Шаг 6. Временные reverse tunnels вместо постоянных task changes

Если на этом Windows-хосте есть рабочий SSH key для `mi50@77.66.186.75:2222`, сначала предпочесть foreground-run:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-reverse-tunnels.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50 `
  -IncludeHostController `
  -Foreground
```

Если foreground-run невозможен, вернуть exact blocker.

Не подменять эту фазу постоянной scheduled-task настройкой без явной необходимости.

## Шаг 7. Phase 27 artifact на локальном Windows

На этом Windows-хосте выполнить:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\recover-ubuntu-ssh-reverse-tunnels-and-authenticated-smoke.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50 `
  -PublicBaseUrl http://77.66.186.75 `
  -BearerTokenEnvVar OWMCGP_REMOTE_RELAY_API_TOKEN `
  -InternalBaseUrl http://127.0.0.1:8081 `
  -HostControllerBaseUrl http://127.0.0.1:4040 `
  -OutputJsonPath .\.planning\phases\27-deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion\27-SSH-RECOVERY-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\27-deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion\27-SSH-RECOVERY-SUMMARY.md
```

Ожидаемые файлы:

- `.planning/phases/27-deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion/27-SSH-RECOVERY-SUMMARY.json`
- `.planning/phases/27-deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion/27-SSH-RECOVERY-SUMMARY.md`
- `infra/data/post-phase26-ubuntu-ssh-recovery/latest.json`

## Шаг 8. Operator surface

На этом Windows-хосте выполнить:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8081/internal/post-phase26-ubuntu-ssh-recovery/latest `
  -Headers @{ "x-internal-admin-token" = "local-internal-admin-token" }
```

И отдельно проверить секцию:

```text
Latest post-phase26 Ubuntu SSH recovery
```

Route/admin должны совпадать с latest artifact.

## Шаг 9. Финальный authenticated external smoke

Authenticated smoke можно выполнять с того хоста, где реально есть bearer token:

- local Windows
- Ubuntu
- другой операторский host

Но запросы всегда должны идти в:

```text
http://77.66.186.75
```

Команды:

```bash
curl -i http://77.66.186.75/healthz
curl -i -H "Authorization: Bearer <TOKEN>" http://77.66.186.75/v1/models
curl -i \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"owmcgp-browser\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with exactly: ping-ok\"}]}" \
  http://77.66.186.75/v1/chat/completions
```

## Что вернуть в отчете

Обязательно вернуть:

- успешно ли прошел `git fetch/checkout/pull` на local Windows
- успешно ли прошел `git fetch/checkout/pull` на Ubuntu
- exact repo path на Ubuntu
- commit hash на local Windows
- commit hash на Ubuntu
- прошли ли parser checks
- прошли ли targeted tests
- прошел ли full suite
- прошел ли build
- подтверждается ли `Ubuntu nginx -> 127.0.0.1:4010`
- удержался ли reverse-tunnel path
- есть ли listeners `14021..14027` и `14040`
- отвечает ли `/internal/post-phase26-ubuntu-ssh-recovery/latest`
- есть ли секция в `/internal/admin`
- результаты внешнего smoke по:
  - `/healthz`
  - `/v1/models`
  - `/v1/chat/completions`
- на каком хосте реально был bearer token
- были ли post-pull hotfix
- запускались ли tunnels во foreground или только через persistent task
- финальный verdict:
  - `externally_ready`
  - или `hold_rollout`

## Последняя команда после ручного прогона

После всего выше запустить:

```text
$gsd-execute-phase 27
```
