'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Boxes, Send, CheckSquare } from 'lucide-react';
import { parseExcelFile, importToSchedule, type ScheduleRow } from '@plancore/core';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useScheduleStore } from './useScheduleStore';
import { useScheduleCollab } from './useScheduleCollab';
import { ScheduleGrid } from './ScheduleGrid';
import { ScheduleSaveBar } from './ScheduleSaveBar';
import { EditorTaskBar } from './EditorTaskBar';
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
  // A version that isn't editable (approved / in review) locks all edits.
  const readOnly = current ? !collab.editable : false;

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
          toast.warning('Не хватает колонок', { description: missingColumns.join(', ') });
          return;
        }
        const rows = importToSchedule(tasks);
        store.loadRows(rows);
        toast.success('Импорт завершён', { description: `Загружено строк: ${rows.length}` });
      } catch {
        toast.error('Не удалось прочитать файл Excel');
      }
    }).catch(() => toast.error('Ошибка чтения файла'));
    e.target.value = '';
  }, [store]);

  const handleCommit = useCallback((rowId: string, field: keyof ScheduleRow, value: unknown) => {
    store.updateCell(rowId, field, value as ScheduleRow[typeof field]);
  }, [store]);

  // Ctrl/Cmd+C / +V copy & paste whole rows — but not while editing a cell.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (readOnly || !(e.ctrlKey || e.metaKey)) return;
      const el = document.activeElement;
      const editing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
      if (editing) return;
      const key = e.key.toLowerCase();
      if (key === 'c' && store.selectedRowIds.length > 0) {
        store.copyRows(store.selectedRowIds);
      } else if (key === 'v' && store.clipboardCount > 0) {
        e.preventDefault();
        store.pasteRows();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readOnly, store]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold">Конструктор графика</h1>
          {current && <span className="text-xs text-muted-foreground">· {current.name}</span>}
        </div>

        <CpmSummary cpmOutput={store.cpmOutput} />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {current && (
            <>
              <ScheduleSaveBar
                editable={collab.editable}
                others={collab.others}
                stale={collab.stale}
                saveState={collab.saveState}
                error={collab.error}
                onSave={() => void collab.save(store.rows)}
                onReload={() => void collab.reload()}
              />
              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Импорт Excel
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFile}
          />

          {current && (
            <>
              <Button variant="outline" size="sm" onClick={() => setVolumeImportOpen(true)}>
                <Boxes className="h-4 w-4" /> Тома
              </Button>
              <Button variant="outline" size="sm" onClick={() => setHandoffOpen(true)}>
                <Send className="h-4 w-4" /> Задания
              </Button>
              <Button variant="outline" size="sm" onClick={() => setApprovalOpen(true)}>
                <CheckSquare className="h-4 w-4" /> Согласование
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Task toolbar: add / batch row operations */}
      <EditorTaskBar
        selectedCount={store.selectedRowIds.length}
        clipboardCount={store.clipboardCount}
        disabled={readOnly}
        onAddTask={() => store.addRowAfter(store.selectedRowIds.at(-1) ?? store.rows.at(-1)?.row_id ?? null)}
        onAddMilestone={() => store.addRowAfter(store.selectedRowIds.at(-1) ?? store.rows.at(-1)?.row_id ?? null, true)}
        onDuplicate={() => store.duplicateRows(store.selectedRowIds)}
        onDelete={() => store.deleteRows(store.selectedRowIds)}
        onMoveUp={() => store.moveRowsUp(store.selectedRowIds)}
        onMoveDown={() => store.moveRowsDown(store.selectedRowIds)}
        onCopy={() => store.copyRows(store.selectedRowIds)}
        onPaste={() => store.pasteRows()}
      />

      {current && (
        <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Согласование версии</DialogTitle>
            </DialogHeader>
            <ApprovalPanel projectId={current.id} rows={store.rows} />
          </DialogContent>
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
          onImported={(n) => toast.success('Импорт томов', { description: `Импортировано: ${n}` })}
        />
      )}

      {/* Grid */}
      <div className="min-h-0 flex-1">
        <ScheduleGrid
          rows={store.rows}
          cpmOutput={store.cpmOutput}
          onCommit={handleCommit}
          readOnly={readOnly}
          selectedRowIds={store.selectedRowIds}
          onSelectionChange={store.setSelectedRowIds}
        />
      </div>

      {/* Status bar */}
      <footer className="flex shrink-0 items-center gap-4 border-t bg-muted px-4 py-1 text-xs text-muted-foreground">
        <span>{store.rows.length} строк</span>
        <span className="ml-auto">
          Двойной клик / Enter — редактировать · Tab — следующая ячейка · стрелки — навигация
        </span>
      </footer>
    </div>
  );
}
