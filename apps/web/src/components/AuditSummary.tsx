'use client';

import type { AuditResult } from '@plancore/core';

interface AuditSummaryProps {
  result: AuditResult;
}

export function AuditSummary({ result }: AuditSummaryProps) {
  const passRate =
    result.totalTasks > 0
      ? Math.round((result.passedCount / result.totalTasks) * 100)
      : 0;

  const cards: { label: string; value: number; color: string }[] = [
    { label: 'Всего задач', value: result.totalTasks, color: 'var(--foreground)' },
    { label: 'Критические', value: result.criticalCount, color: 'var(--critical)' },
    { label: 'Средние', value: result.warningCount, color: 'var(--warning)' },
    { label: 'Информационные', value: result.infoCount, color: 'var(--info)' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-semibold">{passRate}%</span>
        <span className="text-sm text-[var(--muted)]">
          задач без замечаний ({result.passedCount} из {result.totalTasks})
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-[var(--border)] p-4"
          >
            <div className="text-2xl font-semibold" style={{ color: c.color }}>
              {c.value}
            </div>
            <div className="mt-1 text-xs text-[var(--muted)]">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
