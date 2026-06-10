'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Boxes, Send, CheckSquare, SlidersHorizontal, AlertTriangle, CalendarCheck } from 'lucide-react';
import {
  parseExcelFile,
  importToSchedule,
  parseMsProjectXml,
  runAudit,
  scheduleToAuditTasks,
  offsetToDate,
  DEFAULT_CALENDAR,
  type SeverityLevel,
  type ScheduleRow,
} from '@plancore/core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { EditorViewDialog } from './EditorViewDialog';
import { useEditorView } from './useEditorView';
import { CpmSummary } from './CpmSummary';
import { ApprovalPanel } from '@/components/approval/ApprovalPanel';
import { BatchHandoffDialog } from '@/components/handoff/BatchHandoffDialog';
import { VolumeImportDialog } from '@/components/handoff/VolumeImportDialog';
import { takeScheduleHandoff, getWorkingCopy, setWorkingCopy } from '@/lib/scheduleHandoff';
import { useProject } from '@/context/ProjectProvider';
import {
  loadCurrentScheduleRows,
  listCustomColumns,
  createCustomColumn,
  deleteCustomColumn,
  type CustomColumn,
  type CustomColumnType,
} from '@plancore/data';
import { getBrowserClient } from '@/lib/supabase/browser';

export function ScheduleEditor() {
  const store = useScheduleStore();
  const { current } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [volumeImportOpen, setVolumeImportOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const { view, toggleColumn, setDensity, setTheme, reset } = useEditorView();
  const collab = useScheduleCollab(current?.id ?? null, (rows) => store.loadRows(rows));

  // Load the project's custom column definitions.
  const reloadCustomColumns = useCallback(() => {
    if (!current) { setCustomColumns([]); return; }
    listCustomColumns(getBrowserClient(), current.id)
      .then(setCustomColumns)
      .catch(() => { /* non-fatal */ });
  }, [current]);

  useEffect(() => { reloadCustomColumns(); }, [reloadCustomColumns]);

  const addCustomColumn = useCallback(async (label: string, type: CustomColumnType) => {
    if (!current) {
      toast.warning('Выберите проект, чтобы добавить поле');
      return;
    }
    const key = `c_${Math.random().toString(36).slice(2, 8)}`;
    try {
      await createCustomColumn(getBrowserClient(), current.id, {
        key, label, type, sortOrder: customColumns.length,
      });
      toast.success('Поле добавлено', { description: label });
      reloadCustomColumns();
    } catch (e) {
      toast.error('Не удалось добавить поле', { description: e instanceof Error ? e.message : undefined });
    }
  }, [current, customColumns.length, reloadCustomColumns]);

  const removeCustomColumn = useCallback(async (id: string) => {
    try {
      await deleteCustomColumn(getBrowserClient(), id);
      reloadCustomColumns();
    } catch (e) {
      toast.error('Не удалось удалить поле', { description: e instanceof Error ? e.message : undefined });
    }
  }, [reloadCustomColumns]);
  // A version that isn't editable (approved / in review) locks all edits.
  const readOnly = current ? !collab.editable : false;

  // Live audit of the current rows for inline highlighting + a findings badge.
  const audit = useMemo(() => runAudit(scheduleToAuditTasks(store.rows)), [store.rows]);
  const rowIssues = useMemo(() => {
    const rank: Record<SeverityLevel, number> = { info: 0, warning: 1, critical: 2 };
    const bySdr = new Map<string, SeverityLevel>();
    for (const f of audit.findings) {
      const cur = bySdr.get(f.taskSdr);
      if (!cur || rank[f.level] > rank[cur]) bySdr.set(f.taskSdr, f.level);
    }
    const m = new Map<string, SeverityLevel>();
    for (const r of store.rows) {
      const lvl = bySdr.get(r.sdr);
      if (lvl) m.set(r.row_id, lvl);
    }
    return m;
  }, [audit, store.rows]);

  // Planned dates derived from CPM, anchored to the earliest explicit start
  // (or today), so «Начало/Конец» show real dates instead of blanks.
  const cpmDates = useMemo(() => {
    const explicit = store.rows
      .map((r) => r.startDate)
      .filter((d): d is Date => d instanceof Date);
    const anchor = explicit.length
      ? new Date(Math.min(...explicit.map((d) => d.getTime())))
      : new Date();
    const m = new Map<string, { start: Date; end: Date }>();
    for (const r of store.rows) {
      const res = store.cpmOutput.results.get(r.row_id);
      if (!res) continue;
      m.set(r.row_id, {
        start: offsetToDate(anchor, res.early_start, DEFAULT_CALENDAR),
        end: offsetToDate(anchor, Math.max(res.early_start, res.early_finish - 1), DEFAULT_CALENDAR),
      });
    }
    return m;
  }, [store.rows, store.cpmOutput]);

  // On mount, prefer wizard/template handoff; otherwise load the current
  // project's saved schedule (if a project is selected in the Hub).
  useEffect(() => {
    const handoff = takeScheduleHandoff();
    if (handoff && handoff.length > 0) {
      store.loadRows(handoff);
      return;
    }
    // Unsaved working copy (e.g. after switching to the graph and back).
    const working = getWorkingCopy(current?.id ?? null);
    if (working && working.length > 0) {
      store.loadRows(working);
      return;
    }
    if (current) {
      loadCurrentScheduleRows(getBrowserClient(), current.id)
        .then((rows) => { if (rows.length > 0) store.loadRows(rows); })
        .catch(() => { /* fall back to blank editor */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the cross-mode working copy in sync so editor ⇄ graph never loses edits.
  useEffect(() => {
    setWorkingCopy(current?.id ?? null, store.rows);
  }, [store.rows, current]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isXml = /\.xml$/i.test(file.name);

    if (isXml) {
      // MS Project XML (MSPDI) import.
      file.text().then((text) => {
        try {
          const rows = parseMsProjectXml(text);
          if (rows.length === 0) {
            toast.warning('В файле не найдено задач MS Project');
            return;
          }
          store.loadRows(rows);
          toast.success('Импорт MS Project завершён', { description: `Загружено задач: ${rows.length}` });
        } catch {
          toast.error('Не удалось разобрать MS Project XML');
        }
      }).catch(() => toast.error('Ошибка чтения файла'));
      e.target.value = '';
      return;
    }

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
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
      } else if (key === 'y') {
        e.preventDefault();
        store.redo();
      } else if (key === 'c' && store.selectedRowIds.length > 0) {
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

        {audit.findings.length > 0 && (
          <Badge variant={audit.criticalCount > 0 ? 'destructive' : 'warning'} className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Замечаний: {audit.findings.length}
          </Badge>
        )}

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

          <Button variant="outline" size="sm" onClick={() => setViewOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" /> Вид
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={readOnly}
            onClick={() => {
              store.applyDates(cpmDates);
              toast.success('Даты зафиксированы', { description: 'Расчётные даты МКП записаны в график' });
            }}
            title="Записать расчётные даты МКП в поля Начало/Конец"
          >
            <CalendarCheck className="h-4 w-4" /> Даты
          </Button>

          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Импорт Excel / MS Project
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.xml"
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
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        onUndo={() => store.undo()}
        onRedo={() => store.redo()}
        onAddTask={() => store.addRowAfter(store.selectedRowIds.at(-1) ?? store.rows.at(-1)?.row_id ?? null)}
        onAddMilestone={() => store.addRowAfter(store.selectedRowIds.at(-1) ?? store.rows.at(-1)?.row_id ?? null, true)}
        onDuplicate={() => store.duplicateRows(store.selectedRowIds)}
        onDelete={() => store.deleteRows(store.selectedRowIds)}
        onMoveUp={() => store.moveRowsUp(store.selectedRowIds)}
        onMoveDown={() => store.moveRowsDown(store.selectedRowIds)}
        onCopy={() => store.copyRows(store.selectedRowIds)}
        onPaste={() => store.pasteRows()}
        onIndent={() => store.indentRows(store.selectedRowIds)}
        onOutdent={() => store.outdentRows(store.selectedRowIds)}
        onRenumber={() => store.renumber()}
      />

      <EditorViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        view={view}
        onToggleColumn={toggleColumn}
        onDensity={setDensity}
        onTheme={setTheme}
        onReset={reset}
        customColumns={customColumns}
        canAddCustom={!!current}
        onAddCustom={addCustomColumn}
        onRemoveCustom={removeCustomColumn}
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
          rows={store.visibleRows}
          cpmOutput={store.cpmOutput}
          onCommit={handleCommit}
          readOnly={readOnly}
          selectedRowIds={store.selectedRowIds}
          onSelectionChange={store.setSelectedRowIds}
          rowMeta={store.rowMeta}
          onToggleCollapse={store.toggleCollapse}
          visibleColIds={view.visibleCols}
          density={view.density}
          gridTheme={view.theme}
          customColumns={customColumns}
          onCustomCommit={store.updateCustom}
          rowIssues={rowIssues}
          cpmDates={cpmDates}
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
