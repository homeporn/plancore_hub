'use client';

import { useMemo, useState } from 'react';
import {
  analyzeFixes,
  applyFixes,
  type FixProposal,
  type ScheduleRow,
} from '@plancore/core';
import { Button, Alert, Card } from '@plancore/ui';

interface AutofixPanelProps {
  rows: ScheduleRow[];
  /** Called with corrected rows when the user applies a selection. */
  onApply: (rows: ScheduleRow[]) => void;
}

/**
 * Lists deterministic auto-correction proposals for the current schedule and
 * lets the user apply a chosen subset, with a before→after preview.
 */
export function AutofixPanel({ rows, onApply }: AutofixPanelProps) {
  const proposals = useMemo(() => analyzeFixes(rows), [rows]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  if (proposals.length === 0) {
    return (
      <Alert tone="success">✓ Автоматических исправлений не требуется.</Alert>
    );
  }

  const key = (p: FixProposal) => `${p.rowId}:${p.fixId}`;
  const allKeys = proposals.map(key);
  const allSelected = selected.size === proposals.length;

  function toggle(k: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allKeys));
  }

  function apply() {
    const chosen = proposals.filter((p) => selected.has(key(p)));
    if (chosen.length === 0) return;
    onApply(applyFixes(rows, chosen).rows);
    setSelected(new Set());
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Автокоррекция · {proposals.length} предложений</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll}>
            {allSelected ? 'Снять все' : 'Выбрать все'}
          </Button>
          <Button size="sm" onClick={apply} disabled={selected.size === 0}>
            Исправить выбранное ({selected.size})
          </Button>
        </div>
      </div>

      <ul className="divide-y divide-[var(--border)]">
        {proposals.map((p) => {
          const k = key(p);
          return (
            <li key={k} className="flex items-center gap-3 py-2 text-sm">
              <input type="checkbox" checked={selected.has(k)} onChange={() => toggle(k)} />
              <span className="font-mono text-xs text-[var(--muted)] w-16 shrink-0">{p.sdr || '—'}</span>
              <span className="flex-1">{p.label}</span>
              <span className="text-xs text-[var(--muted)]">
                <span className="line-through">{p.before}</span>
                {' → '}
                <span className="text-[var(--foreground)]">{p.after}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
