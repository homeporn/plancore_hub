'use client';

import Link from 'next/link';
import { useCallback, useRef } from 'react';
import { parseExcelFile, importToSchedule, type ScheduleRow } from '@plancore/core';
import { useScheduleStore } from './useScheduleStore';
import { ScheduleTable } from './ScheduleTable';
import { CpmSummary } from './CpmSummary';

export function ScheduleEditor() {
  const store = useScheduleStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.arrayBuffer().then(buf => {
      try {
        const { tasks, missingColumns } = parseExcelFile(buf);
        if (missingColumns.length > 0) {
          alert(`Отсутствуют колонки: ${missingColumns.join(', ')}`);
          return;
        }
        const rows = importToSchedule(tasks);
        store.loadRows(rows);
      } catch {
        alert('Не удалось прочитать файл Excel.');
      }
    }).catch(() => alert('Ошибка чтения файла.'));
    e.target.value = '';
  }, [store]);

  const handleCommit = useCallback((rowId: string, field: keyof ScheduleRow, value: unknown) => {
    store.updateCell(rowId, field, value as ScheduleRow[typeof field]);
  }, [store]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Toolbar */}
      <header className="flex shrink-0 items-center gap-4 border-b border-[var(--border)] bg-white px-4 py-2">
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">← Главная</Link>
        <h1 className="text-sm font-semibold">Конструктор графика</h1>

        <div className="flex items-center gap-2 ml-auto">
          <CpmSummary cpmOutput={store.cpmOutput} />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-gray-50"
          >
            Импорт Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFile}
          />

          <button
            onClick={() => store.addRowAfter(store.rows[store.rows.length - 1]?.row_id ?? null)}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-gray-50"
          >
            + Строка
          </button>
        </div>
      </header>

      {/* Table */}
      <div
        className="flex-1 overflow-auto"
        onKeyDown={e => {
          // Prevent page scroll on arrow keys when table focused
          if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) && store.selectedCell) {
            e.preventDefault();
          }
        }}
      >
        <ScheduleTable
          rows={store.rows}
          cpmOutput={store.cpmOutput}
          selectedCell={store.selectedCell}
          editingCell={store.editingCell}
          onSelect={store.setSelectedCell}
          onStartEdit={store.setEditingCell}
          onCommit={handleCommit}
          onCancel={() => store.setEditingCell(null)}
          onInsertAfter={store.addRowAfter}
          onDelete={store.deleteRow}
        />
      </div>

      {/* Status bar */}
      <footer className="flex shrink-0 items-center gap-4 border-t border-[var(--border)] bg-gray-50 px-4 py-1 text-xs text-[var(--muted)]">
        <span>{store.rows.length} строк</span>
        {store.selectedCell && (
          <span>Выбрано: {store.selectedCell}</span>
        )}
        <span className="ml-auto">Enter/F2 — редактировать · Esc — отмена · Tab — следующая ячейка · Del — очистить</span>
      </footer>
    </div>
  );
}
