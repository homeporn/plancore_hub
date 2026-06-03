'use client';

import { useCallback, useEffect } from 'react';
import type { ScheduleRow } from '@plancore/core';
import type { CpmOutput } from '@plancore/core';
import { COLUMNS, type ColId } from './columnDefs';
import { ScheduleRowComponent } from './ScheduleRow';
import type { CellId } from './useScheduleStore';

interface ScheduleTableProps {
  rows: ScheduleRow[];
  cpmOutput: CpmOutput;
  selectedCell: CellId | null;
  editingCell: CellId | null;
  onSelect: (cellId: CellId) => void;
  onStartEdit: (cellId: CellId) => void;
  onCommit: (rowId: string, field: keyof ScheduleRow, value: unknown) => void;
  onCancel: () => void;
  onInsertAfter: (rowId: string) => void;
  onDelete: (rowId: string) => void;
}

export function ScheduleTable({
  rows,
  cpmOutput,
  selectedCell,
  editingCell,
  onSelect,
  onStartEdit,
  onCommit,
  onCancel,
  onInsertAfter,
  onDelete,
}: ScheduleTableProps) {
  const handleTab = useCallback((currentRowId: string, currentCol: ColId, shift: boolean) => {
    const colIdx = COLUMNS.findIndex(c => c.id === currentCol);
    const rowIdx = rows.findIndex(r => r.row_id === currentRowId);

    let nextColIdx = shift ? colIdx - 1 : colIdx + 1;
    let nextRowIdx = rowIdx;

    if (nextColIdx < 0) { nextColIdx = COLUMNS.length - 1; nextRowIdx--; }
    if (nextColIdx >= COLUMNS.length) { nextColIdx = 0; nextRowIdx++; }
    if (nextRowIdx < 0 || nextRowIdx >= rows.length) return;

    const nextCell: CellId = `${rows[nextRowIdx].row_id}:${COLUMNS[nextColIdx].id}`;
    onSelect(nextCell);
  }, [rows, onSelect]);

  // Keyboard navigation when a cell is selected but not editing
  useEffect(() => {
    if (!selectedCell || editingCell) return;

    function handleKey(e: KeyboardEvent) {
      if (!selectedCell) return;
      const [rowId, colId] = selectedCell.split(':') as [string, ColId];
      const rowIdx = rows.findIndex(r => r.row_id === rowId);
      const colIdx = COLUMNS.findIndex(c => c.id === colId);

      switch (e.key) {
        case 'ArrowDown': {
          if (rowIdx < rows.length - 1) {
            onSelect(`${rows[rowIdx + 1].row_id}:${colId}` as CellId);
            e.preventDefault();
          }
          break;
        }
        case 'ArrowUp': {
          if (rowIdx > 0) {
            onSelect(`${rows[rowIdx - 1].row_id}:${colId}` as CellId);
            e.preventDefault();
          }
          break;
        }
        case 'ArrowRight': {
          if (colIdx < COLUMNS.length - 1) {
            onSelect(`${rowId}:${COLUMNS[colIdx + 1].id}` as CellId);
            e.preventDefault();
          }
          break;
        }
        case 'ArrowLeft': {
          if (colIdx > 0) {
            onSelect(`${rowId}:${COLUMNS[colIdx - 1].id}` as CellId);
            e.preventDefault();
          }
          break;
        }
        case 'Enter':
        case 'F2': {
          const col = COLUMNS[colIdx];
          if (col.editable) onStartEdit(selectedCell!);
          e.preventDefault();
          break;
        }
        case 'Delete':
        case 'Backspace': {
          const col = COLUMNS[colIdx];
          if (col.editable) onCommit(rowId, colId as keyof ScheduleRow, null);
          e.preventDefault();
          break;
        }
        case 'Tab': {
          handleTab(rowId, colId, e.shiftKey);
          e.preventDefault();
          break;
        }
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedCell, editingCell, rows, onSelect, onStartEdit, onCommit, handleTab]);

  const totalWidth = 48 + COLUMNS.reduce((acc, c) => acc + c.width, 0);

  return (
    <div className="overflow-auto">
      <table style={{ width: totalWidth, tableLayout: 'fixed', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: 48 }} />
          {COLUMNS.map(c => <col key={c.id} style={{ width: c.width }} />)}
        </colgroup>
        <thead className="sticky top-0 z-20 bg-gray-50">
          <tr className="border-b border-[var(--border)]">
            <th className="w-12 border-r border-[var(--border)] px-1" />
            {COLUMNS.map(c => (
              <th
                key={c.id}
                className="border-r border-[var(--border)] px-2 py-1.5 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap overflow-hidden"
                style={{ width: c.width }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <ScheduleRowComponent
              key={row.row_id}
              row={row}
              cpmResult={cpmOutput.results.get(row.row_id)}
              selectedCell={selectedCell}
              editingCell={editingCell}
              onSelect={onSelect}
              onStartEdit={onStartEdit}
              onCommit={onCommit}
              onCancel={onCancel}
              onTab={(col, shift) => handleTab(row.row_id, col, shift)}
              onInsertAfter={() => onInsertAfter(row.row_id)}
              onDelete={() => onDelete(row.row_id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
