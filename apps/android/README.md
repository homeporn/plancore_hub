# PlanCore Mobile — Android

Нативное Android-приложение (Kotlin + Jetpack Compose) для **просмотра**
графиков проектов PlanCore с телефона. Read-only MVP: вход, список проектов,
таблица графика, логическая сеть (граф) и результаты аудита. Бэкенд —
существующий Supabase-проект, доступ ограничен RLS по членству пользователя.

## Требования

- Android Studio (Koala+) или Gradle 8.7+
- JDK 17
- Android SDK 34

## Настройка и запуск

```bash
cd apps/android
cp local.properties.example local.properties   # укажите sdk.dir и значения Supabase
./gradlew assembleDebug                          # сборка APK
./gradlew test                                   # юнит-тесты (порт раскладки графа)
```

Либо откройте папку `apps/android` в Android Studio, дайте Gradle
синхронизироваться и запустите конфигурацию `app` на эмуляторе/устройстве.

> Gradle wrapper (`gradlew`, `gradle/wrapper/`) генерируется при первом
> открытии в Android Studio или командой `gradle wrapper --gradle-version 8.7`.

## Конфигурация

`local.properties` (git-ignored) задаёт `sdk.dir`, `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`. Значения пробрасываются в `BuildConfig` через
`app/build.gradle.kts`; при отсутствии используются дефолты проекта
`arvesrgqdpsbkxbhiquc`. Publishable-ключ клиентский (безопасно встраивать),
доступ к данным ограничивает RLS.

## Структура

| Пакет | Назначение |
|-------|-----------|
| `auth/` | Вход по email/паролю (Supabase Auth) |
| `projects/` | Список проектов и карточка проекта (вкладки) |
| `schedule/` | Табличный просмотр строк графика |
| `graph/` | Модель графа, порт раскладки `layout.ts`, Compose Canvas |
| `audit/` | Список находок аудита |
| `data/` | Supabase-клиент, модели, репозитории |

## Соответствие вебу

Запросы повторяют `packages/data/src/repositories/projects.ts`; декодирование
строк — `packages/data/src/mappers/scheduleVersionTask.ts`; алгоритм раскладки
графа — порт `packages/core/src/graph/layout.ts` (тесты в
`app/src/test/java/ai/plancore/mobile/GraphLayoutTest.kt`).

## Вне MVP

Редактирование, импорт Excel, мастер создания, библиотеки, согласование,
офлайн-кэш, пуш-уведомления.
