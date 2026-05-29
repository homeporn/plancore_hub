'use client';

import type { CpmOutput } from '@plancore/core';

interface CpmSummaryProps {
  cpmOutput: CpmOutput;
}

export function CpmSummary({ cpmOutput }: CpmSummaryProps) {
  const { projectDuration, criticalPath, hasCycles, results } = cpmOutput;
  const totalTasks = results.size;
  const criticalCount = criticalPath.length;

  return (
    <div className="flex items-center gap-6 text-sm">
      <div>
        <span className="text-[var(--muted)]">Длительность проекта: </span>
        <span className="font-medium">{projectDuration} р.д.</span>
      </div>
      <div>
        <span className="text-[var(--muted)]">Крит. путь: </span>
        <span className="font-medium text-red-600">{criticalCount} / {totalTasks} задач</span>
      </div>
      {hasCycles && (
        <div className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
          ⚠ Обнаружены циклы в связях
        </div>
      )}
    </div>
  );
}
