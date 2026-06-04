'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  listProjectsWithMeta,
  createProject,
  type ProjectMeta,
} from '@plancore/data';
import { useAuth } from '@/lib/useAuth';
import { useProject } from '@/context/ProjectProvider';
import { getBrowserClient } from '@/lib/supabase/browser';
import { AuthScreen } from '@/components/AuthScreen';

/**
 * Main working screen: lists the signed-in user's projects with their
 * parameters and schedule bounds, supports creating a project, and selects the
 * active project (shared via ProjectProvider) before entering a mode.
 */
export function ProjectHub() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { current, setCurrent } = useProject();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const reload = useCallback(() => {
    if (!user) return;
    setLoading(true);
    listProjectsWithMeta(getBrowserClient(), user.id)
      .then(setProjects)
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить проекты'))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      await createProject(getBrowserClient(), name);
      setNewName('');
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать проект');
    } finally {
      setCreating(false);
    }
  }, [newName, reload]);

  if (authLoading) {
    return <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-[var(--muted)]">Загрузка…</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-6 py-10 space-y-4">
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">← На главную</Link>
        <h1 className="text-2xl font-semibold">Войдите, чтобы открыть Hub</h1>
        <AuthScreen />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">← На главную</Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/library" className="text-[var(--muted)] hover:underline">Библиотека</Link>
          <span className="text-[var(--muted)]">{user.email}</span>
          <button onClick={() => void signOut()}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 hover:bg-gray-50">Выйти</button>
        </div>
      </header>

      <div className="mb-6 flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Мои проекты</h1>
        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
            placeholder="Название проекта"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
          />
          <button onClick={() => void handleCreate()} disabled={creating || !newName.trim()}
            className="rounded-lg bg-[var(--foreground)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            {creating ? 'Создаю…' : '+ Проект'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-[var(--critical)] bg-red-50 px-4 py-3 text-sm text-[var(--critical)]">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Загрузка проектов…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">У вас пока нет проектов. Создайте первый выше или используйте Мастер.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              active={current?.id === p.id}
              onSelect={() => setCurrent(p)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function ProjectCard({
  project,
  active,
  onSelect,
}: {
  project: ProjectMeta;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li className={`rounded-lg border p-4 ${active ? 'border-[var(--foreground)] ring-1 ring-[var(--foreground)]' : 'border-[var(--border)]'}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium">{project.name}</h3>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-[var(--muted)]">{project.status || '—'}</span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
        <dt>Этап</dt><dd className="text-right text-[var(--foreground)]">{project.stage || '—'}</dd>
        <dt>Тип объекта</dt><dd className="text-right text-[var(--foreground)]">{project.objectType || '—'}</dd>
        <dt>Срок</dt><dd className="text-right text-[var(--foreground)]">{fmtRange(project.startDate, project.finishDate)}</dd>
        <dt>Задач</dt><dd className="text-right text-[var(--foreground)]">{project.taskCount}</dd>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={onSelect}
          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-gray-50">
          {active ? '✓ Текущий' : 'Сделать текущим'}
        </button>
        <Link href="/app" onClick={onSelect}
          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-gray-50">Аудит</Link>
        <Link href="/editor" onClick={onSelect}
          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-gray-50">Редактор</Link>
        <Link href="/graph" onClick={onSelect}
          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-gray-50">Граф</Link>
      </div>
    </li>
  );
}

function fmtRange(start: string | null, finish: string | null): string {
  if (!start && !finish) return '—';
  return `${start ?? '?'} → ${finish ?? '?'}`;
}
