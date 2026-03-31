# Host-Native Worker

Текущий рабочий fallback для `v1.2` это `compact visible`: маленькие окна в углу экрана, а не hidden runtime и не обычные большие окна.

## Current Runtime Policy

- `Start pool` запускает household pool в `compact visible`.
- `Start alternate desktop pool` нужен только для явной non-visible проверки, а не как обычный путь.
- `Start visible login` и `Start visible reauth` нужны только для ручного логина или ручной повторной авторизации.
- `Use compact visible runtime` оставляет конкретный worker в маленьком рабочем окне после ручного логина.
- `Complete login and validate` и `Validate non-visible runtime` используются только если мы отдельно перепроверяем non-visible путь.
- Браузеры открываются только когда они реально нужны, держатся маленькими в углу и после proof или recovery снова закрываются.

## Official Worker Set

- `dad` -> agent `4021`, CDP `9222`
- `wife` -> agent `4022`, CDP `9223`
- `shared-1` -> agent `4023`, CDP `9224`
- `shared-2` -> agent `4024`, CDP `9225`
- `shared-3` -> agent `4025`, CDP `9226`
- `shared-4` -> agent `4026`, CDP `9227`
- `shared-5` -> agent `4027`, CDP `9228`

Профили живут на хосте и сохраняют логин отдельно для каждого worker.

## Routine Start

1. Подними стек с host-native override:
   `docker compose -f infra/docker-compose.yml -f infra/docker-compose.host-native.yml up -d edge control-api session-client`
2. Проверь, что локальные proxy share links есть в:
   `infra/data/proxy/share-links.local.json`
3. Открой internal admin:
   `http://127.0.0.1:8081/internal/admin`
4. Нажми `Start pool`, если нужен обычный household runtime.
5. Используй `Start visible login` или `Start visible reauth`, если конкретному worker нужен ручной вход.
6. После ручного входа для обычной работы выбирай `Use compact visible runtime`.
7. Когда проверка или recovery закончены, нажми `Stop pool` или останови конкретный worker, чтобы окна не оставались открытыми.

## Pool Status Meanings

- `idle`: proxy и host workers сейчас остановлены
- `starting`: идёт запуск
- `ready`: proxy слушает, workers доступны
- `degraded`: часть пула поднялась, часть нет
- `stopping`: идёт остановка
- `failed`: последний lifecycle action завершился ошибкой

## Compact Visible Proof Path

Канонический proof теперь такой:

`CompactCorner -> Temporary Chat -> GPT-5.4 Thinking -> relay`

Используй один worker за раз:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\host-worker\test-host-worker-relay.ps1 -WorkerId wife
```

Что делает этот script:

- стартует только выбранный worker в `CompactCorner`
- ждёт `Temporary Chat`
- проверяет модель `GPT-5.4 Thinking`
- отправляет один smoke relay
- по умолчанию потом снова закрывает worker

Если окно нужно оставить открытым для ручной проверки:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\host-worker\test-host-worker-relay.ps1 -WorkerId wife -KeepWorkerRunning
```

## Restore Pages Popup

`Restore pages` это реальная runtime-проблема, а не просто косметика.

Сейчас suppression делается так:

- сначала мягкое закрытие браузера через `CloseMainWindow()`
- потом чистка только crash/session-restore артефактов
- затем запуск с флагами:
  - `--hide-crash-restore-bubble`
  - `--disable-session-crashed-bubble`
  - `--no-first-run`
  - `--no-default-browser-check`

Что важно:

- durable profile и login state не стираются
- cookies специально не чистятся
- если popup снова появился, это runtime evidence и его надо записывать как регрессию, а не “лечить” удалением профиля

## Phase 11 Gate

Fresh compact-visible proof on 2026-03-29 passed on all six original official workers:

- `dad`
- `wife`
- `shared-1`
- `shared-2`
- `shared-3`
- `shared-4`

Path proved:

`CompactCorner -> Temporary Chat -> GPT-5.4 Thinking -> relay -> smoke-ok`

`shared-5` is now provisioned as the seventh host-worker slot, but it still needs manual login plus its first live proof before it should be treated as rollout-usable.

All windows were closed again after proof finished.

`Phase 11` is no longer blocked by runtime rescue work, but it still waits on the dedicated server browser-runtime migration. The local compact-visible baseline is now explicit, and the temporary local seven-worker snapshot exists only as a confidence aid while server access is busy.

## Local Rollout Smoke

If server-side desktop access is temporarily busy, use this local-only seven-worker snapshot on the operator PC:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\host-worker\test-local-rollout-smoke.ps1 `
  -OutputJsonPath .\.planning\phases\10.6.1.2.1-local-machine-rollout-smoke-confidence\10.6.1.2.1-WORKER-MATRIX.json `
  -OutputMarkdownPath .\.planning\phases\10.6.1.2.1-local-machine-rollout-smoke-confidence\10.6.1.2.1-WORKER-MATRIX.md
```

What this proves:

- the current local PC can still run the official seven-worker compact-visible proof path
- each worker result is recorded explicitly

What this does not prove:

- it does not replace the pending server-hosted runtime migration
- it does not mean the operator PC can be switched off

Latest local snapshot on 2026-03-30:

- usable: `dad`, `wife`, `shared-1`, `shared-3`, `shared-5`
- currently failing: `shared-2`, `shared-4`
- repeated failure code on both: `worker_chat_bootstrap_timeout`

Latest local snapshot on 2026-03-30:

- usable: `dad`, `wife`, `shared-1`, `shared-3`, `shared-5`
- currently failing: `shared-2`, `shared-4`
- repeated failure code on both: `worker_chat_bootstrap_timeout`

## Notes

- runtime truth для compact-visible должен показывать `runtimeClass=host_visible_compact`
- proxy для host-native workers идёт через локальный mixed proxy на `127.0.0.1:7897`
- Docker restart actions не применяются к host-native workers
- окна должны открываться только по делу и не оставаться висеть после proof/recovery
