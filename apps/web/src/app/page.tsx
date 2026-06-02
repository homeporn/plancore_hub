import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">PlanCore</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          Аудит и построение календарно-сетевых графиков. Загрузите график из
          Excel — система проверит его на ошибки логики, структуры СДР, связей
          и дат.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/app"
          className="rounded-lg bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Аудит графика
        </Link>
        <Link
          href="/editor"
          className="rounded-lg border border-[var(--border)] px-6 py-3 text-sm font-medium transition-colors hover:bg-gray-50"
        >
          Конструктор
        </Link>
        <Link
          href="/wizard"
          className="rounded-lg border border-[var(--border)] px-6 py-3 text-sm font-medium transition-colors hover:bg-gray-50"
        >
          Мастер
        </Link>
        <Link
          href="/graph"
          className="rounded-lg border border-[var(--border)] px-6 py-3 text-sm font-medium transition-colors hover:bg-gray-50"
        >
          Сетевой граф
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-3 text-left text-sm text-[var(--muted)] sm:grid-cols-3">
        <li className="rounded-lg border border-[var(--border)] p-4">
          📥 Импорт графика из Excel
        </li>
        <li className="rounded-lg border border-[var(--border)] p-4">
          🔍 Аудит качества по правилам
        </li>
        <li className="rounded-lg border border-[var(--border)] p-4">
          🧮 Расчёт критического пути (МКП)
        </li>
      </ul>
    </main>
  );
}
