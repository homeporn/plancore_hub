# plancore

Перезапуск PlancoreAI — инструмент аудита и построения календарно-сетевых
графиков (КСГ) — на чистой архитектуре.

## Структура (монорепо, pnpm + Turborepo)

```
apps/
  web/              # Next.js 15 (App Router) — UI (в разработке)
packages/
  core/             # @plancore/core — чистый TS-домен (без React и сети)
    src/schedule/   # каноническая модель ScheduleRow, типы связей, helpers
    src/audit/      # движок аудита + playbook рекомендаций
    src/cpm/        # метод критического пути (ES/EF/LS/LF/резервы)
    src/import/     # парсер Excel (TaskRow DTO) + единый маппер в ScheduleRow
  data/             # @plancore/data — Supabase-адаптеры (в разработке)
supabase/           # миграции, edge functions (в разработке)
```

### Архитектурные принципы
- `core` ни от чего не зависит и покрыт тестами.
- `data` зависит от `core`, маппит БД ↔ домен.
- `web` зависит от `core`/`data`, **бизнес-логику не содержит**.
- Единая модель `ScheduleRow`; `TaskRow` — только DTO импорта Excel.
- TypeScript `strict` (включая `strictNullChecks`) с самого начала.

## Команды

```sh
pnpm install
pnpm typecheck    # tsc по всем пакетам
pnpm test         # vitest
pnpm build        # сборка пакетов
pnpm dev          # запуск приложений (когда появится apps/web)
```

## Статус
- [x] Волна 0 — каркас монорепо, CI, strict TS
- [x] Волна 1 — доменное ядро (`@plancore/core`): schedule / audit / cpm / import + тесты
- [x] Волна 2 — MVP: импорт Excel + аудит (UI на Next.js)
- [x] Волна 3 — backend (Supabase): auth, загрузка сохранённых проектов, аудит сохранённого графика
- [ ] Волна 4 — конструктор + CPM в UI
- [ ] Волна 5 — логический сетевой граф

### Конфигурация (Волна 3)
`apps/web/.env.local` (не коммитится):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```
`packages/data` подключается к **существующей** базе plancoreai
(`arvesrgqdpsbkxbhiquc`) — схема не меняется, слой только читает/маппит
данные под каноническую модель `ScheduleRow`. Типы БД сгенерированы
из проекта (`packages/data/src/supabase/database.types.ts`).
