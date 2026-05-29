'use client';

import type { ScheduleRow } from '@plancore/core';
import type { CpmResult } from '@plancore/core';
import { COLUMNS, type ColId } from './columnDefs';
import { ScheduleCell } from './ScheduleCell';
import type { CellId } from './useScheduleStore';

interface ScheduleRowProps {
  row: ScheduleRow;
  cpmResult: CpmResult | undefined;
  selectedCell: CellId | null;
  editingCell: CellId | null;
  onSelect: (cellId: CellId) => void;
  onStartEdit: (cellId: CellId) => void;
  onCommit: (rowId: string, field: keyof ScheduleRow, value: unknown) => void;
  onCancel: () => void;
  onTab: (currentCol: ColId, shift: boolean) => void;
  onInsertAfter: () => void;
  onDelete: () => void;
}

function getCpmValue(colId: ColId, cpmResult: CpmResult | undefined): unknown {
  if (!cpmResult) return null;
  switch (colId) {
    case 'cpm_es': return cpmResult.early_start;
    case 'cpm_ef': return cpmResult.early_finish;
    case 'cpm_tf': return cpmResult.total_float;
    case 'cpm_critical': return cpmResult.is_critical;
    default: return null;
  }
}

export function ScheduleRowComponent({
  row,
  cpmResult,
  selectedCell,
  editingCell,
  onSelect,
  onStartEdit,
  onCommit,
  onCancel,
  onTab,
  onInsertAfter,
  onDelete,
}: ScheduleRowProps) {
  const isCritical = cpmResult?.is_critical ?? false;

  return (
    <tr className={`group border-b border-[var(--border)] ${isCritical ? 'bg-red-50/30' : ''}`}>
      {/* Row actions */}
      <td className="w-12 border-r border-[var(--border)] px-1 text-center">
        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onInsertAfter}
            title="Добавить строку"
            className="rounded p-0.5 text-xs text-[var(--muted)] hover:bg-gray-100 hover:text-blue-600"
          >+</button>
          <button
            onClick={onDelete}
            title="Удалить строку"
            className="rounded p-0.5 text-xs text-[var(--muted)] hover:bg-gray-100 hover:text-red-600"
          >×</button>
        </div>
      </td>

      {COLUMNS.map(col => {
        const cellId = `${row.row_id}:${col.id}`;
        const isCpmCol = col.id.startsWith('cpm_');
        const rawValue = isCpmCol
          ? getCpmValue(col.id, cpmResult)
          : row[col.id as keyof ScheduleRow];

        return (
          <ScheduleCell
            key={col.id}
            colDef={col}
            value={rawValue}
            isSelected={selectedCell === cellId}
            isEditing={editingCell === cellId}
            isCritical={isCritical && !isCpmCol}
            onSelect={() => onSelect(cellId)}
            onStartEdit={() => onStartEdit(cellId)}
            onCommit={val => { if (!isCpmCol) onCommit(row.row_id, col.id as keyof ScheduleRow, val); }}
            onCancel={onCancel}
            onTab={shift => onTab(col.id, shift)}
          />
        );
      })}
    </tr>
  );
}
