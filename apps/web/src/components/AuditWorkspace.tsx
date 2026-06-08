'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import {
  parseExcelFile,
  importToSchedule,
  runAudit,
  scheduleToAuditTasks,
  type AuditResult,
  type ScheduleRow,
} from '@plancore/core';
import { Button } from '@/components/ui/button';
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
  const { user, loading: authLoading } = useAuth();
  const [audit, setAudit] = useState<LoadedAudit | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = useCallback((buffer: ArrayBuffer, fileName: string) => {
    setBusy(true);
    try {
      const { tasks, missingColumns } = parseExcelFile(buffer);
      if (missingColumns.length > 0) {
        toast.error('Не хватает обязательных колонок', { description: missingColumns.join(', ') });
        return;
      }
      if (tasks.length === 0) {
        toast.error('В файле не найдено ни одной задачи');
        return;
      }
      setAudit({ source: fileName, result: runAudit(tasks), rows: importToSchedule(tasks) });
    } catch (e) {
      console.error('Parse/audit error:', e);
      toast.error('Не удалось обработать файл', { description: 'Проверьте формат' });
    } finally {
      setBusy(false);
    }
  }, []);

  const handleSchedule = useCallback((projectName: string, rows: ScheduleRow[]) => {
    setAudit({
      source: projectName,
      result: runAudit(scheduleToAuditTasks(rows)),
      rows,
    });
  }, []);

  // Re-audit after auto-correction so findings and the fix list stay in sync.
  const handleAutofix = useCallback((rows: ScheduleRow[]) => {
    setAudit((prev) =>
      prev ? { ...prev, rows, result: runAudit(scheduleToAuditTasks(rows)) } : prev,
    );
    toast.success('Исправления применены');
  }, []);

  if (audit) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Результаты аудита</h1>
            <p className="mt-1 text-sm text-muted-foreground">Источник: {audit.source}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAudit(null)}>
            <ArrowLeft className="h-4 w-4" /> Назад
          </Button>
        </div>
        <AuditSummary result={audit.result} />
        <AutofixPanel rows={audit.rows} onApply={handleAutofix} />
        <AuditTable result={audit.result} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Аудит графика</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Проверьте качество КСГ: логику связей, структуру СДР, даты и статусы.
        </p>
      </div>

      {!authLoading && user && <ProjectPicker userId={user.id} onOpenSchedule={handleSchedule} />}

      {!authLoading && !user && (
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Войти, чтобы открывать сохранённые проекты
          </summary>
          <div className="mt-4">
            <AuthScreen />
          </div>
        </details>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Загрузить график из Excel</h2>
        <FileDropzone onFile={handleFile} disabled={busy} />
        {busy && <p className="text-sm text-muted-foreground">Обработка файла…</p>}
      </div>
    </div>
  );
}
