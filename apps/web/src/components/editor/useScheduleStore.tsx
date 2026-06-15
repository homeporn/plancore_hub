'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  type ScheduleRow,
  runCpm,
  type CpmOutput,
  type WorkCalendar,
  DEFAULT_CALENDAR,
  sdrDepth,
  clampLevels,
  outlineNumbers,
  hasChildrenFlags,
  hiddenByCollapse,
} from '@plancore/core';

export interface RowMeta {
  level: number;
  hasChildren: boolean;
  collapsed: boolean;
}

function uuid(): string {
  return crypto.randomUUID();
}

function makeEmptyRow(index: number, milestone = false): ScheduleRow {
  return {
    row_id: uuid(),
    sdr: String(index + 1),
    name: '',
    row_type: milestone ? 'веха' : 'задача/разработка',
    stage: '',
    object: '',
    organization: '',
    department: '',
    responsible: '',
    predecessors: [],
    startDate: null,
    endDate: null,
    duration: milestone ? 0 : 1,
    percentComplete: 0,
    taskStatus: 'NOT_STARTED',
    actualStart: null,
    actualFinish: null,
    remainingDuration: null,
    work: null,
    actualWork: null,
    remainingWork: null,
    baselineStart: null,
    baselineFinish: null,
    normHours: null,
    handoffStatus: null,
    handoffToDepartment: '',
    volumeId: null,
    comment: '',
  };
}

/** Clone a row with a fresh id, dropping links that wouldn't make sense copied. */
function cloneRow(row: ScheduleRow): ScheduleRow {
  return { ...row, row_id: uuid(), predecessors: [] };
}

export type CellId = string; // `${rowId}:${colId}`

export function useScheduleStore(initialRows: ScheduleRow[] = []) {
  const [rows, setRowsRaw] = useState<ScheduleRow[]>(
    initialRows.length > 0 ? initialRows : [makeEmptyRow(0)]
  );
  const [calendar] = useState<WorkCalendar>(DEFAULT_CALENDAR);
  const [selectedCell, setSelectedCell] = useState<CellId | null>(null);
  const [editingCell, setEditingCell] = useState<CellId | null>(null);
  /** Row ids selected in the grid (for batch operations). */
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  /** Internal clipboard for copy/paste of whole rows. */
  const clipboard = useRef<ScheduleRow[]>([]);
  const [clipboardCount, setClipboardCount] = useState(0);
  /** WBS depth per row id (falls back to the SDR code's depth). */
  const [levels, setLevels] = useState<Record<string, number>>({});
  /** Collapsed group row ids (their descendants are hidden). */
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());

  const levelOf = useCallback(
    (r: ScheduleRow) => levels[r.row_id] ?? sdrDepth(r.sdr),
    [levels],
  );

  // Undo/redo history of the rows array.
  const past = useRef<ScheduleRow[][]>([]);
  const future = useRef<ScheduleRow[][]>([]);
  const [histVer, setHistVer] = useState(0);

  /** Apply a rows change and record the previous state for undo. */
  const mutate = useCallback((updater: (prev: ScheduleRow[]) => ScheduleRow[]) => {
    setRowsRaw((prev) => {
      past.current.push(prev);
      if (past.current.length > 100) past.current.shift();
      future.current = [];
      return updater(prev);
    });
    setHistVer((v) => v + 1);
  }, []);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    setRowsRaw((prev) => {
      future.current.push(prev);
      return past.current.pop()!;
    });
    setSelectedRowIds([]);
    setHistVer((v) => v + 1);
  }, []);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    setRowsRaw((prev) => {
      past.current.push(prev);
      return future.current.pop()!;
    });
    setSelectedRowIds([]);
    setHistVer((v) => v + 1);
  }, []);

  const { canUndo, canRedo } = useMemo(
    () => ({ canUndo: past.current.length > 0, canRedo: future.current.length > 0 }),
    // histVer drives recomputation when the stacks change.
    [histVer],
  );

  const cpmOutput = useMemo<CpmOutput>(() => runCpm(rows, calendar), [rows, calendar]);

  const updateCell = useCallback(<K extends keyof ScheduleRow>(
    rowId: string,
    field: K,
    value: ScheduleRow[K],
  ) => {
    mutate(prev =>
      prev.map(r => r.row_id === rowId ? { ...r, [field]: value } : r)
    );
  }, []);

  /** Set a single user-defined custom column value on a row. */
  /** Bulk-set one built-in field across many rows (Excel-like fill), one undo step. */
  const fillCell = useCallback((
    rowIds: string[],
    field: keyof ScheduleRow,
    value: unknown,
  ) => {
    if (rowIds.length === 0) return;
    const set = new Set(rowIds);
    mutate(prev => prev.map(r => set.has(r.row_id) ? { ...r, [field]: value } : r));
  }, []);

  /** Bulk-set one custom-column value across many rows, one undo step. */
  const fillCustom = useCallback((rowIds: string[], key: string, value: string) => {
    if (rowIds.length === 0) return;
    const set = new Set(rowIds);
    mutate(prev => prev.map(r =>
      set.has(r.row_id) ? { ...r, custom: { ...(r.custom ?? {}), [key]: value } } : r,
    ));
  }, []);

  const updateCustom = useCallback((rowId: string, key: string, value: string) => {
    mutate(prev =>
      prev.map(r =>
        r.row_id === rowId ? { ...r, custom: { ...(r.custom ?? {}), [key]: value } } : r,
      ),
    );
  }, []);

  /** Apply recalculated progress (percent + status) to rows by id. */
  const applyProgress = useCallback(
    (results: { rowId: string; percentComplete: number; taskStatus: ScheduleRow['taskStatus'] }[]) => {
      if (results.length === 0) return;
      const byId = new Map(results.map((r) => [r.rowId, r]));
      mutate((prev) =>
        prev.map((r) => {
          const res = byId.get(r.row_id);
          return res
            ? { ...r, percentComplete: res.percentComplete, taskStatus: res.taskStatus }
            : r;
        }),
      );
    },
    [],
  );

  /** Write computed (CPM-derived) start/finish dates into the rows so they
   *  persist on save. Overwrites existing planned dates. */
  const applyDates = useCallback((dates: Map<string, { start: Date; end: Date }>) => {
    mutate(prev =>
      prev.map(r => {
        const d = dates.get(r.row_id);
        return d ? { ...r, startDate: d.start, endDate: d.end } : r;
      }),
    );
  }, []);

  /** Insert a new task/milestone after a row (or at the end), and select it. */
  const addRowAfter = useCallback((afterId: string | null, milestone = false) => {
    mutate(prev => {
      const idx = afterId ? prev.findIndex(r => r.row_id === afterId) : prev.length - 1;
      const newRow = makeEmptyRow(idx + 1, milestone);
      const next = [...prev];
      next.splice(idx + 1, 0, newRow);
      setSelectedRowIds([newRow.row_id]);
      return next;
    });
  }, []);

  const deleteRow = useCallback((rowId: string) => {
    mutate(prev => prev.filter(r => r.row_id !== rowId));
  }, []);

  /** Delete every selected row, then clear the selection. */
  const deleteRows = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    mutate(prev => {
      const next = prev.filter(r => !set.has(r.row_id));
      return next.length > 0 ? next : [makeEmptyRow(0)];
    });
    setSelectedRowIds([]);
  }, []);

  /** Duplicate selected rows, inserting copies right after the last selected. */
  const duplicateRows = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    mutate(prev => {
      const copies = prev.filter(r => set.has(r.row_id)).map(cloneRow);
      if (copies.length === 0) return prev;
      const lastIdx = Math.max(...prev.map((r, i) => (set.has(r.row_id) ? i : -1)));
      const next = [...prev];
      next.splice(lastIdx + 1, 0, ...copies);
      setSelectedRowIds(copies.map(c => c.row_id));
      return next;
    });
  }, []);

  const moveRow = useCallback((fromId: string, toId: string) => {
    mutate(prev => {
      const from = prev.findIndex(r => r.row_id === fromId);
      const to = prev.findIndex(r => r.row_id === toId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  /** Move the selected block up by one position (keeps relative order). */
  const moveRowsUp = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    mutate(prev => {
      const next = [...prev];
      for (let i = 1; i < next.length; i++) {
        if (set.has(next[i].row_id) && !set.has(next[i - 1].row_id)) {
          [next[i - 1], next[i]] = [next[i], next[i - 1]];
        }
      }
      return next;
    });
  }, []);

  /** Move the selected block down by one position (keeps relative order). */
  const moveRowsDown = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    mutate(prev => {
      const next = [...prev];
      for (let i = next.length - 2; i >= 0; i--) {
        if (set.has(next[i].row_id) && !set.has(next[i + 1].row_id)) {
          [next[i + 1], next[i]] = [next[i], next[i + 1]];
        }
      }
      return next;
    });
  }, []);

  /** Copy selected rows into the internal clipboard (in grid order). */
  const copyRows = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    setRowsRaw(prev => {
      clipboard.current = prev.filter(r => set.has(r.row_id)).map(r => ({ ...r }));
      setClipboardCount(clipboard.current.length);
      return prev;
    });
  }, []);

  /** Paste clipboard rows (as fresh copies) after the selection, and select them. */
  const pasteRows = useCallback(() => {
    if (clipboard.current.length === 0) return;
    const copies = clipboard.current.map(cloneRow);
    mutate(prev => {
      const lastSel = selectedRowIds.length > 0
        ? Math.max(...prev.map((r, i) => (selectedRowIds.includes(r.row_id) ? i : -1)))
        : prev.length - 1;
      const next = [...prev];
      next.splice(lastSel + 1, 0, ...copies);
      return next;
    });
    setSelectedRowIds(copies.map(c => c.row_id));
  }, [selectedRowIds]);

  /** Re-indent the selected rows by `delta` levels and renumber the outline. */
  const shiftLevels = useCallback((ids: string[], delta: number) => {
    if (ids.length === 0) return;
    const sel = new Set(ids);
    const arr = rows.map((r) => levelOf(r));
    rows.forEach((r, i) => { if (sel.has(r.row_id)) arr[i] = arr[i] + delta; });
    const clamped = clampLevels(arr);
    const codes = outlineNumbers(clamped);
    mutate((prev) => prev.map((r, i) => (r.sdr === codes[i] ? r : { ...r, sdr: codes[i] })));
    const nl: Record<string, number> = {};
    rows.forEach((r, i) => { nl[r.row_id] = clamped[i]; });
    setLevels(nl);
  }, [rows, levelOf]);

  const indentRows = useCallback((ids: string[]) => shiftLevels(ids, +1), [shiftLevels]);
  const outdentRows = useCallback((ids: string[]) => shiftLevels(ids, -1), [shiftLevels]);

  /** Recompute SDR codes from the current order and levels (auto-numbering). */
  const renumber = useCallback(() => {
    const clamped = clampLevels(rows.map((r) => levelOf(r)));
    const codes = outlineNumbers(clamped);
    mutate((prev) => prev.map((r, i) => (r.sdr === codes[i] ? r : { ...r, sdr: codes[i] })));
    const nl: Record<string, number> = {};
    rows.forEach((r, i) => { nl[r.row_id] = clamped[i]; });
    setLevels(nl);
  }, [rows, levelOf]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Per-row outline metadata for rendering (indent, chevron, collapsed). */
  const rowMeta = useMemo(() => {
    const arr = rows.map((r) => levelOf(r));
    const kids = hasChildrenFlags(arr);
    const m = new Map<string, RowMeta>();
    rows.forEach((r, i) =>
      m.set(r.row_id, { level: arr[i], hasChildren: kids[i], collapsed: collapsedIds.has(r.row_id) }),
    );
    return m;
  }, [rows, levelOf, collapsedIds]);

  /** Rows visible after applying collapsed groups. */
  const visibleRows = useMemo(() => {
    if (collapsedIds.size === 0) return rows;
    const arr = rows.map((r) => levelOf(r));
    const collapsedIdx = new Set<number>();
    rows.forEach((r, i) => { if (collapsedIds.has(r.row_id)) collapsedIdx.add(i); });
    const hidden = hiddenByCollapse(arr, collapsedIdx);
    return rows.filter((_, i) => !hidden.has(i));
  }, [rows, levelOf, collapsedIds]);

  const loadRows = useCallback((newRows: ScheduleRow[]) => {
    setRowsRaw(newRows);
    past.current = [];
    future.current = [];
    setHistVer((v) => v + 1);
    setSelectedRowIds([]);
    setCollapsedIds(new Set());
    const nl: Record<string, number> = {};
    newRows.forEach((r) => { nl[r.row_id] = sdrDepth(r.sdr); });
    setLevels(nl);
  }, []);

  const appendRows = useCallback((extra: ScheduleRow[]) => {
    if (extra.length === 0) return;
    mutate(prev => [...prev, ...extra]);
  }, []);

  return {
    rows,
    cpmOutput,
    calendar,
    selectedCell,
    setSelectedCell,
    editingCell,
    setEditingCell,
    selectedRowIds,
    setSelectedRowIds,
    clipboardCount,
    copyRows,
    pasteRows,
    rowMeta,
    visibleRows,
    indentRows,
    outdentRows,
    renumber,
    toggleCollapse,
    undo,
    redo,
    canUndo,
    canRedo,
    updateCell,
    updateCustom,
    fillCell,
    fillCustom,
    applyProgress,
    applyDates,
    addRowAfter,
    deleteRow,
    deleteRows,
    duplicateRows,
    moveRow,
    moveRowsUp,
    moveRowsDown,
    loadRows,
    appendRows,
  };
}
