'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { buildHandoffChains, type HandoffSpec, type ScheduleRow } from '@plancore/core';
import { listVolumes, type ProjectVolume } from '@plancore/data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

const SELECT_CLASS =
  'min-w-48 flex-1 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

/** Batch "add assignments" dialog: several handoffs at once (Wave G). */
export function BatchHandoffDialog({ projectId, open, onOpenChange, onApply }: Props) {
  const client = useMemo(() => getBrowserClient(), []);
  const [volumes, setVolumes] = useState<ProjectVolume[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>([blankDraft()]);

  useEffect(() => {
    if (!open) return;
    listVolumes(client, projectId)
      .then(setVolumes)
      .catch((e) =>
        toast.error('Не удалось загрузить реестр томов', {
          description: e instanceof Error ? e.message : undefined,
        }),
      );
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
        volumeId: volume.id,
        includeDevelopment: d.includeDevelopment,
        stage: 'проектирование',
      });
    }
    if (specs.length === 0) {
      toast.warning('Заполните хотя бы одну строку', {
        description: 'Отдел-отправитель, отдел-получатель и том.',
      });
      return;
    }
    onApply(buildHandoffChains(specs));
    setDrafts([blankDraft()]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Добавить задания</DialogTitle>
          <DialogDescription>
            Каждая строка создаёт цепочку: задание → веха «получено» → разработка тома.
          </DialogDescription>
        </DialogHeader>

        {volumes.length === 0 ? (
          <Alert variant="warning">
            <AlertDescription>
              В проекте нет томов. Сначала добавьте тома в реестр (вручную или импортом состава).
            </AlertDescription>
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
                  <span className="text-muted-foreground">→</span>
                  <Input
                    placeholder="В отдел"
                    value={d.toDepartment}
                    onChange={(e) => update(d.key, { toDepartment: e.target.value })}
                    className="w-32"
                  />
                  <select
                    value={d.volumeId}
                    onChange={(e) => update(d.key, { volumeId: e.target.value })}
                    className={SELECT_CLASS}
                  >
                    <option value="">— Том —</option>
                    {volumes.map((v) => (
                      <option key={v.id} value={v.id}>
                        {[v.code, v.name].filter(Boolean).join(' · ') || v.id}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={d.includeDevelopment}
                      onChange={(e) => update(d.key, { includeDevelopment: e.target.checked })}
                      className="h-4 w-4 accent-primary"
                    />
                    разработка
                  </label>
                  <button
                    type="button"
                    aria-label="Удалить строку"
                    onClick={() => setDrafts((prev) => prev.filter((x) => x.key !== d.key))}
                    className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setDrafts((prev) => [...prev, blankDraft()])}>
                <Plus className="h-4 w-4" /> Ещё задание
              </Button>
              <Button size="sm" onClick={apply} className="ml-auto">
                Добавить в график
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
