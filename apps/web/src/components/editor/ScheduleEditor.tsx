'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Boxes, Send, CheckSquare, SlidersHorizontal, AlertTriangle, CalendarCheck, RefreshCw, GanttChartSquare, MessageSquare, Users } from 'lucide-react';
import {
  readSheetRaw,
  parseMsProjectXml,
  runAudit,
  scheduleToAuditTasks,
  offsetToDate,
  recalcProgressByTime,
  mkLink,
  DEFAULT_CALENDAR,
  type ProgressInput,
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
import { GanttChart } from './GanttChart';
import { ColumnMappingDialog } from './ColumnMappingDialog';
import { TaskDetailPanel } from './TaskDetailPanel';
import { useEditorView } from './useEditorView';
import { PLANNING_MODES, planningCaps } from './planningModes';
import { CpmSummary } from './CpmSummary';
import { ApprovalPanel } from '@/components/approval/ApprovalPanel';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { MembersDialog } from '@/components/chat/MembersDialog';
import { useProjectRole } from '@/components/chat/useProjectRole';
import { BatchHandoffDialog } from '@/components/handoff/BatchHandoffDialog';
import { VolumeImportDialog } from '@/components/handoff/VolumeImportDialog';
import { takeScheduleHandoff, getWorkingCopy, setWorkingCopy, takePendingMode } from '@/lib/scheduleHandoff';
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
  // Target date for the progress recalculation (defaults to today).
  const [recalcDate, setRecalcDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ganttOpen, setGanttOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  // Excel column-mapping dialog state.
  const [mapping, setMapping] = useState<{ headers: string[]; rows: Record<string, unknown>[] } | null>(null);
  // Resizable Gantt frame width and detail panel height (px).
  const [ganttWidth, setGanttWidth] = useState(480);
  const [detailHeight, setDetailHeight] = useState(256);
  const { view, colorVars, toggleColumn, setDensity, setTheme, setMode, setColor, resetColors, reset } = useEditorView();
  const caps = planningCaps(view.mode);
  const roleCaps = useProjectRole(current?.id ?? null);
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
  // Locked by version state (approved/in-review) OR by role (viewer can't edit).
  const readOnly = current ? (!collab.editable || (!roleCaps.loading && !roleCaps.canEdit)) : false;

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

  // Recalculate progress by elapsed time as of the chosen date. Uses explicit
  // dates where set, otherwise the CPM-derived ones. Paused tasks stay frozen.
  const handleRecalc = useCallback(() => {
    const asOf = new Date(recalcDate + 'T00:00:00');
    if (Number.isNaN(asOf.getTime())) {
      toast.error('Некорректная дата пересчёта');
      return;
    }
    const inputs: ProgressInput[] = store.rows.map((r) => {
      const d = cpmDates.get(r.row_id);
      return {
        rowId: r.row_id,
        start: r.startDate ?? d?.start ?? null,
        finish: r.endDate ?? d?.end ?? null,
        status: r.taskStatus,
        durationDays: r.duration,
        currentPercent: r.percentComplete,
      };
    });
    const results = recalcProgressByTime(inputs, asOf, DEFAULT_CALENDAR);
    store.applyProgress(results);
    toast.success('Прогресс пересчитан', {
      description: `На дату ${recalcDate.split('-').reverse().join('.')} · задач: ${results.length}`,
    });
  }, [recalcDate, store, cpmDates]);

  // Critical-path rows for Gantt colouring.
  const criticalIds = useMemo(
    () => new Set(store.cpmOutput.criticalPath),
    [store.cpmOutput],
  );

  // Create an FS dependency by dragging a link in the Gantt.
  const handleGanttLink = useCallback((predId: string, succId: string) => {
    const succ = store.rows.find((r) => r.row_id === succId);
    if (!succ || predId === succId) return;
    if (succ.predecessors.some((p) => p.rowId === predId)) return;
    store.updateCell(succId, 'predecessors', [...succ.predecessors, mkLink(predId)]);
  }, [store]);

  // The bottom detail panel shows the "current" selected row; with several
  // rows checked, prev/next step through them.
  const [detailIndex, setDetailIndex] = useState(0);
  const selCount = store.selectedRowIds.length;
  const curDetailIndex = selCount > 0 ? Math.min(detailIndex, selCount - 1) : 0;
  const detailRow = useMemo(
    () => (selCount > 0
      ? store.rows.find((r) => r.row_id === store.selectedRowIds[curDetailIndex]) ?? null
      : null),
    [store.selectedRowIds, store.rows, selCount, curDetailIndex],
  );

  // On mount, prefer wizard/template handoff; otherwise load the current
  // project's saved schedule (if a project is selected in the Hub).
  useEffect(() => {
    // Planning mode chosen in the wizard, if any.
    const pendingMode = takePendingMode();
    if (pendingMode) setMode(pendingMode as Parameters<typeof setMode>[0]);

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

    // Excel: open the column-mapping dialog (only «Название» is required).
    file.arrayBuffer().then(buf => {
      try {
        const { headers, rows } = readSheetRaw(buf);
        if (headers.length === 0) {
          toast.warning('Файл пуст или не содержит данных');
          return;
        }
        setMapping({ headers, rows });
      } catch {
        toast.error('Не удалось прочитать файл Excel');
      }
    }).catch(() => toast.error('Ошибка чтения файла'));
    e.target.value = '';
  }, []);

  const handleCommit = useCallback((rowId: string, field: keyof ScheduleRow, value: unknown) => {
    store.updateCell(rowId, field, value as ScheduleRow[typeof field]);
  }, [store]);

  // Drag the Gantt frame's left edge to resize its width.
  const startGanttResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = ganttWidth;
    const move = (ev: MouseEvent) => {
      const next = startW + (startX - ev.clientX);
      setGanttWidth(Math.max(280, Math.min(1000, next)));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, [ganttWidth]);

  // Drag the detail panel's top edge to resize its height.
  const startDetailResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = detailHeight;
    const move = (ev: MouseEvent) => {
      const next = startH + (startY - ev.clientY);
      setDetailHeight(Math.max(120, Math.min(640, next)));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, [detailHeight]);

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

        {/* Planning mode — gates feature availability per template kind. */}
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          Режим:
          <select
            value={view.mode}
            onChange={(e) => setMode(e.target.value as typeof view.mode)}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {PLANNING_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>

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

          <Button variant={ganttOpen ? 'default' : 'outline'} size="sm" onClick={() => setGanttOpen((v) => !v)}>
            <GanttChartSquare className="h-4 w-4" /> Гантт
          </Button>

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

          {/* Progress recalculation on a chosen date */}
          <div className="flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5">
            <input
              type="date"
              value={recalcDate}
              onChange={(e) => setRecalcDate(e.target.value)}
              className="bg-transparent text-xs outline-none"
              title="Дата, на которую пересчитать прогресс"
            />
            <Button variant="ghost" size="sm" disabled={readOnly} onClick={handleRecalc} title="Пересчитать прогресс по времени на выбранную дату">
              <RefreshCw className="h-4 w-4" /> Пересчитать
            </Button>
          </div>

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
              {caps.volumes && (
                <Button variant="outline" size="sm" onClick={() => setVolumeImportOpen(true)}>
                  <Boxes className="h-4 w-4" /> Тома
                </Button>
              )}
              {caps.handoff && (
                <Button variant="outline" size="sm" onClick={() => setHandoffOpen(true)}>
                  <Send className="h-4 w-4" /> Задания
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setApprovalOpen(true)}>
                <CheckSquare className="h-4 w-4" /> Согласование
              </Button>
              <Button variant="outline" size="sm" onClick={() => setChatOpen(true)}>
                <MessageSquare className="h-4 w-4" /> Чат
              </Button>
              {roleCaps.canManageMembers && (
                <Button variant="outline" size="sm" onClick={() => setMembersOpen(true)}>
                  <Users className="h-4 w-4" /> Участники
                </Button>
              )}
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

      {current && (
        <>
          <ChatPanel
            projectId={current.id}
            projectName={current.name}
            open={chatOpen}
            onOpenChange={setChatOpen}
          />
          {roleCaps.canManageMembers && (
            <MembersDialog
              projectId={current.id}
              projectName={current.name}
              open={membersOpen}
              onOpenChange={setMembersOpen}
            />
          )}
        </>
      )}

      <ColumnMappingDialog
        open={mapping !== null}
        onOpenChange={(o) => { if (!o) setMapping(null); }}
        headers={mapping?.headers ?? []}
        rows={mapping?.rows ?? []}
        onImport={(rows) => store.loadRows(rows)}
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
        onColor={setColor}
        onResetColors={resetColors}
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

      {/* Grid + Gantt (side by side; Gantt on the right) */}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1" style={colorVars}>
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
            onFill={store.fillCell}
            onFillCustom={store.fillCustom}
            rowIssues={rowIssues}
            cpmDates={cpmDates}
          />
        </div>

        {ganttOpen && (
          <div className="flex shrink-0" style={{ width: ganttWidth }}>
            {/* Drag handle to resize the Gantt frame width */}
            <div
              onMouseDown={startGanttResize}
              className="w-1 shrink-0 cursor-ew-resize bg-border hover:bg-primary"
              title="Потяните, чтобы изменить ширину"
            />
            <div className="min-w-0 flex-1 bg-background">
              <GanttChart
                rows={store.visibleRows}
                dates={cpmDates}
                criticalIds={criticalIds}
                selectedId={detailRow?.row_id ?? null}
                readOnly={readOnly}
                onSelect={(id) => store.setSelectedRowIds([id])}
                onResize={(id, days) => store.updateCell(id, 'duration', days)}
                onLink={handleGanttLink}
                showLabels={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom task detail panel */}
      {detailRow && (
        <div className="shrink-0" style={{ height: detailHeight }}>
          {/* Drag handle to resize the panel height */}
          <div
            onMouseDown={startDetailResize}
            className="h-1 cursor-ns-resize bg-border hover:bg-primary"
            title="Потяните, чтобы изменить высоту"
          />
          <div className="h-[calc(100%-0.25rem)]">
            <TaskDetailPanel
              row={detailRow}
              rows={store.rows}
              customColumns={customColumns}
              readOnly={readOnly}
              index={curDetailIndex}
              total={selCount}
              onPrev={() => setDetailIndex(Math.max(0, curDetailIndex - 1))}
              onNext={() => setDetailIndex(Math.min(selCount - 1, curDetailIndex + 1))}
              onNavigate={(id) => { setDetailIndex(0); store.setSelectedRowIds([id]); }}
              effective={cpmDates.get(detailRow.row_id)
                ? { start: cpmDates.get(detailRow.row_id)!.start, end: cpmDates.get(detailRow.row_id)!.end }
                : undefined}
              onField={(field, value) => store.updateCell(detailRow.row_id, field, value)}
              onCustom={(key, value) => store.updateCustom(detailRow.row_id, key, value)}
              onClose={() => store.setSelectedRowIds([])}
            />
          </div>
        </div>
      )}

      {/* Status bar */}
      <footer className="flex shrink-0 items-center gap-4 border-t bg-muted px-4 py-1 text-xs text-muted-foreground">
        <span>{store.rows.length} строк</span>
        <span className="ml-auto">
          Двойной клик / Enter — редактировать · клик по задаче — детали снизу · Ctrl+D — протянуть значение по выделенным строкам
        </span>
      </footer>
    </div>
  );
}
