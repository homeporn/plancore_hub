'use client';

import { useEffect, useState } from 'react';
import type { ScheduleRow } from '@plancore/core';
import {
  listMemberProjects,
  loadCurrentScheduleRows,
  type ProjectSummary,
} from '@plancore/data';
import { Button } from '@plancore/ui';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getBrowserClient();
    listMemberProjects(client, userId)
      .then(setProjects)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : 'Не удалось загрузить проекты',
        ),
      )
      .finally(() => setLoading(false));
  }, [userId]);

  async function open(project: ProjectSummary) {
    setOpeningId(project.id);
    setError(null);
    try {
      const rows = await loadCurrentScheduleRows(
        getBrowserClient(),
        project.id,
      );
      if (rows.length === 0) {
        setError('У проекта нет текущей версии графика.');
        return;
      }
      onOpenSchedule(project.name, rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки графика');
    } finally {
      setOpeningId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Загрузка проектов…</p>;
  }

  if (projects.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        У вас пока нет проектов. Загрузите график из Excel ниже.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Сохранённые проекты</h3>
      <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
        {projects.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between px-3 py-2 text-sm"
          >
            <span>{p.name}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void open(p)}
              disabled={openingId === p.id}
            >
              {openingId === p.id ? 'Открываю…' : 'Аудит'}
            </Button>
          </li>
        ))}
      </ul>
      {error && <p className="text-xs text-[var(--critical)]">{error}</p>}
    </div>
  );
}
