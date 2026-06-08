'use client';

import { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { useEffect, useRef } from 'react';
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  type ColDef,
  type CellValueChangedEvent,
  type ValueGetterParams,
  type RowClassParams,
  type GridApi,
  type GridReadyEvent,
  type SelectionChangedEvent,
  type RowSelectionOptions,
} from 'ag-grid-community';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { ICellRendererParams } from 'ag-grid-community';
import type { ScheduleRow, CpmOutput, CpmResult, HandoffStatus } from '@plancore/core';
import {
  HANDOFF_STATUS_LABELS,
  formatPredecessors,
  parsePredecessors,
} from '@plancore/core';
import { COLUMNS, STATUS_LABELS, type ColumnDef } from './columnDefs';
import type { RowMeta } from './useScheduleStore';

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
  /** When true, disable all cell editing (e.g. an approved version). */
  readOnly?: boolean;
  /** Selected row ids (controlled by the store). */
  selectedRowIds?: string[];
  /** Fires when the grid's row selection changes. */
  onSelectionChange?: (ids: string[]) => void;
  /** Outline metadata per row id (indent / chevron / collapsed). */
  rowMeta?: Map<string, RowMeta>;
  /** Toggle collapse for a group row. */
  onToggleCollapse?: (id: string) => void;
}

/** Name cell: WBS indentation + collapse chevron for group rows. */
function NameCell(
  params: ICellRendererParams<ScheduleRow> & {
    rowMeta?: Map<string, RowMeta>;
    onToggleCollapse?: (id: string) => void;
  },
) {
  const id = params.data?.row_id;
  const meta = id ? params.rowMeta?.get(id) : undefined;
  const level = meta?.level ?? 0;
  return (
    <span className="flex items-center" style={{ paddingLeft: level * 16 }}>
      {meta?.hasChildren ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (id) params.onToggleCollapse?.(id); }}
          className="mr-1 inline-flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {meta.collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      ) : (
        <span className="mr-1 inline-block w-4" />
      )}
      <span className={meta?.hasChildren ? 'font-medium' : undefined}>{params.value}</span>
    </span>
  );
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

const rowSelection: RowSelectionOptions = {
  mode: 'multiRow',
  checkboxes: true,
  headerCheckbox: true,
  enableClickSelection: false,
};

export function ScheduleGrid({
  rows,
  cpmOutput,
  onCommit,
  readOnly = false,
  selectedRowIds,
  onSelectionChange,
  rowMeta,
  onToggleCollapse,
}: ScheduleGridProps) {
  const apiRef = useRef<GridApi<ScheduleRow> | null>(null);

  // SDR ⇄ row-id maps for rendering/parsing the predecessors column.
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

  const columnDefs = useMemo<ColDef<ScheduleRow>[]>(
    () => COLUMNS.map((c) => {
      let def: ColDef<ScheduleRow>;
      if (c.id === 'name') {
        def = {
          ...toColDef(c, cpmOutput),
          cellRenderer: NameCell,
          cellRendererParams: { rowMeta, onToggleCollapse },
        };
      } else if (c.id === 'predecessors') {
        def = {
          headerName: c.label,
          width: c.width,
          editable: c.editable,
          resizable: true,
          sortable: false,
          colId: 'predecessors',
          valueGetter: (p) =>
            p.data ? formatPredecessors(p.data.predecessors, idToSdr) : '',
          valueParser: (p) =>
            parsePredecessors(String(p.newValue ?? ''), sdrToId, p.data?.row_id),
        };
      } else {
        def = toColDef(c, cpmOutput);
      }
      return readOnly ? { ...def, editable: false } : def;
    }),
    [cpmOutput, readOnly, idToSdr, sdrToId, rowMeta, onToggleCollapse],
  );

  const defaultColDef = useMemo<ColDef<ScheduleRow>>(
    () => ({ suppressMovable: true, singleClickEdit: false }),
    [],
  );

  const onGridReady = useCallback((e: GridReadyEvent<ScheduleRow>) => {
    apiRef.current = e.api;
  }, []);

  // Reflect the store's selection into the grid (e.g. after add/duplicate)
  // without echoing it straight back as a user change.
  useEffect(() => {
    const api = apiRef.current;
    if (!api || !selectedRowIds) return;
    const want = new Set(selectedRowIds);
    const current = new Set(api.getSelectedRows().map((r) => r.row_id));
    if (want.size === current.size && [...want].every((id) => current.has(id))) return;
    api.deselectAll();
    selectedRowIds.forEach((id) => {
      const node = api.getRowNode(id);
      node?.setSelected(true);
    });
  }, [selectedRowIds, rows]);

  const onSelectionChanged = useCallback(
    (e: SelectionChangedEvent<ScheduleRow>) => {
      onSelectionChange?.(e.api.getSelectedRows().map((r) => r.row_id));
    },
    [onSelectionChange],
  );

  const onCellValueChanged = useCallback(
    (e: CellValueChangedEvent<ScheduleRow>) => {
      if (!e.data) return;
      // The predecessors column is computed (colId, no field); map it explicitly.
      const field =
        e.colDef.colId === 'predecessors'
          ? ('predecessors' as keyof ScheduleRow)
          : (e.colDef.field as keyof ScheduleRow | undefined);
      if (!field) return;
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
        rowSelection={rowSelection}
        onGridReady={onGridReady}
        onSelectionChanged={onSelectionChanged}
        onCellValueChanged={onCellValueChanged}
        getRowClass={getRowClass}
        stopEditingWhenCellsLoseFocus
        animateRows={false}
      />
    </div>
  );
}
