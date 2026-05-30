'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  parseExcelFile,
  importToSchedule,
  runCpm,
  buildGraph,
  layoutGraph,
  diagnoseGraph,
  DEFAULT_CALENDAR,
  type ScheduleRow,
} from '@plancore/core';
import { GraphCanvas } from './GraphCanvas';
import { DiagnosticsPanel } from './DiagnosticsPanel';

export function GraphView() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { layout, diagnostics, model, criticalCount, projectDuration } = useMemo(() => {
    const cpm = runCpm(rows, DEFAULT_CALENDAR);
    const model = buildGraph(rows, cpm);
    return {
      model,
      layout: layoutGraph(model),
      diagnostics: diagnoseGraph(rows),
      criticalCount: cpm.criticalPath.length,
      projectDuration: cpm.projectDuration,
    };
  }, [rows]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.arrayBuffer().then((buf) => {
      try {
        const { tasks, missingColumns } = parseExcelFile(buf);
        if (missingColumns.length > 0) {
          alert(`Отсутствуют колонки: ${missingColumns.join(', ')}`);
          return;
        }
        setRows(importToSchedule(tasks));
        setSelectedId(null);
      } catch {
        alert('Не удалось прочитать файл Excel.');
      }
    }).catch(() => alert('Ошибка чтения файла.'));
    e.target.value = '';
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-4 border-b border-[var(--border)] bg-white px-4 py-2">
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">← Главная</Link>
        <h1 className="text-sm font-semibold">Логический сетевой граф</h1>

        <div className="ml-auto flex items-center gap-6 text-sm">
          <div>
            <span className="text-[var(--muted)]">Длительность: </span>
            <span className="font-medium">{projectDuration} р.д.</span>
          </div>
          <div>
            <span className="text-[var(--muted)]">Крит. путь: </span>
            <span className="font-medium text-red-600">{criticalCount} задач</span>
          </div>
          {diagnostics.hasCycles && (
            <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">⚠ Циклы</span>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-gray-50"
          >
            Импорт Excel
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {model.nodes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-[var(--muted)]">
              <p className="text-sm">Граф пуст. Импортируйте график из Excel, чтобы увидеть сеть связей.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Импорт Excel
              </button>
            </div>
          ) : (
            <GraphCanvas layout={layout} selectedId={selectedId} onSelect={setSelectedId} />
          )}

          <Legend />
        </div>

        <DiagnosticsPanel diagnostics={diagnostics} nodes={model.nodes} onFocus={setSelectedId} />
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="absolute bottom-3 left-3 flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-white/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
      <div className="flex items-center gap-2"><span className="inline-block h-3 w-4 rounded border-2 border-red-500 bg-red-50" /> Критический путь</div>
      <div className="flex items-center gap-2"><span className="inline-block h-3 w-4 rounded border border-gray-300 bg-yellow-100" /> Веха</div>
      <div className="flex items-center gap-2"><span className="inline-block h-3 w-4 rounded border border-gray-300 bg-white" /> Обычная задача</div>
    </div>
  );
}
