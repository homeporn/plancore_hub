'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronRight, FileStack, Clock, GitBranch } from 'lucide-react';
import {
  buildScheduleFromTemplate,
  runCpm,
  DEFAULT_CALENDAR,
  listBuiltinScenarios,
  getBuiltinScenario,
  type ScaffoldInput,
  type ScheduleRow,
} from '@plancore/core';
import { listTemplateObjectTypes, loadScaffoldInput } from '@plancore/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getBrowserClient } from '@/lib/supabase/browser';

type Step = 'object' | 'params' | 'preview';
const ORDER: Step[] = ['object', 'params', 'preview'];
const LABELS: Record<Step, string> = { object: 'Тип объекта', params: 'Параметры', preview: 'Предпросмотр' };

interface ScheduleWizardProps {
  /** Called with the generated rows (+ chosen scenario id) when confirmed. */
  onCreate: (rows: ScheduleRow[], scenarioId: string | null) => void;
}

/**
 * Step-by-step schedule creation: pick an object type, set parameters, preview
 * the generated rows, then hand them off (e.g. into the editor).
 */
export function ScheduleWizard({ onCreate }: ScheduleWizardProps) {
  const [step, setStep] = useState<Step>('object');
  const [objectTypes, setObjectTypes] = useState<string[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const [objectType, setObjectType] = useState<string>('');
  // Built-in scenario id chosen (drives the editor's planning mode); null = DB template.
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [objectName, setObjectName] = useState('');
  const [organization, setOrganization] = useState('');
  const [defaultDuration, setDefaultDuration] = useState(5);

  const [input, setInput] = useState<ScaffoldInput | null>(null);
  const [loadingInput, setLoadingInput] = useState(false);

  useEffect(() => {
    listTemplateObjectTypes(getBrowserClient())
      .then(setObjectTypes)
      .catch((e) => toast.error('Не удалось загрузить шаблоны', { description: msg(e) }))
      .finally(() => setLoadingTypes(false));
  }, []);

  const scenarios = useMemo(() => listBuiltinScenarios(), []);

  const chooseObjectType = useCallback(async (type: string) => {
    setObjectType(type);
    setScenarioId(null);
    setLoadingInput(true);
    try {
      setInput(await loadScaffoldInput(getBrowserClient(), type));
      setStep('params');
    } catch (e) {
      toast.error('Не удалось загрузить шаблон', { description: msg(e) });
    } finally {
      setLoadingInput(false);
    }
  }, []);

  // Built-in scenario: no DB round-trip, the payload ships with the app.
  const chooseScenario = useCallback((id: string) => {
    const scenario = getBuiltinScenario(id);
    if (!scenario) return;
    setObjectType(scenario.objectType);
    setScenarioId(id);
    setInput(scenario.input);
    setStep('params');
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Мастер создания графика</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Сгенерируйте структуру графика по шаблону СДР и откройте её в редакторе.
        </p>
      </div>

      <Stepper current={step} />

      {step === 'object' && (
        <section className="space-y-5">
          {/* Built-in scenarios — always available. */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Готовые сценарии</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => chooseScenario(s.id)}
                  disabled={loadingInput}
                  className="group flex items-start justify-between gap-3 rounded-lg border bg-card p-4 text-left text-sm shadow-sm transition-colors hover:border-primary disabled:opacity-60"
                >
                  <span className="flex items-start gap-3">
                    <FileStack className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <span>
                      <span className="block font-medium">{s.label}</span>
                      <span className="block text-xs text-muted-foreground">{s.description}</span>
                    </span>
                  </span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Templates from the project database, if any. */}
          {loadingTypes ? (
            <div className="space-y-2">
              {[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : objectTypes.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-medium">Шаблоны из базы</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {objectTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => void chooseObjectType(t)}
                    disabled={loadingInput}
                    className="group flex items-center justify-between gap-3 rounded-lg border bg-card p-4 text-left text-sm shadow-sm transition-colors hover:border-primary disabled:opacity-60"
                  >
                    <span className="flex items-center gap-3">
                      <FileStack className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{t}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {step === 'params' && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{objectType}</Badge>
              шаблон выбран
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objectName">Объект / станция</Label>
              <Input id="objectName" value={objectName} onChange={(e) => setObjectName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organization">Организация</Label>
              <Input id="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dur">Длительность по умолчанию (раб. дни)</Label>
              <Input
                id="dur"
                type="number"
                min={1}
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(Math.max(1, Number(e.target.value) || 1))}
                className="w-32"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep('object')}>Назад</Button>
              <Button onClick={() => setStep('preview')}>Предпросмотр</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <section className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Metric icon={FileStack} label="Строк" value={String(preview.length)} />
            <Metric icon={Clock} label="Длительность" value={cpm ? `${cpm.projectDuration} р.д.` : '—'} />
            <Metric icon={GitBranch} label="Крит. путь" value={cpm ? String(cpm.criticalPath.length) : '—'} />
          </div>
          <div className="max-h-96 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">СДР</th>
                  <th className="px-3 py-2 font-medium">Наименование</th>
                  <th className="px-3 py-2 font-medium">Тип</th>
                  <th className="px-3 py-2 font-medium">Длит.</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.row_id} className="border-t">
                    <td className="px-3 py-1.5 font-mono text-xs">{r.sdr}</td>
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.row_type}</td>
                    <td className="px-3 py-1.5">{r.duration ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('params')}>Назад</Button>
            <Button onClick={() => onCreate(preview, scenarioId)} disabled={preview.length === 0}>
              Открыть в редакторе
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  const currentIdx = ORDER.indexOf(current);
  return (
    <ol className="flex items-center gap-2">
      {ORDER.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                done || active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn('text-sm', active ? 'font-medium' : 'text-muted-foreground')}>
              {LABELS[s]}
            </span>
            {i < ORDER.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Неизвестная ошибка';
}
