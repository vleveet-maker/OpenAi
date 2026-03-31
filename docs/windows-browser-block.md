# Windows Browser Block

## Что Это

`Windows browser block` это отдельный Windows-хост, на котором живут:

- `host-controller`
- семь browser worker-профилей:
  - `dad`
  - `wife`
  - `shared-1`
  - `shared-2`
  - `shared-3`
  - `shared-4`
  - `shared-5`
- локальный proxy runtime
- reverse SSH tunnels до Linux relay/API сервера

Это не публичный API-узел. Публичный API остаётся на Linux-сервере. Windows block держит только браузеры и локальный control surface для них.

## Текущая Архитектура

Сейчас доказанный удалённый путь такой:

1. Linux-сервер держит `owmcgp-remote-relay`
2. публичный вызов приходит в Linux `nginx`
3. relay на Linux ходит к worker-ам через `127.0.0.1:14021..14027`
4. эти порты поднимаются reverse SSH tunnels с Windows browser block
5. сами браузеры и профили живут только на Windows

## Почему Не Windows Services Для Самих Браузеров

GUI-браузеры для ручного логина и reauth не должны жить в `Session 0`.

Поэтому:

- `host-controller` можно поднимать автоматически
- reverse tunnels можно поднимать автоматически
- сами browser worker-ы должны запускаться в интерактивной пользовательской сессии
- для Windows Server нужен отдельный пользовательский desktop session, а не headless service-only запуск

Именно поэтому рекомендуемый стартовый вариант для Windows Server:

- autologon или постоянная интерактивная сессия под выделенным пользователем
- `host-controller` стартует при логоне
- reverse tunnels стартуют при логоне
- browser worker-ы стартуют по требованию через `host-controller`

## Что Должно Быть На Windows Server

- Windows Server с Desktop Experience
- отдельный пользователь под browser block
- Node.js LTS
- Chrome или Edge
- OpenSSH client (`ssh.exe`)
- доступ к репозиторию или развёрнутому пакету
- durable profile storage

Рекомендуемые локальные порты:

- `4040` - `host-controller`
- `4021..4027` - worker-agent порты
- `9222..9228` - CDP порты
- `7897` - локальный mixed proxy

Рекомендуемые удалённые reverse ports на Linux relay:

- `14021..14027` -> `4021..4027`
- `14040` -> `4040` опционально для диагностики

## Подготовленные Скрипты

- [start-browser-block.ps1](d:/OpenAi/infra/windows-block/start-browser-block.ps1)
- [start-reverse-tunnels.ps1](d:/OpenAi/infra/windows-block/start-reverse-tunnels.ps1)
- [stop-reverse-tunnels.ps1](d:/OpenAi/infra/windows-block/stop-reverse-tunnels.ps1)
- [register-browser-block-tasks.ps1](d:/OpenAi/infra/windows-block/register-browser-block-tasks.ps1)

## Базовый Порядок Развёртывания

1. Развернуть код на Windows Server.
2. Под тем же интерактивным пользователем подготовить browser profiles.
3. Запустить:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-browser-block.ps1
```

4. Запустить reverse tunnels:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\start-reverse-tunnels.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50
```

5. При необходимости зарегистрировать оба автозапуска на logon:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\register-browser-block-tasks.ps1 `
  -RemoteHost 77.66.186.75 `
  -RemotePort 2222 `
  -RemoteUser mi50
```

## Проверка Семёрки

Прямой worker-by-worker smoke без `control-api` и без Docker:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\host-worker\test-windows-browser-block-matrix.ps1
```

Этот путь проверяет:

- старт worker-а через `host-controller`
- `Temporary Chat`
- выбор `GPT-5.4 Thinking`
- живой ответ
- остановку окна после проверки

## Текущая Живая Правда

Последняя полная матрица на `2026-03-30`:

- `shared-1`, `shared-2`, `shared-3`, `shared-4`, `shared-5` - прошли
- `dad` - плавающий bootstrap хвост `temporary_confirmation_not_found`
- `wife` - плавающий bootstrap хвост `model_option_not_found`

То есть блок уже реальный и рабочий, но не все 7 профилей пока одинаково стабильны.

## Связанный Документ

Публичный API и Linux relay описаны здесь:

- [remote-relay-server.md](d:/OpenAi/docs/remote-relay-server.md)

## Phase 10.6.1.2 Addendum

Fresh direct proof on `2026-03-30` reached `7/7 usable` on the current machine:

- `dad`
- `wife`
- `shared-1`
- `shared-2`
- `shared-3`
- `shared-4`
- `shared-5`

This proves the current Windows browser block shape and the handoff package honestly.

It does **not** claim that cutover onto a dedicated Windows Server has already happened.

## Preserve-First Deployed Server Addendum

If a Windows Server already contains live logged-in ChatGPT accounts, do not treat it as a disposable redeploy target.

Safe order:

1. freeze and audit first
2. backup metadata first
3. cold profile backup only when workers are stopped
4. canary worker first
5. subset second
6. full-pool validation last

New preserve-first tools:

- [backup-browser-block-state.ps1](d:/OpenAi/infra/windows-block/backup-browser-block-state.ps1)
- [restore-browser-block-state.ps1](d:/OpenAi/infra/windows-block/restore-browser-block-state.ps1)
- [test-browser-block-canary.ps1](d:/OpenAi/infra/windows-block/test-browser-block-canary.ps1)
- [test-browser-block-subset.ps1](d:/OpenAi/infra/windows-block/test-browser-block-subset.ps1)

Freeze metadata:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\backup-browser-block-state.ps1
```

Cold profile backup after workers are stopped:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\backup-browser-block-state.ps1 -CopyProfiles
```

Single-worker canary:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\test-browser-block-canary.ps1 -WorkerId shared-6
```

Subset validation:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows-block\test-browser-block-subset.ps1 -WorkerIds shared-5,shared-6,shared-7
```
