'use client';

import Link from 'next/link';
import { FolderOpen, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useProject } from '@/context/ProjectProvider';

/**
 * Topbar control showing the active project. Clicking goes to the Hub to
 * change selection, keeping the cross-mode context visible at all times.
 */
export function ProjectSwitcher() {
  const { current, hydrated } = useProject();

  if (!hydrated) return <Skeleton className="h-9 w-44" />;

  return (
    <Link
      href="/hub"
      className="group flex max-w-xs items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent"
    >
      <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
      {current ? (
        <span className="truncate font-medium">{current.name}</span>
      ) : (
        <span className="text-muted-foreground">Проект не выбран</span>
      )}
      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
