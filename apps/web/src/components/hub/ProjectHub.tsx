'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  FolderPlus,
  FolderOpen,
  CheckCircle2,
  ListTodo,
  ShieldCheck,
  Table2,
  Network,
  Plus,
} from 'lucide-react';
import {
  listProjectsWithMeta,
  createProject,
  type ProjectMeta,
} from '@plancore/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/useAuth';
import { useProject } from '@/context/ProjectProvider';
import { getBrowserClient } from '@/lib/supabase/browser';
import { AuthScreen } from '@/components/AuthScreen';

/**
 * Project workspace: lists the user's projects with their schedule bounds,
 * supports creating one, and selects the active project (shared via
 * ProjectProvider) before entering a mode.
 */
export function ProjectHub() {
  const { user, loading: authLoading } = useAuth();
  const { current, setCurrent } = useProject();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const reload = useCallback(() => {
    if (!user) return;
    setLoading(true);
    listProjectsWithMeta(getBrowserClient(), user.id)
      .then(setProjects)
      .catch((e) => toast.error('Не удалось загрузить проекты', { description: msg(e) }))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createProject(getBrowserClient(), name);
      setNewName('');
      toast.success('Проект создан', { description: name });
      reload();
    } catch (e) {
      toast.error('Не удалось создать проект', { description: msg(e) });
    } finally {
      setCreating(false);
    }
  }, [newName, reload]);

  const stats = useMemo(
    () => ({
      total: projects.length,
      withSchedule: projects.filter((p) => p.taskCount > 0).length,
      tasks: projects.reduce((s, p) => s + p.taskCount, 0),
    }),
    [projects],
  );

  if (authLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">Войдите, чтобы открыть проекты</h1>
        <AuthScreen />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Heading + create */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Мои проекты</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Выберите проект для аудита, редактирования или построения графика.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
            placeholder="Название нового проекта"
            className="w-56"
          />
          <Button onClick={() => void handleCreate()} disabled={creating || !newName.trim()}>
            <Plus className="h-4 w-4" />
            {creating ? 'Создаю…' : 'Проект'}
          </Button>
        </div>
      </div>

      {/* Dashboard stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat icon={FolderOpen} label="Проектов" value={stats.total} />
        <Stat icon={CheckCircle2} label="С графиком" value={stats.withSchedule} />
        <Stat icon={ListTodo} label="Всего задач" value={stats.tasks} />
      </div>

      {/* Project grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 w-full rounded-xl" />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyProjects />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              active={current?.id === p.id}
              onSelect={() => setCurrent(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof FolderOpen; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
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
    <Card className={cn('flex flex-col', active && 'ring-2 ring-primary')}>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base">{project.name}</CardTitle>
        <Badge variant={active ? 'default' : 'secondary'}>{project.status || '—'}</Badge>
      </CardHeader>
      <CardContent className="pb-3">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <Row label="Этап" value={project.stage} />
          <Row label="Тип объекта" value={project.objectType} />
          <Row label="Срок" value={fmtRange(project.startDate, project.finishDate)} />
          <Row label="Задач" value={String(project.taskCount)} />
        </dl>
      </CardContent>
      <CardFooter className="mt-auto flex-wrap gap-2 pt-0">
        <Button variant={active ? 'secondary' : 'default'} size="sm" onClick={onSelect}>
          {active ? <><CheckCircle2 className="h-4 w-4" /> Текущий</> : 'Сделать текущим'}
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/app" onClick={onSelect}><ShieldCheck className="h-4 w-4" /> Аудит</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/editor" onClick={onSelect}><Table2 className="h-4 w-4" /> Редактор</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/graph" onClick={onSelect}><Network className="h-4 w-4" /> Граф</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || '—'}</dd>
    </>
  );
}

function EmptyProjects() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <FolderPlus className="h-6 w-6 text-muted-foreground" />
      </span>
      <div>
        <p className="font-medium">Пока нет проектов</p>
        <p className="text-sm text-muted-foreground">
          Создайте первый проект в поле выше или воспользуйтесь Мастером.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/wizard">Открыть Мастер</Link>
      </Button>
    </div>
  );
}

function fmtRange(start: string | null, finish: string | null): string {
  if (!start && !finish) return '—';
  return `${start ?? '?'} → ${finish ?? '?'}`;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Неизвестная ошибка';
}
