'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildHandoffChains, type HandoffSpec, type ScheduleRow } from '@plancore/core';
import { listVolumes, type ProjectVolume } from '@plancore/data';
import { Alert, Button, Dialog, Input } from '@plancore/ui';
import { getBrowserClient } from '@/lib/supabase/browser';

interface DraftRow {
  key: string;
  fromDepartment: string;
  toDepartment: string;
  volumeId: string;
  includeDevelopment: boolean;
}

function blankDraft(): DraftRow {
  return {
    key: crypto.randomUUID(),
    fromDepartment: '',
    toDepartment: '',
    volumeId: '',
    includeDevelopment: true,
  };
}

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the built handoff chain rows to append to the schedule. */
  onApply: (rows: ScheduleRow[]) => void;
}

/** Batch "add assignments" dialog: several handoffs at once (Wave G). */
export function BatchHandoffDialog({ projectId, open, onOpenChange, onApply }: Props) {
  const client = useMemo(() => getBrowserClient(), []);
  const [volumes, setVolumes] = useState<ProjectVolume[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>([blankDraft()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    listVolumes(client, projectId)
      .then(setVolumes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить реестр томов'));
  }, [open, client, projectId]);

  function update(key: string, patch: Partial<DraftRow>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function apply() {
    const specs: HandoffSpec[] = [];
    for (const d of drafts) {
      const volume = volumes.find((v) => v.id === d.volumeId);
      if (!d.fromDepartment || !d.toDepartment || !volume) continue;
      specs.push({
        fromDepartment: d.fromDepartment,
        toDepartment: d.toDepartment,
        volumeName: volume.name || volume.code || 'Том',
        includeDevelopment: d.includeDevelopment,
        stage: 'проектирование',
      });
    }
    if (specs.length === 0) {
      setError('Заполните хотя бы одну строку: отдел-отправитель, отдел-получатель и том.');
      return;
    }
    onApply(buildHandoffChains(specs));
    setDrafts([blankDraft()]);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Добавить задания"
      description="Каждая строка создаёт цепочку: задание → веха «получено» → разработка тома."
      className="max-w-3xl"
    >
      {volumes.length === 0 ? (
        <Alert tone="warning">
          В проекте нет томов. Сначала добавьте тома в реестр (вручную или импортом состава).
        </Alert>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {drafts.map((d) => (
              <div key={d.key} className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Из отдела"
                  value={d.fromDepartment}
                  onChange={(e) => update(d.key, { fromDepartment: e.target.value })}
                  className="w-32"
                />
                <span className="text-[var(--muted)]">→</span>
                <Input
                  placeholder="В отдел"
                  value={d.toDepartment}
                  onChange={(e) => update(d.key, { toDepartment: e.target.value })}
                  className="w-32"
                />
                <select
                  value={d.volumeId}
                  onChange={(e) => update(d.key, { volumeId: e.target.value })}
                  className="min-w-48 flex-1 rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
                >
                  <option value="">— Том —</option>
                  {volumes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {[v.code, v.name].filter(Boolean).join(' · ') || v.id}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={d.includeDevelopment}
                    onChange={(e) => update(d.key, { includeDevelopment: e.target.checked })}
                  />
                  разработка
                </label>
                <button
                  type="button"
                  aria-label="Удалить строку"
                  onClick={() => setDrafts((prev) => prev.filter((x) => x.key !== d.key))}
                  className="rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setDrafts((prev) => [...prev, blankDraft()])}>
              + Ещё задание
            </Button>
            <Button variant="primary" size="sm" onClick={apply} className="ml-auto">
              Добавить в график
            </Button>
          </div>
        </div>
      )}

      {error && <Alert tone="critical" className="mt-3">{error}</Alert>}
    </Dialog>
  );
}
