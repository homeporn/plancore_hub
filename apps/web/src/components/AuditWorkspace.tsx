'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  parseExcelFile,
  runAudit,
  type AuditResult,
  type TaskRow,
} from '@plancore/core';
import { FileDropzone } from './FileDropzone';
import { AuditSummary } from './AuditSummary';
import { AuditTable } from './AuditTable';

interface LoadedAudit {
  fileName: string;
  result: AuditResult;
  tasks: TaskRow[];
}

export function AuditWorkspace() {
  const [audit, setAudit] = useState<LoadedAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback((buffer: ArrayBuffer, fileName: string) => {
    setLoading(true);
    setError(null);
    try {
      const { tasks, missingColumns } = parseExcelFile(buffer);
      if (missingColumns.length > 0) {
        setError(`Отсутствуют обязательные колонки: ${missingColumns.join(', ')}`);
        return;
      }
      if (tasks.length === 0) {
        setError('В файле не найдено ни одной задачи.');
        return;
      }
      const result = runAudit(tasks);
      setAudit({ fileName, result, tasks });
    } catch (e) {
      console.error('Parse/audit error:', e);
      setError('Не удалось обработать файл. Проверьте формат.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAudit(null);
    setError(null);
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
          ← На главную
        </Link>
        {audit && (
          <button
            onClick={reset}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Загрузить другой файл
          </button>
        )}
      </header>

      {!audit ? (
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">Аудит графика</h1>
          <FileDropzone onFile={handleFile} disabled={loading} />
          {loading && (
            <p className="text-sm text-[var(--muted)]">Обработка файла…</p>
          )}
          {error && (
            <p className="rounded-lg border border-[var(--critical)] bg-red-50 px-4 py-3 text-sm text-[var(--critical)]">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-semibold">Результаты аудита</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Файл: {audit.fileName}
            </p>
          </div>
          <AuditSummary result={audit.result} />
          <AuditTable result={audit.result} />
        </div>
      )}
    </main>
  );
}
