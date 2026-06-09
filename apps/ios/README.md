# PlanCore Mobile — iOS

Нативное iOS-приложение (SwiftUI) для **просмотра** графиков проектов PlanCore
с телефона. Read-only MVP: вход, список проектов, таблица графика, логическая
сеть (граф) и результаты аудита. Бэкенд — существующий Supabase-проект, доступ
ограничен RLS по членству пользователя в проектах.

## Требования

- macOS + Xcode 15+
- [XcodeGen](https://github.com/yonyz/XcodeGen) (`brew install xcodegen`) —
  `.xcodeproj` генерируется из `project.yml`, а не хранится в git.

## Настройка и запуск

```bash
cd apps/ios
cp PlanCoreMobile/Secrets.xcconfig.example PlanCoreMobile/Secrets.xcconfig
xcodegen generate          # создаёт PlanCoreMobile.xcodeproj
open PlanCoreMobile.xcodeproj
```

В Xcode выберите схему `PlanCoreMobile`, симулятор iPhone и нажмите Run. SPM
сам подтянет `supabase-swift`.

Сборка из командной строки:

```bash
xcodegen generate
xcodebuild -scheme PlanCoreMobile -destination 'platform=iOS Simulator,name=iPhone 15' build
xcodebuild test -scheme PlanCoreMobile -destination 'platform=iOS Simulator,name=iPhone 15'
```

## Конфигурация

`Secrets.xcconfig` (git-ignored) задаёт:

- `SUPABASE_URL` — без схемы `https://` (xcconfig трактует `//` как комментарий;
  схему добавляет `AppConfig` в рантайме).
- `SUPABASE_PUBLISHABLE_KEY` — клиентский publishable-ключ (безопасно
  встраивать; доступ к данным ограничивает RLS).

Пример уже содержит значения проекта `arvesrgqdpsbkxbhiquc`.

## Структура

| Папка | Назначение |
|-------|-----------|
| `App/` | Точка входа, конфиг (`AppConfig`) |
| `Auth/` | Вход по email/паролю (Supabase Auth) |
| `Projects/` | Список проектов и карточка проекта (вкладки) |
| `Schedule/` | Табличный просмотр строк графика |
| `Graph/` | Модель графа, порт раскладки `layout.ts`, canvas-просмотр |
| `Audit/` | Список находок аудита |
| `Data/` | Supabase-клиент, модели, репозитории |

## Соответствие вебу

Запросы повторяют `packages/data/src/repositories/projects.ts`; декодирование
строк — `packages/data/src/mappers/scheduleVersionTask.ts`; алгоритм раскладки
графа — порт `packages/core/src/graph/layout.ts` (тесты в
`PlanCoreMobileTests/GraphLayoutTests.swift`).

## Вне MVP

Редактирование, импорт Excel, мастер создания, библиотеки, согласование,
офлайн-кэш, пуш-уведомления.
