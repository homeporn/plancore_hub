'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  parseExcelFile,
  importToSchedule,
  runAudit,
  scheduleToAuditTasks,
  type AuditResult,
  type ScheduleRow,
} from '@plancore/core';
import { useAuth } from '@/lib/useAuth';
import { FileDropzone } from './FileDropzone';
import { AuditSummary } from './AuditSummary';
import { AuditTable } from './AuditTable';
import { AuthScreen } from './AuthScreen';
import { ProjectPicker } from './ProjectPicker';
import { AutofixPanel } from './audit/AutofixPanel';

interface LoadedAudit {
  source: string;
  result: AuditResult;
  /** Canonical rows behind this audit, enabling auto-correction. */
  rows: ScheduleRow[];
}

export function AuditWorkspace() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [audit, setAudit] = useState<LoadedAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = useCallback((buffer: ArrayBuffer, fileName: string) => {
    setBusy(true);
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
      setAudit({ source: fileName, result: runAudit(tasks), rows: importToSchedule(tasks) });
    } catch (e) {
      console.error('Parse/audit error:', e);
      setError('Не удалось обработать файл. Проверьте формат.');
    } finally {
      setBusy(false);
    }
  }, []);

  const handleSchedule = useCallback(
    (projectName: string, rows: ScheduleRow[]) => {
      setError(null);
      setAudit({
        source: projectName,
        result: runAudit(scheduleToAuditTasks(rows)),
        rows,
      });
    },
    [],
  );

  // Re-audit after auto-correction so findings and the fix list stay in sync.
  const handleAutofix = useCallback((rows: ScheduleRow[]) => {
    setAudit((prev) =>
      prev
        ? { ...prev, rows, result: runAudit(scheduleToAuditTasks(rows)) }
        : prev,
    );
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
        <div className="flex items-center gap-3 text-sm">
          {user && (
            <>
              <span className="text-[var(--muted)]">{user.email}</span>
              <button
                onClick={() => void signOut()}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 hover:bg-gray-50"
              >
                Выйти
              </button>
            </>
          )}
          {audit && (
            <button
              onClick={reset}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 hover:bg-gray-50"
            >
              Назад
            </button>
          )}
        </div>
      </header>

      {audit ? (
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-semibold">Результаты аудита</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Источник: {audit.source}
            </p>
          </div>
          <AuditSummary result={audit.result} />
          <AutofixPanel rows={audit.rows} onApply={handleAutofix} />
          <AuditTable result={audit.result} />
        </div>
      ) : (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Аудит графика</h1>

          {!authLoading && user && (
            <ProjectPicker userId={user.id} onOpenSchedule={handleSchedule} />
          )}

          {!authLoading && !user && (
            <details className="rounded-lg border border-[var(--border)] p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Войти, чтобы открывать сохранённые проекты
              </summary>
              <AuthScreen />
            </details>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Загрузить график из Excel</h3>
            <FileDropzone onFile={handleFile} disabled={busy} />
            {busy && (
              <p className="text-sm text-[var(--muted)]">Обработка файла…</p>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-[var(--critical)] bg-red-50 px-4 py-3 text-sm text-[var(--critical)]">
              {error}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
