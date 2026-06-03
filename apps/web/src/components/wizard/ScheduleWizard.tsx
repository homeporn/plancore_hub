'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildScheduleFromTemplate,
  runCpm,
  DEFAULT_CALENDAR,
  type ScaffoldInput,
  type ScheduleRow,
} from '@plancore/core';
import { listTemplateObjectTypes, loadScaffoldInput } from '@plancore/data';
import { getBrowserClient } from '@/lib/supabase/browser';

type Step = 'object' | 'params' | 'preview';

interface ScheduleWizardProps {
  /** Called with the generated rows when the user confirms. */
  onCreate: (rows: ScheduleRow[]) => void;
}

/**
 * Step-by-step schedule creation: pick an object type, set parameters, preview
 * the generated rows, then hand them off (e.g. into the editor).
 */
export function ScheduleWizard({ onCreate }: ScheduleWizardProps) {
  const [step, setStep] = useState<Step>('object');
  const [objectTypes, setObjectTypes] = useState<string[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [objectType, setObjectType] = useState<string>('');
  const [objectName, setObjectName] = useState('');
  const [organization, setOrganization] = useState('');
  const [defaultDuration, setDefaultDuration] = useState(5);

  const [input, setInput] = useState<ScaffoldInput | null>(null);
  const [loadingInput, setLoadingInput] = useState(false);

  useEffect(() => {
    listTemplateObjectTypes(getBrowserClient())
      .then(setObjectTypes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить шаблоны'))
      .finally(() => setLoadingTypes(false));
  }, []);

  const chooseObjectType = useCallback(async (type: string) => {
    setObjectType(type);
    setError(null);
    setLoadingInput(true);
    try {
      setInput(await loadScaffoldInput(getBrowserClient(), type));
      setStep('params');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить шаблон');
    } finally {
      setLoadingInput(false);
    }
  }, []);

  const preview = useMemo<ScheduleRow[]>(() => {
    if (!input || step !== 'preview') return [];
    return buildScheduleFromTemplate(input, {
      objectType,
      objectName: objectName || undefined,
      organization: organization || undefined,
      defaultDuration,
    });
  }, [input, step, objectType, objectName, organization, defaultDuration]);

  const cpm = useMemo(
    () => (preview.length > 0 ? runCpm(preview, DEFAULT_CALENDAR) : null),
    [preview],
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">← На главную</Link>
        <Steps current={step} />
      </header>

      <h1 className="mb-6 text-2xl font-semibold">Мастер создания графика</h1>

      {error && (
        <p className="mb-4 rounded-lg border border-[var(--critical)] bg-red-50 px-4 py-3 text-sm text-[var(--critical)]">
          {error}
        </p>
      )}

      {step === 'object' && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Шаг 1. Тип объекта</h2>
          {loadingTypes ? (
            <p className="text-sm text-[var(--muted)]">Загрузка шаблонов…</p>
          ) : objectTypes.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Нет доступных шаблонов СДР.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
              {objectTypes.map((t) => (
                <li key={t} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{t}</span>
                  <button
                    onClick={() => void chooseObjectType(t)}
                    disabled={loadingInput}
                    className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
                  >
                    {loadingInput && objectType === t ? 'Загрузка…' : 'Выбрать'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {step === 'params' && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium">Шаг 2. Параметры проекта</h2>
          <Field label="Объект / станция">
            <input value={objectName} onChange={(e) => setObjectName(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] px-3 py-1.5 text-sm" />
          </Field>
          <Field label="Организация">
            <input value={organization} onChange={(e) => setOrganization(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] px-3 py-1.5 text-sm" />
          </Field>
          <Field label="Длительность по умолчанию (раб. дни)">
            <input type="number" min={1} value={defaultDuration}
              onChange={(e) => setDefaultDuration(Math.max(1, Number(e.target.value) || 1))}
              className="w-32 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm" />
          </Field>
          <div className="flex gap-2">
            <button onClick={() => setStep('object')}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-gray-50">Назад</button>
            <button onClick={() => setStep('preview')}
              className="rounded-lg bg-[var(--foreground)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90">Предпросмотр</button>
          </div>
        </section>
      )}

      {step === 'preview' && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium">Шаг 3. Предпросмотр</h2>
          <div className="flex items-center gap-6 text-sm text-[var(--muted)]">
            <span>{preview.length} строк</span>
            {cpm && <span>Длительность: {cpm.projectDuration} р.д.</span>}
            {cpm && <span>Крит. путь: {cpm.criticalPath.length}</span>}
          </div>
          <div className="max-h-80 overflow-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs text-[var(--muted)]">
                <tr><th className="px-3 py-1.5">СДР</th><th className="px-3 py-1.5">Наименование</th><th className="px-3 py-1.5">Тип</th><th className="px-3 py-1.5">Длит.</th></tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.row_id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-1 font-mono text-xs">{r.sdr}</td>
                    <td className="px-3 py-1">{r.name}</td>
                    <td className="px-3 py-1 text-xs text-[var(--muted)]">{r.row_type}</td>
                    <td className="px-3 py-1">{r.duration ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep('params')}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-gray-50">Назад</button>
            <button onClick={() => onCreate(preview)} disabled={preview.length === 0}
              className="rounded-lg bg-[var(--foreground)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">Открыть в редакторе</button>
          </div>
        </section>
      )}
    </main>
  );
}

function Steps({ current }: { current: Step }) {
  const order: Step[] = ['object', 'params', 'preview'];
  const labels: Record<Step, string> = { object: 'Объект', params: 'Параметры', preview: 'Предпросмотр' };
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
      {order.map((s, i) => (
        <span key={s} className={s === current ? 'font-medium text-[var(--foreground)]' : ''}>
          {i + 1}. {labels[s]}
        </span>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}
