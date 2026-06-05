'use client';

import { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  type ColDef,
  type CellValueChangedEvent,
  type ValueGetterParams,
  type RowClassParams,
} from 'ag-grid-community';
import type { ScheduleRow, CpmOutput, CpmResult, HandoffStatus } from '@plancore/core';
import { HANDOFF_STATUS_LABELS } from '@plancore/core';
import { COLUMNS, STATUS_LABELS, type ColumnDef } from './columnDefs';

// Tailwind text colour per handoff exchange state (stuck = amber/red).
const HANDOFF_CELL_CLASS: Record<HandoffStatus, string> = {
  issued: 'text-blue-600',
  received: 'text-amber-600',
  accepted: 'text-green-700',
  rejected: 'text-red-600',
  reworking: 'text-amber-700',
};

// AG Grid v33: register the Community feature modules once.
ModuleRegistry.registerModules([AllCommunityModule]);

// Match the app's light design tokens.
const theme = themeQuartz.withParams({
  accentColor: '#0a0a0a',
  borderColor: '#e5e7eb',
  headerBackgroundColor: '#f9fafb',
  fontSize: 13,
  headerFontSize: 12,
  rowHeight: 32,
  headerHeight: 34,
});

interface ScheduleGridProps {
  rows: ScheduleRow[];
  cpmOutput: CpmOutput;
  /** Commit a single edited field back to the store. */
  onCommit: (rowId: string, field: keyof ScheduleRow, value: unknown) => void;
}

function toDateString(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : '';
}

/** Build an AG Grid column from our shared ColumnDef. */
function toColDef(
  col: ColumnDef,
  cpm: CpmOutput,
): ColDef<ScheduleRow> {
  const base: ColDef<ScheduleRow> = {
    headerName: col.label,
    width: col.width,
    editable: col.editable,
    resizable: true,
    sortable: false,
  };

  // CPM read-only columns derive their value from the CPM output.
  if (col.id.startsWith('cpm_')) {
    return {
      ...base,
      colId: col.id,
      valueGetter: (p: ValueGetterParams<ScheduleRow>) => {
        if (!p.data) return '';
        const r: CpmResult | undefined = cpm.results.get(p.data.row_id);
        if (!r) return '';
        switch (col.id) {
          case 'cpm_es': return r.early_start;
          case 'cpm_ef': return r.early_finish;
          case 'cpm_tf': return r.total_float;
          case 'cpm_critical': return r.is_critical ? '✓' : '';
          default: return '';
        }
      },
      cellClass: col.id === 'cpm_critical' ? 'text-center font-medium text-red-600' : 'text-[var(--muted)]',
    };
  }

  const field = col.id as keyof ScheduleRow;

  // Handoff exchange state: localized label + colour by state.
  if (col.id === 'handoffStatus') {
    return {
      ...base,
      field,
      valueFormatter: (p) =>
        p.value ? HANDOFF_STATUS_LABELS[p.value as HandoffStatus] : '',
      cellClass: (p) =>
        p.value ? `font-medium ${HANDOFF_CELL_CLASS[p.value as HandoffStatus]}` : '',
    };
  }

  if (col.type === 'date') {
    return {
      ...base,
      field,
      valueGetter: (p) => toDateString((p.data?.[field] as Date | null) ?? null),
      valueParser: (p) => (p.newValue ? new Date(p.newValue) : null),
    };
  }

  if (col.type === 'number') {
    return {
      ...base,
      field,
      cellEditor: 'agNumberCellEditor',
      valueParser: (p) => (p.newValue === '' || p.newValue == null ? null : Number(p.newValue)),
    };
  }

  if (col.type === 'select') {
    return {
      ...base,
      field,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: col.options ?? [] },
      valueFormatter:
        col.id === 'taskStatus'
          ? (p) => STATUS_LABELS[p.value as string] ?? (p.value as string) ?? ''
          : undefined,
    };
  }

  return { ...base, field };
}

export function ScheduleGrid({ rows, cpmOutput, onCommit }: ScheduleGridProps) {
  const columnDefs = useMemo<ColDef<ScheduleRow>[]>(
    () => COLUMNS.map((c) => toColDef(c, cpmOutput)),
    [cpmOutput],
  );

  const defaultColDef = useMemo<ColDef<ScheduleRow>>(
    () => ({ suppressMovable: true, singleClickEdit: false }),
    [],
  );

  const onCellValueChanged = useCallback(
    (e: CellValueChangedEvent<ScheduleRow>) => {
      const field = e.colDef.field as keyof ScheduleRow | undefined;
      if (!field || !e.data) return;
      onCommit(e.data.row_id, field, e.newValue);
    },
    [onCommit],
  );

  // Highlight critical-path rows.
  const getRowClass = useCallback(
    (p: RowClassParams<ScheduleRow>) => {
      if (!p.data) return undefined;
      return cpmOutput.results.get(p.data.row_id)?.is_critical ? 'bg-red-50' : undefined;
    },
    [cpmOutput],
  );

  return (
    <div className="h-full w-full">
      <AgGridReact<ScheduleRow>
        theme={theme}
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={(p) => p.data.row_id}
        onCellValueChanged={onCellValueChanged}
        getRowClass={getRowClass}
        stopEditingWhenCellsLoseFocus
        animateRows={false}
      />
    </div>
  );
}
