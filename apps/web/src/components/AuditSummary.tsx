'use client';

import type { AuditResult } from '@plancore/core';
import { Card, CardContent } from '@/components/ui/card';

interface AuditSummaryProps {
  result: AuditResult;
}

export function AuditSummary({ result }: AuditSummaryProps) {
  const passRate =
    result.totalTasks > 0 ? Math.round((result.passedCount / result.totalTasks) * 100) : 0;

  const cards: { label: string; value: number; className: string }[] = [
    { label: 'Всего задач', value: result.totalTasks, className: 'text-foreground' },
    { label: 'Критические', value: result.criticalCount, className: 'text-destructive' },
    { label: 'Средние', value: result.warningCount, className: 'text-amber-600' },
    { label: 'Информационные', value: result.infoCount, className: 'text-blue-600' },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold tabular-nums">{passRate}%</span>
            <span className="text-sm text-muted-foreground">
              задач без замечаний ({result.passedCount} из {result.totalTasks})
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${passRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className={`text-2xl font-semibold tabular-nums ${c.className}`}>{c.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
