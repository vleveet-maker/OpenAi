# Internal Worker Operations

Этот runbook только для household operator. Браузеры остаются internal-only, ручной логин остаётся правилом, а рабочий runtime сейчас это `compact visible`.

## Fresh Chat Policy

- Каждый новый активный диалог сначала поднимает fresh chat boundary.
- Нужен `Temporary Chat`, чтобы разговор не шёл в history и не создавал memory.
- Предпочитаемая модель сейчас: `GPT-5.4 Thinking`, запасной вариант `GPT-5.4`.
- Пока bootstrap не готов, отправка сообщений остаётся заблокированной.

## Setup

- Подними стек из `infra/docker-compose.yml` вместе с `infra/docker-compose.host-native.yml`.
- Public entrypoint: `http://<host>:8080/`
- Internal operator entrypoint: `http://127.0.0.1:8081/internal/admin`
- Health endpoints:
  - `http://127.0.0.1:8081/healthz`
  - `http://127.0.0.1:8081/readyz`
- Не храни логины, пароли и reusable secrets в репозитории.

## Official Host Workers

- `dad`
- `wife`
- `shared-1`
- `shared-2`
- `shared-3`
- `shared-4`
- `shared-5`

## Host Pool Control

- `Start pool` поднимает официальный host-native pool в `compact visible`
- `Start alternate desktop pool` нужен только для отдельной non-visible проверки
- `Stop pool` выключает household pool и закрывает окна

Lifecycle meanings:

- `idle`: proxy и workers остановлены
- `starting`: идёт запуск
- `ready`: proxy и workers доступны
- `degraded`: часть поднялась, часть нет
- `stopping`: идёт остановка
- `failed`: последняя lifecycle-команда завершилась ошибкой

## Manual Login / Reauth

Для host-native workers:

1. Нажми `Start visible login` или `Start visible reauth`
2. Закончи ручной вход в ChatGPT
3. Для обычной работы выбери `Use compact visible runtime`
4. `Complete login and validate` используй только если специально проверяешь non-visible runtime

Важно:

- сначала логин вручную в видимом браузере
- дальше обычная работа идёт через compact small windows
- после proof или recovery окна снова закрываем

## Restore Pages Popup

`Restore pages` считаем реальным blocker-ом, потому что он может закрыть сам ChatGPT слой.

Сейчас система старается пережить его так:

- мягко закрывает окно перед force-kill
- удаляет только crash/session-restore артефакты
- запускает браузер с анти-popup флагами

Если popup всё же появился:

- не удаляй профиль
- не чисти руками durable cookies
- зафиксируй это как runtime regression
- после этого можно повторить controlled stop/start и proof

## Canonical Proof

Канонический proof сейчас такой:

`Temporary Chat -> GPT-5.4 Thinking -> relay`

Запускать по одному worker:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\host-worker\test-host-worker-relay.ps1 -WorkerId wife
```

Script:

- стартует только указанный worker
- использует `CompactCorner`
- создаёт pinned validation session
- ждёт `Temporary Chat`
- проверяет `GPT-5.4 Thinking`
- отправляет smoke message
- по умолчанию потом закрывает worker

Если нужно оставить окно открытым:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\host-worker\test-host-worker-relay.ps1 -WorkerId wife -KeepWorkerRunning
```

## Troubleshooting

- `ready`, но чат не работает: смотри worker-by-worker proof, а не только health
- `reauth_required`: сначала ручной вход, потом повторная проверка
- `degraded`: не маскируем, а разбираем, какой именно worker или proxy не поднялся
- `Restore pages`: считаем runtime incident, а не “нормальным попапом”
- repeated proof важнее одного удачного запуска

## Phase 11 Rule

Fresh compact-visible proof on 2026-03-29 passed on all six original official workers:

- `dad`
- `wife`
- `shared-1`
- `shared-2`
- `shared-3`
- `shared-4`

Path proved:

`CompactCorner -> Temporary Chat -> GPT-5.4 Thinking -> relay -> smoke-ok`

`shared-5` is now provisioned as a seventh compact-visible slot, but it still needs manual login and first proof before it counts as rollout-usable.

All worker windows were closed again after proof finished.

`Phase 11` is no longer blocked by runtime rescue work, but it still waits on the dedicated server browser-runtime migration. The local compact-visible snapshot is only a temporary operator-PC confidence aid while server desktop access is busy.

## Local-Only Confidence Snapshot

If server VNC/desktop access is temporarily busy, run this local seven-worker smoke snapshot on the operator PC:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\host-worker\test-local-rollout-smoke.ps1 `
  -OutputJsonPath .\.planning\phases\10.6.1.2.1-local-machine-rollout-smoke-confidence\10.6.1.2.1-WORKER-MATRIX.json `
  -OutputMarkdownPath .\.planning\phases\10.6.1.2.1-local-machine-rollout-smoke-confidence\10.6.1.2.1-WORKER-MATRIX.md
```

Use it only as a temporary local confidence check. It does not replace the planned server-hosted runtime migration.

Latest local snapshot on 2026-03-30:

- usable: `dad`, `wife`, `shared-1`, `shared-3`, `shared-5`
- currently failing: `shared-2`, `shared-4`
- repeated failure code on both: `worker_chat_bootstrap_timeout`

Latest local snapshot on 2026-03-30:

- usable: `dad`, `wife`, `shared-1`, `shared-3`, `shared-5`
- currently failing: `shared-2`, `shared-4`
- repeated failure code on both: `worker_chat_bootstrap_timeout`

## Server-Hosted Migration Note

- During Phase `10.6.1.2`, manual login and reauth move to the server VNC desktop, not the operator PC.
- The current pilot worker is `wife` on server display `:2`.
- The server-local proxy service is `owmcgp-browser-proxy.service`.
- The server-local worker service template is `owmcgp-browser-worker@.service`.
- If you see a browser window on the local PC during this migration, that is the wrong runtime path.
