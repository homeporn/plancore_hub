'use client';

import { useRef, useEffect, useState } from 'react';
import type { ColumnDef } from './columnDefs';
import { STATUS_LABELS } from './columnDefs';

interface ScheduleCellProps {
  colDef: ColumnDef;
  value: unknown;
  isSelected: boolean;
  isEditing: boolean;
  isCritical?: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onCommit: (value: unknown) => void;
  onCancel: () => void;
  onTab: (shift: boolean) => void;
}

function formatValue(colDef: ColumnDef, value: unknown): string {
  if (value === null || value === undefined) return '';
  if (colDef.id === 'taskStatus') return STATUS_LABELS[String(value)] ?? String(value);
  if (colDef.type === 'date' && value instanceof Date) {
    return value.toLocaleDateString('ru-RU');
  }
  if (colDef.id === 'cpm_critical') return value ? '●' : '';
  return String(value);
}

function parseInput(colDef: ColumnDef, raw: string): unknown {
  if (raw === '') return null;
  if (colDef.type === 'number') {
    const n = parseFloat(raw);
    return isNaN(n) ? null : n;
  }
  if (colDef.type === 'date') {
    // Accept ISO (YYYY-MM-DD) or DD.MM.YYYY
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return new Date(raw);
    const dmy = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (dmy) return new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}`);
    return null;
  }
  return raw;
}

export function ScheduleCell({
  colDef,
  value,
  isSelected,
  isEditing,
  isCritical,
  onSelect,
  onStartEdit,
  onCommit,
  onCancel,
  onTab,
}: ScheduleCellProps) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (isEditing && inputRef.current) {
      const raw = value instanceof Date
        ? value.toISOString().slice(0, 10)
        : value === null || value === undefined ? '' : String(value);
      setDraft(raw);
      inputRef.current.focus();
      if ('select' in inputRef.current) {
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [isEditing, value]);

  const display = formatValue(colDef, value);

  const cellClass = [
    'relative h-8 min-w-0 border-r border-[var(--border)] px-2 text-sm flex items-center overflow-hidden',
    isSelected ? 'bg-blue-50 outline outline-2 outline-blue-400 z-10' : 'hover:bg-gray-50',
    isCritical ? 'bg-red-50' : '',
    colDef.id === 'cpm_critical' ? 'justify-center text-red-500 font-bold' : '',
    colDef.type === 'readonly' ? 'text-[var(--muted)]' : '',
  ].filter(Boolean).join(' ');

  if (isEditing && colDef.editable) {
    if (colDef.type === 'select') {
      return (
        <td className={cellClass} style={{ width: colDef.width, minWidth: colDef.width }}>
          <select
            ref={inputRef as React.Ref<HTMLSelectElement>}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => onCommit(draft)}
            onKeyDown={e => {
              if (e.key === 'Enter') { onCommit(draft); e.preventDefault(); }
              if (e.key === 'Escape') { onCancel(); e.preventDefault(); }
              if (e.key === 'Tab') { onCommit(draft); onTab(e.shiftKey); e.preventDefault(); }
            }}
            className="w-full bg-transparent outline-none text-sm"
          >
            {colDef.options?.map(o => (
              <option key={o} value={o}>{colDef.id === 'taskStatus' ? (STATUS_LABELS[o] ?? o) : o}</option>
            ))}
          </select>
        </td>
      );
    }

    return (
      <td className={cellClass} style={{ width: colDef.width, minWidth: colDef.width }}>
        <input
          ref={inputRef as React.Ref<HTMLInputElement>}
          type={colDef.type === 'date' ? 'date' : 'text'}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => onCommit(parseInput(colDef, draft))}
          onKeyDown={e => {
            if (e.key === 'Enter') { onCommit(parseInput(colDef, draft)); e.preventDefault(); }
            if (e.key === 'Escape') { onCancel(); e.preventDefault(); }
            if (e.key === 'Tab') { onCommit(parseInput(colDef, draft)); onTab(e.shiftKey); e.preventDefault(); }
          }}
          className="w-full bg-transparent outline-none text-sm"
        />
      </td>
    );
  }

  return (
    <td
      className={cellClass}
      style={{ width: colDef.width, minWidth: colDef.width }}
      onClick={onSelect}
      onDoubleClick={() => { if (colDef.editable) onStartEdit(); }}
    >
      <span className="truncate">{display}</span>
    </td>
  );
}
