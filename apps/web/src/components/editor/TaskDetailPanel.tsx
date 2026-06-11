'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import {
  formatPredecessors,
  parsePredecessors,
  type ScheduleRow,
} from '@plancore/core';
import type { CustomColumn } from '@plancore/data';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { STATUS_LABELS } from './columnDefs';

const ROW_TYPES = ['заголовок', 'задание', 'задача/разработка', 'веха', 'согласование'];
const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED'];

const SELECT_CLASS =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50';

function toInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '';
}
function fromInput(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
}

interface Props {
  row: ScheduleRow;
  rows: ScheduleRow[];
  customColumns: CustomColumn[];
  readOnly: boolean;
  /** CPM-derived dates, used as placeholders when no explicit date is set. */
  effective?: { start: Date | null; end: Date | null };
  onField: <K extends keyof ScheduleRow>(field: K, value: ScheduleRow[K]) => void;
  onCustom: (key: string, value: string) => void;
  onClose: () => void;
}

/** Bottom detail panel: full editable view of the selected task. */
export function TaskDetailPanel({
  row,
  rows,
  customColumns,
  readOnly,
  effective,
  onField,
  onCustom,
  onClose,
}: Props) {
  const { idToSdr, sdrToId } = useMemo(() => {
    const idToSdr = new Map<string, string>();
    const sdrToId = new Map<string, string>();
    for (const r of rows) {
      if (!r.sdr) continue;
      idToSdr.set(r.row_id, r.sdr);
      sdrToId.set(r.sdr, r.row_id);
    }
    return { idToSdr, sdrToId };
  }, [rows]);

  const predText = formatPredecessors(row.predecessors, idToSdr);

  return (
    <div className="flex h-full flex-col border-t bg-card">
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">{row.sdr || '—'}</span>
        <span className="truncate text-sm font-semibold">{row.name || 'Без названия'}</span>
        <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={onClose} aria-label="Закрыть">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Наименование">
          <Input value={row.name} disabled={readOnly} onChange={(e) => onField('name', e.target.value)} />
        </Field>

        <Field label="Тип">
          <select
            className={SELECT_CLASS}
            value={row.row_type}
            disabled={readOnly}
            onChange={(e) => onField('row_type', e.target.value as ScheduleRow['row_type'])}
          >
            {ROW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Статус">
          <select
            className={SELECT_CLASS}
            value={row.taskStatus}
            disabled={readOnly}
            onChange={(e) => onField('taskStatus', e.target.value as ScheduleRow['taskStatus'])}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
          </select>
        </Field>

        <Field label="Длительность (раб. дни)">
          <Input
            type="number"
            min={0}
            value={row.duration ?? ''}
            disabled={readOnly}
            onChange={(e) => onField('duration', e.target.value === '' ? null : Number(e.target.value))}
          />
        </Field>

        <Field label="% завершения">
          <Input
            type="number"
            min={0}
            max={100}
            value={row.percentComplete ?? ''}
            disabled={readOnly}
            onChange={(e) => onField('percentComplete', e.target.value === '' ? null : Number(e.target.value))}
          />
        </Field>

        <Field label="Предшественники (СДР)">
          <Input
            value={predText}
            disabled={readOnly}
            placeholder="напр. 1.2; 3SS-2"
            onChange={(e) => onField('predecessors', parsePredecessors(e.target.value, sdrToId, row.row_id))}
          />
        </Field>

        <Field label="Начало">
          <Input
            type="date"
            value={toInput(row.startDate ?? effective?.start ?? null)}
            disabled={readOnly}
            onChange={(e) => onField('startDate', fromInput(e.target.value))}
          />
        </Field>

        <Field label="Конец">
          <Input
            type="date"
            value={toInput(row.endDate ?? effective?.end ?? null)}
            disabled={readOnly}
            onChange={(e) => onField('endDate', fromInput(e.target.value))}
          />
        </Field>

        <Field label="Ответственный">
          <Input value={row.responsible} disabled={readOnly} onChange={(e) => onField('responsible', e.target.value)} />
        </Field>

        <Field label="Организация">
          <Input value={row.organization} disabled={readOnly} onChange={(e) => onField('organization', e.target.value)} />
        </Field>

        <Field label="Отдел">
          <Input value={row.department} disabled={readOnly} onChange={(e) => onField('department', e.target.value)} />
        </Field>

        <Field label="Стадия">
          <Input value={row.stage} disabled={readOnly} onChange={(e) => onField('stage', e.target.value as ScheduleRow['stage'])} />
        </Field>

        {customColumns.map((c) => (
          <Field key={c.id} label={c.label}>
            <Input
              type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'}
              value={row.custom?.[c.key] ?? ''}
              disabled={readOnly}
              onChange={(e) => onCustom(c.key, e.target.value)}
            />
          </Field>
        ))}

        <Field label="Комментарий" className="sm:col-span-2 lg:col-span-3">
          <Textarea
            value={row.comment}
            disabled={readOnly}
            rows={2}
            onChange={(e) => onField('comment', e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
