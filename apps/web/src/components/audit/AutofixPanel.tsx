'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Wand2 } from 'lucide-react';
import {
  analyzeFixes,
  applyFixes,
  type FixProposal,
  type ScheduleRow,
} from '@plancore/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        <CheckCircle2 className="h-4 w-4" /> Автоматических исправлений не требуется.
      </div>
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
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Wand2 className="h-4 w-4 text-muted-foreground" />
          Автокоррекция · {proposals.length} предложений
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll}>
            {allSelected ? 'Снять все' : 'Выбрать все'}
          </Button>
          <Button size="sm" onClick={apply} disabled={selected.size === 0}>
            Исправить ({selected.size})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {proposals.map((p) => {
            const k = key(p);
            return (
              <li key={k} className="flex items-center gap-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(k)}
                  onChange={() => toggle(k)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                  {p.sdr || '—'}
                </span>
                <span className="flex-1">{p.label}</span>
                <span className="text-xs text-muted-foreground">
                  <span className="line-through">{p.before}</span>
                  {' → '}
                  <span className="text-foreground">{p.after}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
