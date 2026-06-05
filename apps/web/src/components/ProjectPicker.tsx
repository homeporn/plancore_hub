'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import type { ScheduleRow } from '@plancore/core';
import {
  listMemberProjects,
  loadCurrentScheduleRows,
  type ProjectSummary,
} from '@plancore/data';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getBrowserClient } from '@/lib/supabase/browser';

interface ProjectPickerProps {
  userId: string;
  onOpenSchedule: (projectName: string, rows: ScheduleRow[]) => void;
}

/**
 * Lists the signed-in user's projects and, on selection, loads the current
 * saved schedule version and hands its rows up for auditing.
 */
export function ProjectPicker({ userId, onOpenSchedule }: ProjectPickerProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    const client = getBrowserClient();
    listMemberProjects(client, userId)
      .then(setProjects)
      .catch((e) =>
        toast.error('Не удалось загрузить проекты', {
          description: e instanceof Error ? e.message : undefined,
        }),
      )
      .finally(() => setLoading(false));
  }, [userId]);

  async function open(project: ProjectSummary) {
    setOpeningId(project.id);
    try {
      const rows = await loadCurrentScheduleRows(getBrowserClient(), project.id);
      if (rows.length === 0) {
        toast.warning('У проекта нет текущей версии графика');
        return;
      }
      onOpenSchedule(project.name, rows);
    } catch (e) {
      toast.error('Ошибка загрузки графика', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setOpeningId(null);
    }
  }

  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        У вас пока нет проектов. Загрузите график из Excel ниже.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium">Сохранённые проекты</h2>
      <ul className="divide-y rounded-lg border">
        {projects.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span>{p.name}</span>
            <Button variant="outline" size="sm" onClick={() => void open(p)} disabled={openingId === p.id}>
              <ShieldCheck className="h-4 w-4" />
              {openingId === p.id ? 'Открываю…' : 'Аудит'}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
