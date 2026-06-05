'use client';

import { AlertTriangle } from 'lucide-react';
import type { CpmOutput } from '@plancore/core';
import { Badge } from '@/components/ui/badge';

interface CpmSummaryProps {
  cpmOutput: CpmOutput;
}

/** Compact critical-path summary shown in the editor toolbar. */
export function CpmSummary({ cpmOutput }: CpmSummaryProps) {
  const { projectDuration, criticalPath, hasCycles, results } = cpmOutput;
  const totalTasks = results.size;
  const criticalCount = criticalPath.length;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">
        Длительность:{' '}
        <span className="font-medium text-foreground tabular-nums">{projectDuration}</span> р.д.
      </span>
      <span className="text-muted-foreground">
        Крит. путь:{' '}
        <span className="font-medium text-destructive tabular-nums">
          {criticalCount}/{totalTasks}
        </span>
      </span>
      {hasCycles && (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Циклы в связях
        </Badge>
      )}
    </div>
  );
}
