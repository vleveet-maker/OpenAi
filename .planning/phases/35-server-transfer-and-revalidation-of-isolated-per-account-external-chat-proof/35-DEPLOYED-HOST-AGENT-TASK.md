# Phase 35 Server Transfer And Revalidation Task

## Источник истины

Используй только GitHub.

Репозиторий:

```text
https://github.com/vleveet-maker/OpenAi
```

Ветка:

```text
windows-browser-block-api-20260331
```

Prompt этой фазы в GitHub:

```text
https://github.com/vleveet-maker/OpenAi/blob/windows-browser-block-api-20260331/.planning/phases/35-server-transfer-and-revalidation-of-isolated-per-account-external-chat-proof/35-DEPLOYED-HOST-AGENT-TASK.md
```

Не используй локальные zip-архивы как источник истины.

## Что нужно сделать простыми словами

На локальной машине уже доказано, что новая схема работает:

- один аккаунт = один отдельный desktop Chrome root
- один аккаунт = одно отдельное browser-data storage
- внешний `chat` уже прошёл локально на изолированной схеме

Эта фаза переносит именно эту схему на серверный путь и честно проверяет, работает ли внешний `chat` уже там.

## Хосты

- Windows browser-block host: `192.168.88.250`
- Ubuntu public-owner host: `77.66.186.75`

## Preserve-first правила

Нельзя:

- удалять профили
- чистить cookies
- чистить localStorage
- делать mass relogin
- делать blind full-pool restart
- возвращаться к старой shared Chrome-схеме

Нужно:

- идти canary-first
- использовать изолированную per-account схему
- остановиться на первом настоящем внешнем `chat = 200`
- если не вышло, вернуть один честный blocker

## Шаг 1. Синхронизация GitHub на обоих хостах

### Windows `192.168.88.250`

Repo path:

```text
D:\OpenAi
```

Выполни:

```powershell
cd D:\OpenAi
git fetch origin
git checkout windows-browser-block-api-20260331
git pull --ff-only origin windows-browser-block-api-20260331
git rev-parse --short HEAD
git branch --show-current
```

### Ubuntu `77.66.186.75`

Если live repo path уже известен и это `/opt/owmcgp-remote-relay`, используй его.
Если путь другой, используй реальный live checkout path и обязательно верни его в отчёте.

Выполни:

```bash
cd /opt/owmcgp-remote-relay
git fetch origin
git checkout windows-browser-block-api-20260331
git pull --ff-only origin windows-browser-block-api-20260331
git rev-parse --short HEAD
git branch --show-current
pwd
```

## Шаг 2. Локальные проверки на Windows

### Parser checks

```powershell
$files = @(
  "infra/windows-block/prepare-isolated-account-browser-roots.ps1",
  "infra/windows-block/revalidate-server-isolated-external-chat-proof.ps1"
)

foreach ($file in $files) {
  $tokens = $null
  $errors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $file), [ref]$tokens, [ref]$errors)
  if ($errors.Count -gt 0) {
    throw "Parser errors in $file"
  }
}
```

### Focused tests

```powershell
npm.cmd --prefix services/control-api test -- internal-post-phase34-server-isolated-chat-transfer.test.ts internal-admin-page.test.ts
```

### Full suite

```powershell
npm.cmd --prefix services/control-api test
```

### Build

```powershell
npm.cmd --prefix services/control-api run build
```

После build перезапусти `control-api` на `127.0.0.1:8081`, если он у тебя запускается из этого checkout.

## Шаг 3. Проверка Ubuntu public-owner truth

На Ubuntu выполни:

```bash
curl -i http://127.0.0.1:4010/healthz
curl -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:4010/v1/models
sudo nginx -t
sudo nginx -T | egrep -n 'server_name|listen|proxy_pass|4010|192\.168\.88\.250'
ss -ltnH | egrep '14021|14022|14023|14024|14025|14026|14027|14040'
```

Ожидаемая truth:

- `nginx` живой
- canonical upstream это `127.0.0.1:4010`
- stale `proxy_pass http://192.168.88.250` отсутствует
- tunnel listeners на Ubuntu видны

## Шаг 4. Канонический wrapper этой фазы

Запусти на Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\revalidate-server-isolated-external-chat-proof.ps1 `
  -WindowsRepoPath D:\OpenAi `
  -UbuntuRepoPath /opt/owmcgp-remote-relay `
  -GitHubBranch windows-browser-block-api-20260331 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50 `
  -PublicBaseUrl http://77.66.186.75 `
  -ApiTokenEnvVar OWMCGP_REMOTE_RELAY_API_TOKEN `
  -SourceBrowserDataBasePath D:\OpenAi\infra\data\host-profiles `
  -CopySourceBrowserData `
  -OutputJsonPath .\.planning\phases\35-server-transfer-and-revalidation-of-isolated-per-account-external-chat-proof\35-SERVER-ISOLATED-CHAT-TRANSFER-SUMMARY.json `
  -OutputMarkdownPath .\.planning\phases\35-server-transfer-and-revalidation-of-isolated-per-account-external-chat-proof\35-SERVER-ISOLATED-CHAT-TRANSFER-SUMMARY.md
```

Если реальный Ubuntu repo path не `/opt/owmcgp-remote-relay`, подставь точный path.

## Шаг 5. Проверка operator surface

На Windows проверь:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8081/internal/post-phase34-server-isolated-chat-transfer/latest `
  -Headers @{ "x-internal-admin-token" = "local-internal-admin-token" }
```

И руками проверь `/internal/admin`, что там есть секция:

```text
Latest post-phase34 server isolated external chat proof
```

Route/admin должны показывать тот же latest artifact, который записал wrapper.

## Шаг 6. Финальная внешняя проверка

Итоговая проверка идёт в настоящий публичный путь:

```text
http://77.66.186.75
```

Нужно проверить:

```bash
curl -i http://77.66.186.75/healthz
curl -i -H "Authorization: Bearer <TOKEN>" http://77.66.186.75/v1/models
curl -i \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"owmcgp-browser\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with exactly: probe-ok\"}]}" \
  http://77.66.186.75/v1/chat/completions
```

## Что вернуть в отчёте

Верни короткий итог по пунктам:

- exact Windows repo path
- exact Ubuntu repo path
- Windows commit hash
- Ubuntu commit hash
- parser checks: passed/failed
- focused tests: passed/failed
- full suite: passed/failed
- build: passed/failed
- `nginx -t`: passed/failed
- canonical upstream на Ubuntu: подтверждён или нет
- tunnel listeners `14021..14027` и `14040`: есть или нет
- route `/internal/post-phase34-server-isolated-chat-transfer/latest`: отвечает или нет
- секция в `/internal/admin`: есть или нет
- внешний `/healthz`
- внешний `/v1/models`
- внешний `/v1/chat/completions`
- какой worker реально дал ответ, если был успех
- были ли post-pull hotfix
- финальный verdict:
  - `externally_ready`
  - или `hold_rollout`

## После ручного прогона

Запусти:

```text
$gsd-execute-phase 35
```
