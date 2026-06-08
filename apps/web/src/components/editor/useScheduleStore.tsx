'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  type ScheduleRow,
  runCpm,
  type CpmOutput,
  type WorkCalendar,
  DEFAULT_CALENDAR,
} from '@plancore/core';

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
  const [rows, setRows] = useState<ScheduleRow[]>(
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

  const cpmOutput = useMemo<CpmOutput>(() => runCpm(rows, calendar), [rows, calendar]);

  const updateCell = useCallback(<K extends keyof ScheduleRow>(
    rowId: string,
    field: K,
    value: ScheduleRow[K],
  ) => {
    setRows(prev =>
      prev.map(r => r.row_id === rowId ? { ...r, [field]: value } : r)
    );
  }, []);

  /** Insert a new task/milestone after a row (or at the end), and select it. */
  const addRowAfter = useCallback((afterId: string | null, milestone = false) => {
    setRows(prev => {
      const idx = afterId ? prev.findIndex(r => r.row_id === afterId) : prev.length - 1;
      const newRow = makeEmptyRow(idx + 1, milestone);
      const next = [...prev];
      next.splice(idx + 1, 0, newRow);
      setSelectedRowIds([newRow.row_id]);
      return next;
    });
  }, []);

  const deleteRow = useCallback((rowId: string) => {
    setRows(prev => prev.filter(r => r.row_id !== rowId));
  }, []);

  /** Delete every selected row, then clear the selection. */
  const deleteRows = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    setRows(prev => {
      const next = prev.filter(r => !set.has(r.row_id));
      return next.length > 0 ? next : [makeEmptyRow(0)];
    });
    setSelectedRowIds([]);
  }, []);

  /** Duplicate selected rows, inserting copies right after the last selected. */
  const duplicateRows = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    setRows(prev => {
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
    setRows(prev => {
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
    setRows(prev => {
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
    setRows(prev => {
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
    setRows(prev => {
      clipboard.current = prev.filter(r => set.has(r.row_id)).map(r => ({ ...r }));
      setClipboardCount(clipboard.current.length);
      return prev;
    });
  }, []);

  /** Paste clipboard rows (as fresh copies) after the selection, and select them. */
  const pasteRows = useCallback(() => {
    if (clipboard.current.length === 0) return;
    const copies = clipboard.current.map(cloneRow);
    setRows(prev => {
      const lastSel = selectedRowIds.length > 0
        ? Math.max(...prev.map((r, i) => (selectedRowIds.includes(r.row_id) ? i : -1)))
        : prev.length - 1;
      const next = [...prev];
      next.splice(lastSel + 1, 0, ...copies);
      return next;
    });
    setSelectedRowIds(copies.map(c => c.row_id));
  }, [selectedRowIds]);

  const loadRows = useCallback((newRows: ScheduleRow[]) => {
    setRows(newRows);
    setSelectedRowIds([]);
  }, []);

  const appendRows = useCallback((extra: ScheduleRow[]) => {
    if (extra.length === 0) return;
    setRows(prev => [...prev, ...extra]);
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
    updateCell,
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
