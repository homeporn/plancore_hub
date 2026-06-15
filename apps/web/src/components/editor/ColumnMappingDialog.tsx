'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  MAPPABLE_FIELDS,
  guessFieldMapping,
  tasksFromRows,
  importToSchedule,
  type TaskRow,
  type ScheduleRow,
} from '@plancore/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const SELECT_CLASS =
  'flex-1 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sheet headers from the picked Excel file. */
  headers: string[];
  /** Raw sheet rows (preserving cell types). */
  rows: Record<string, unknown>[];
  /** Receives the mapped + converted schedule rows on confirm. */
  onImport: (rows: ScheduleRow[]) => void;
}

/**
 * Column-mapping dialog for Excel import. Only «Название задачи» is required;
 * every other field is optional and can be mapped to any sheet column (handles
 * MS Project's varying export headers). The mapping is pre-filled by auto-guess.
 */
export function ColumnMappingDialog({ open, onOpenChange, headers, rows, onImport }: Props) {
  const [mapping, setMapping] = useState<Partial<Record<keyof TaskRow, string>>>({});

  // Re-seed the auto-guessed mapping whenever a new file is loaded.
  useEffect(() => {
    if (headers.length > 0) setMapping(guessFieldMapping(headers));
  }, [headers]);

  const nameCol = mapping.name;
  const previewCount = useMemo(
    () => (nameCol ? rows.filter((r) => String(r[nameCol] ?? '').trim().length > 0).length : 0),
    [nameCol, rows],
  );

  function doImport() {
    if (!nameCol) {
      toast.warning('Укажите колонку для «Название задачи»');
      return;
    }
    const tasks = tasksFromRows(rows, mapping).filter((t) => t.name.length > 0);
    if (tasks.length === 0) {
      toast.warning('Нет строк с заполненным названием');
      return;
    }
    onImport(importToSchedule(tasks));
    onOpenChange(false);
    toast.success('Импорт завершён', { description: `Загружено строк: ${tasks.length}` });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Сопоставление колонок</DialogTitle>
          <DialogDescription>
            Назначьте, какой столбец файла соответствует каждому полю. Обязательно
            только «Название задачи» — остальное по желанию.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {MAPPABLE_FIELDS.map((f) => (
            <div key={f.field} className="flex items-center gap-2">
              <label className="w-48 shrink-0 text-sm">
                {f.label}
                {f.required && <span className="text-destructive"> *</span>}
              </label>
              <select
                value={mapping[f.field] ?? ''}
                onChange={(e) =>
                  setMapping((prev) => ({ ...prev, [f.field]: e.target.value || undefined }))
                }
                className={SELECT_CLASS}
              >
                <option value="">— не импортировать —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">
            Строк в файле: {rows.length} · будет импортировано: {previewCount}
          </span>
          <Button
            size="sm"
            className="ml-auto"
            disabled={!nameCol || previewCount === 0}
            onClick={doImport}
          >
            Импортировать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
