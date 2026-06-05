'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseExcelFile, importToSchedule, type ScheduleRow } from '@plancore/core';
import { Button, Dialog } from '@plancore/ui';
import { useScheduleStore } from './useScheduleStore';
import { useScheduleCollab } from './useScheduleCollab';
import { ScheduleGrid } from './ScheduleGrid';
import { ScheduleSaveBar } from './ScheduleSaveBar';
import { CpmSummary } from './CpmSummary';
import { ApprovalPanel } from '@/components/approval/ApprovalPanel';
import { BatchHandoffDialog } from '@/components/handoff/BatchHandoffDialog';
import { VolumeImportDialog } from '@/components/handoff/VolumeImportDialog';
import { takeScheduleHandoff } from '@/lib/scheduleHandoff';
import { useProject } from '@/context/ProjectProvider';
import { loadCurrentScheduleRows } from '@plancore/data';
import { getBrowserClient } from '@/lib/supabase/browser';

export function ScheduleEditor() {
  const store = useScheduleStore();
  const { current } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [volumeImportOpen, setVolumeImportOpen] = useState(false);
  const collab = useScheduleCollab(current?.id ?? null, (rows) => store.loadRows(rows));

  // On mount, prefer wizard/template handoff; otherwise load the current
  // project's saved schedule (if a project is selected in the Hub).
  useEffect(() => {
    const handoff = takeScheduleHandoff();
    if (handoff && handoff.length > 0) {
      store.loadRows(handoff);
      return;
    }
    if (current) {
      loadCurrentScheduleRows(getBrowserClient(), current.id)
        .then((rows) => { if (rows.length > 0) store.loadRows(rows); })
        .catch(() => { /* fall back to blank editor */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.arrayBuffer().then(buf => {
      try {
        const { tasks, missingColumns } = parseExcelFile(buf);
        if (missingColumns.length > 0) {
          alert(`Отсутствуют колонки: ${missingColumns.join(', ')}`);
          return;
        }
        const rows = importToSchedule(tasks);
        store.loadRows(rows);
      } catch {
        alert('Не удалось прочитать файл Excel.');
      }
    }).catch(() => alert('Ошибка чтения файла.'));
    e.target.value = '';
  }, [store]);

  const handleCommit = useCallback((rowId: string, field: keyof ScheduleRow, value: unknown) => {
    store.updateCell(rowId, field, value as ScheduleRow[typeof field]);
  }, [store]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Toolbar */}
      <header className="flex shrink-0 items-center gap-4 border-b border-[var(--border)] bg-white px-4 py-2">
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">← Главная</Link>
        <h1 className="text-sm font-semibold">Конструктор графика</h1>
        {current && <span className="text-xs text-[var(--muted)]">· {current.name}</span>}

        <div className="flex items-center gap-2 ml-auto">
          <CpmSummary cpmOutput={store.cpmOutput} />

          {current && (
            <ScheduleSaveBar
              editable={collab.editable}
              others={collab.others}
              stale={collab.stale}
              saveState={collab.saveState}
              error={collab.error}
              onSave={() => void collab.save(store.rows)}
              onReload={() => void collab.reload()}
            />
          )}

          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Импорт Excel
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFile}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => store.addRowAfter(store.rows[store.rows.length - 1]?.row_id ?? null)}
          >
            + Строка
          </Button>

          {current && (
            <Button variant="outline" size="sm" onClick={() => setVolumeImportOpen(true)}>
              Импорт томов
            </Button>
          )}
          {current && (
            <Button variant="outline" size="sm" onClick={() => setHandoffOpen(true)}>
              Задания
            </Button>
          )}
          {current && (
            <Button variant="outline" size="sm" onClick={() => setApprovalOpen(true)}>
              Согласование
            </Button>
          )}
        </div>
      </header>

      {current && (
        <Dialog open={approvalOpen} onOpenChange={setApprovalOpen} title="Согласование версии">
          <ApprovalPanel projectId={current.id} rows={store.rows} />
        </Dialog>
      )}

      {current && (
        <BatchHandoffDialog
          projectId={current.id}
          open={handoffOpen}
          onOpenChange={setHandoffOpen}
          onApply={(rows) => store.appendRows(rows)}
        />
      )}

      {current && (
        <VolumeImportDialog
          projectId={current.id}
          open={volumeImportOpen}
          onOpenChange={setVolumeImportOpen}
          onImported={(n) => alert(`Импортировано томов: ${n}`)}
        />
      )}

      {/* Grid */}
      <div className="min-h-0 flex-1">
        <ScheduleGrid rows={store.rows} cpmOutput={store.cpmOutput} onCommit={handleCommit} readOnly={current ? !collab.editable : false} />
      </div>

      {/* Status bar */}
      <footer className="flex shrink-0 items-center gap-4 border-t border-[var(--border)] bg-gray-50 px-4 py-1 text-xs text-[var(--muted)]">
        <span>{store.rows.length} строк</span>
        <span className="ml-auto">
          Двойной клик / Enter — редактировать · Tab — следующая ячейка · стрелки — навигация
        </span>
      </footer>
    </div>
  );
}
