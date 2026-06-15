'use client';

import { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { useEffect, useRef } from 'react';
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  colorSchemeDark,
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
import type { CustomColumn } from '@plancore/data';
import type { ScheduleRow, CpmOutput, CpmResult, HandoffStatus } from '@plancore/core';
import {
  HANDOFF_STATUS_LABELS,
  formatPredecessors,
  parsePredecessors,
} from '@plancore/core';
import { COLUMNS, STATUS_LABELS, type ColumnDef } from './columnDefs';
import type { RowMeta } from './useScheduleStore';
import type { Density } from './useEditorView';

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

const ROW_HEIGHTS: Record<Density, number> = { compact: 26, normal: 32, comfortable: 42 };

/** Build the AG Grid theme from the view preferences (density + light/dark). */
function buildTheme(density: Density, dark: boolean) {
  const base = dark ? themeQuartz.withPart(colorSchemeDark) : themeQuartz;
  return base.withParams({
    accentColor: '#4f46e5',
    fontSize: 13,
    headerFontSize: 12,
    rowHeight: ROW_HEIGHTS[density],
    headerHeight: ROW_HEIGHTS[density] + 2,
    // Let our per-level row classes own the row background (no zebra striping
    // painting over the custom colours from the View settings).
    oddRowBackgroundColor: 'transparent',
  });
}

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
  /** Visible column ids (column manager). Defaults to all columns. */
  visibleColIds?: string[];
  /** Row density. */
  density?: Density;
  /** Grid colour scheme. */
  gridTheme?: 'light' | 'dark';
  /** User-defined custom columns (appended after the built-in ones). */
  customColumns?: CustomColumn[];
  /** Commit a custom column value edit. */
  onCustomCommit?: (rowId: string, key: string, value: string) => void;
  /** Worst audit severity per row id, for inline highlighting. */
  rowIssues?: Map<string, 'critical' | 'warning' | 'info'>;
  /** CPM-derived planned dates per row id (fallback when no explicit date). */
  cpmDates?: Map<string, { start: Date; end: Date }>;
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

/** Format a date as dd.mm.yy (Russian short form). */
function formatRuDate(value: Date | null): string {
  if (!value) return '';
  const d = String(value.getDate()).padStart(2, '0');
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const y = String(value.getFullYear()).slice(-2);
  return `${d}.${m}.${y}`;
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
      // Native date editor: type a value or pick from the calendar.
      cellEditor: 'agDateCellEditor',
      cellEditorParams: { min: '2000-01-01', max: '2100-12-31' },
      valueFormatter: (p) => formatRuDate((p.value as Date | null) ?? null),
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
  visibleColIds,
  density = 'normal',
  gridTheme = 'light',
  customColumns,
  onCustomCommit,
  rowIssues,
  cpmDates,
}: ScheduleGridProps) {
  const apiRef = useRef<GridApi<ScheduleRow> | null>(null);

  const theme = useMemo(() => buildTheme(density, gridTheme === 'dark'), [density, gridTheme]);
  const visibleSet = useMemo(
    () => (visibleColIds ? new Set(visibleColIds) : null),
    [visibleColIds],
  );

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
    () => {
      const builtins = COLUMNS.filter((c) => !visibleSet || c.locked || visibleSet.has(c.id as string)).map((c) => {
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
        } else if (c.id === 'startDate' || c.id === 'endDate') {
          const isStart = c.id === 'startDate';
          def = {
            ...toColDef(c, cpmOutput),
            // Value is the explicit Date (editable via the date picker); when
            // empty, display the CPM-derived date as a fallback.
            valueFormatter: (p) => {
              const explicit = (p.value as Date | null) ?? null;
              if (explicit) return formatRuDate(explicit);
              const d = p.data ? cpmDates?.get(p.data.row_id) : undefined;
              return formatRuDate(d ? (isStart ? d.start : d.end) : null);
            },
          };
        } else {
          def = toColDef(c, cpmOutput);
        }
        return readOnly ? { ...def, editable: false } : def;
      });

      // User-defined custom columns (string-valued, stored in row.custom).
      const customDefs: ColDef<ScheduleRow>[] = (customColumns ?? []).map((cc) => ({
        headerName: cc.label,
        width: 140,
        editable: !readOnly,
        resizable: true,
        sortable: false,
        colId: `custom:${cc.key}`,
        valueGetter: (p) => p.data?.custom?.[cc.key] ?? '',
      }));

      return [...builtins, ...customDefs];
    },
    [cpmOutput, readOnly, idToSdr, sdrToId, rowMeta, onToggleCollapse, visibleSet, customColumns, cpmDates],
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
      const colId = e.colDef.colId;
      // Custom columns are stored in the row's `custom` bag.
      if (colId?.startsWith('custom:')) {
        onCustomCommit?.(e.data.row_id, colId.slice('custom:'.length), String(e.newValue ?? ''));
        return;
      }
      // The predecessors column is computed (colId, no field); map it explicitly.
      const field =
        colId === 'predecessors'
          ? ('predecessors' as keyof ScheduleRow)
          : (e.colDef.field as keyof ScheduleRow | undefined);
      if (!field) return;
      onCommit(e.data.row_id, field, e.newValue);
    },
    [onCommit, onCustomCommit],
  );

  // Colour rows by WBS nesting level; audit issues take precedence. Styles
  // live in globals.css (.plc-*); selected row is always gray (CSS).
  const getRowClass = useCallback(
    (p: RowClassParams<ScheduleRow>) => {
      if (!p.data) return undefined;
      const issue = rowIssues?.get(p.data.row_id);
      if (issue === 'critical') return 'plc-critical';
      if (issue === 'warning') return 'plc-warning';
      const meta = rowMeta?.get(p.data.row_id);
      if (meta?.hasChildren) return `plc-lvl-${Math.min(meta.level, 3)}`;
      return 'plc-leaf';
    },
    [rowMeta, rowIssues],
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
