'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  type ScheduleRow,
  type RowType,
  type TaskStatus,
  type PredecessorLink,
  runCpm,
  type CpmOutput,
  type WorkCalendar,
  DEFAULT_CALENDAR,
} from '@plancore/core';

function uuid(): string {
  return crypto.randomUUID();
}

function makeEmptyRow(index: number): ScheduleRow {
  return {
    row_id: uuid(),
    sdr: String(index + 1),
    name: '',
    row_type: 'задача/разработка',
    stage: '',
    object: '',
    organization: '',
    department: '',
    responsible: '',
    predecessors: [],
    startDate: null,
    endDate: null,
    duration: 1,
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
    comment: '',
  };
}

export type CellId = string; // `${rowId}:${colId}`

export function useScheduleStore(initialRows: ScheduleRow[] = []) {
  const [rows, setRows] = useState<ScheduleRow[]>(
    initialRows.length > 0 ? initialRows : [makeEmptyRow(0)]
  );
  const [calendar] = useState<WorkCalendar>(DEFAULT_CALENDAR);
  const [selectedCell, setSelectedCell] = useState<CellId | null>(null);
  const [editingCell, setEditingCell] = useState<CellId | null>(null);

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

  const addRowAfter = useCallback((afterId: string | null) => {
    setRows(prev => {
      const idx = afterId ? prev.findIndex(r => r.row_id === afterId) : prev.length - 1;
      const newRow = makeEmptyRow(idx + 1);
      const next = [...prev];
      next.splice(idx + 1, 0, newRow);
      return next;
    });
  }, []);

  const deleteRow = useCallback((rowId: string) => {
    setRows(prev => prev.filter(r => r.row_id !== rowId));
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

  const loadRows = useCallback((newRows: ScheduleRow[]) => {
    setRows(newRows);
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
    updateCell,
    addRowAfter,
    deleteRow,
    moveRow,
    loadRows,
    appendRows,
  };
}
