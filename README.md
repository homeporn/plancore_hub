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
- [ ] Волна 2 — MVP: импорт Excel + аудит (UI на Next.js)
- [ ] Волна 3 — backend и сохранение проектов (Supabase)
- [ ] Волна 4 — конструктор + CPM в UI
- [ ] Волна 5 — логический сетевой граф
