'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Table2, Network, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/useAuth';
import { useProject } from '@/context/ProjectProvider';
import { NAV_ITEMS, FULL_BLEED_ROUTES, activeNav } from './nav';
import { ProjectSwitcher } from './ProjectSwitcher';

// Per-project modes shown as a segmented switcher when a project is active.
const PROJECT_MODES = [
  { href: '/editor', label: 'Редактор', icon: Table2 },
  { href: '/graph', label: 'Граф', icon: Network },
  { href: '/app', label: 'Аудит', icon: ShieldCheck },
];

/**
 * Global application chrome: a persistent left sidebar + top bar with the
 * project switcher, breadcrumb and account controls. The landing page ('/')
 * opts out and renders bare.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const { user, signOut } = useAuth();
  const { current } = useProject();

  if (pathname === '/') return <>{children}</>;

  const active = activeNav(pathname);
  const fullBleed = FULL_BLEED_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
        <Link href="/" className="flex items-center gap-2 px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            P
          </span>
          <span className="text-base font-semibold tracking-tight">PlanCore</span>
        </Link>

        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = active?.href === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t px-3 py-3">
          {user && (
            <div className="flex items-center justify-between gap-2 px-2">
              <span className="truncate text-xs text-muted-foreground" title={user.email ?? ''}>
                {user.email}
              </span>
              <button
                onClick={() => void signOut()}
                aria-label="Выйти"
                title="Выйти"
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-card px-6">
          <span className="text-sm font-medium text-muted-foreground">
            {active?.label ?? 'PlanCore'}
          </span>

          {current && (
            <div className="flex items-center gap-0.5 rounded-md border bg-background p-0.5">
              {PROJECT_MODES.map((m) => {
                const isActive = pathname.startsWith(m.href);
                const Icon = m.icon;
                return (
                  <Link
                    key={m.href}
                    href={m.href}
                    className={cn(
                      'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-secondary text-secondary-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {m.label}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="ml-auto">
            <ProjectSwitcher />
          </div>
        </header>

        <main className={cn('min-h-0 flex-1', fullBleed ? 'overflow-hidden' : 'overflow-y-auto p-6')}>
          {children}
        </main>
      </div>
    </div>
  );
}
