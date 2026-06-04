import Link from 'next/link';
import { buttonVariants, Card } from '@plancore/ui';

const NAV = [
  { href: '/hub', label: 'Мои проекты (Hub)', primary: true },
  { href: '/app', label: 'Аудит графика' },
  { href: '/editor', label: 'Конструктор' },
  { href: '/wizard', label: 'Мастер' },
  { href: '/graph', label: 'Сетевой граф' },
  { href: '/library', label: 'Библиотека' },
];

const FEATURES = [
  '📥 Импорт графика из Excel',
  '🔍 Аудит качества по правилам',
  '🧮 Расчёт критического пути (МКП)',
];

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

      <div className="flex flex-wrap justify-center gap-3">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={buttonVariants({ variant: n.primary ? 'primary' : 'outline', size: 'lg' })}
          >
            {n.label}
          </Link>
        ))}
      </div>

      <ul className="grid grid-cols-1 gap-3 text-left text-sm text-[var(--muted)] sm:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f} as="li">{f}</Card>
        ))}
      </ul>
    </main>
  );
}
