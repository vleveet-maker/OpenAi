# Phase 27 - понятный handoff для Windows/Ubuntu агента

## Что нужно сделать

Нужно закончить `Phase 27`.

Цель фазы:

- восстановить repo-backed проверку Ubuntu по SSH
- зафиксировать exact live repo path и commit hash на Ubuntu
- проверить, что живая схема все еще такая: `Ubuntu nginx -> 127.0.0.1:4010`
- проверить, что reverse-tunnel task реально удерживается в `Running`
- проверить, что на Ubuntu держатся listeners `14021..14027` и `14040`
- записать артефакт Phase 27
- проверить internal operator surface
- завершить authenticated external smoke

Финальный verdict должен быть ровно один из двух:

- `externally_ready`
- `hold_rollout`

## Откуда брать файлы

Источник истины только GitHub.

Repo:

```text
https://github.com/vleveet-maker/OpenAi
```

Ветка:

```text
windows-browser-block-api-20260331
```

Файл этого задания в GitHub:

```text
https://github.com/vleveet-maker/OpenAi/blob/windows-browser-block-api-20260331/.planning/phases/27-deployed-ubuntu-ssh-recovery-reverse-tunnel-task-retention-and-authenticated-external-smoke-completion/27-DEPLOYED-HOST-AGENT-TASK.md
```

Не использовать локальные zip-архивы как source of truth.

## Где выполнять

### Windows host

Хост:

```text
192.168.88.250
```

Repo path:

```text
D:\OpenAi
```

### Ubuntu host

Хост:

```text
77.66.186.75
```

Нужно использовать live repo checkout, который реально обслуживает relay/nginx.

Если путь checkout на Ubuntu неочевиден:

1. сначала найди его
2. потом явно укажи exact repo path в отчете
3. только после этого считай Ubuntu sync подтвержденным

## Важные правила

Работаем preserve-first.

Нельзя:

- удалять профили
- чистить cookies
- чистить localStorage
- делать blind full-pool restart
- делать mass relogin

## Шаг 1. Подтянуть GitHub-код на Windows

На Windows в `D:\OpenAi` выполнить:

```powershell
cd D:\OpenAi
git fetch origin
git checkout windows-browser-block-api-20260331
git pull --ff-only origin windows-browser-block-api-20260331
git rev-parse --short HEAD
```

В отчете обязательно указать итоговый commit hash.

## Шаг 2. Прогнать локальные проверки на Windows

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
  $parseErrors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $file), [ref]$null, [ref]$parseErrors)
  if ($parseErrors.Count -gt 0) {
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

### 2.5 Перезапуск control-api

Если `control-api` живет из:

```text
D:\OpenAi\services\control-api\dist\server.js
```

то перезапустить его после `build`.

## Шаг 3. Подтянуть GitHub-код на Ubuntu

На Ubuntu в live repo checkout выполнить:

```bash
cd /path/to/live/repo
git fetch origin
git checkout windows-browser-block-api-20260331
git pull --ff-only origin windows-browser-block-api-20260331
pwd
git rev-parse --short HEAD
```

В отчете обязательно указать:

- exact repo path на Ubuntu
- итоговый commit hash на Ubuntu

## Шаг 4. Проверить живую Ubuntu truth

На Ubuntu выполнить:

```bash
sudo nginx -t
curl -i http://127.0.0.1:4010/healthz
sudo nginx -T | egrep -n 'server_name|listen|proxy_pass|4010|192\.168\.88\.250'
ss -ltnH | egrep '14021|14022|14023|14024|14025|14026|14027|14040'
```

Что должно быть явно подтверждено в отчете:

- `127.0.0.1:4010/healthz` отвечает
- `nginx -T` показывает `proxy_pass http://127.0.0.1:4010`
- активного `proxy_pass http://192.168.88.250` нет
- listeners `14021..14027` и `14040` есть, если tunnels здоровы

## Шаг 5. Записать артефакт Phase 27 на Windows

На Windows выполнить:

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

## Шаг 6. Проверить operator surface

На Windows выполнить:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8081/internal/post-phase26-ubuntu-ssh-recovery/latest `
  -Headers @{ "x-internal-admin-token" = "local-internal-admin-token" }
```

И отдельно проверить, что в `/internal/admin` есть секция:

```text
Latest post-phase26 Ubuntu SSH recovery
```

Route/admin должны совпадать с latest artifact.

## Шаг 7. Финальный authenticated external smoke

Финальный authenticated smoke можно выполнять с того хоста, где реально есть bearer token.

Это может быть:

- Windows
- Ubuntu
- другой операторский хост

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

В отчете обязательно указать:

- успешно ли прошел `git fetch/checkout/pull` на Windows
- успешно ли прошел `git fetch/checkout/pull` на Ubuntu
- exact repo path на Ubuntu
- commit hash на Windows
- commit hash на Ubuntu
- прошли ли parser checks
- прошли ли targeted tests
- прошел ли full suite
- прошел ли build
- подтверждается ли `Ubuntu nginx -> 127.0.0.1:4010`
- удержался ли reverse-tunnel task в `Running`
- есть ли listeners `14021..14027` и `14040`
- отвечает ли `/internal/post-phase26-ubuntu-ssh-recovery/latest`
- есть ли секция в `/internal/admin`
- результат внешнего smoke по:
  - `/healthz`
  - `/v1/models`
  - `/v1/chat/completions`
- на каком хосте реально был bearer token
- понадобились ли post-pull hotfix
- финальный verdict:
  - `externally_ready`
  - или `hold_rollout`

## Последняя команда после ручного прогона

После всего выше запустить:

```text
$gsd-execute-phase 27
```
