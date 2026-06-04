'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LibraryStore } from '@plancore/store';
import type {
  RefSection,
  RefOrganization,
  LibraryItem,
} from '@plancore/core';
import { getBrowserClient } from '@/lib/supabase/browser';
import { SectionsPanel } from './SectionsPanel';
import { OrganizationsPanel } from './OrganizationsPanel';
import { LibraryItemsPanel } from './LibraryItemsPanel';

type Tab = 'sections' | 'organizations' | 'items';

const TABS: { id: Tab; label: string }[] = [
  { id: 'sections', label: 'Разделы РД/ПД' },
  { id: 'organizations', label: 'Организации' },
  { id: 'items', label: 'Методологии и правила' },
];

/**
 * Read-only view over the reference library: documentation sections,
 * organizations and versioned library items. Backed by the cached LibraryStore
 * facade; the write/publish orchestrator arrives in a later step.
 */
export function LibraryView() {
  const store = useMemo(() => new LibraryStore(getBrowserClient()), []);
  const [tab, setTab] = useState<Tab>('sections');

  const [sections, setSections] = useState<RefSection[]>([]);
  const [organizations, setOrganizations] = useState<RefOrganization[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([store.getSections(), store.getOrganizations(), store.listItems()])
      .then(([s, o, i]) => {
        setSections(s);
        setOrganizations(o);
        setItems(i);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить библиотеку'))
      .finally(() => setLoading(false));
  }, [store]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">← На главную</Link>
        <Link href="/hub" className="text-sm text-[var(--muted)] hover:underline">Hub →</Link>
      </header>

      <h1 className="mb-6 text-2xl font-semibold">Библиотека</h1>

      <nav className="mb-6 flex gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm ${
              tab === t.id
                ? 'border-b-2 border-[var(--foreground)] font-medium'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && (
        <p className="mb-4 rounded-lg border border-[var(--critical)] bg-red-50 px-4 py-3 text-sm text-[var(--critical)]">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Загрузка…</p>
      ) : (
        <>
          {tab === 'sections' && <SectionsPanel sections={sections} />}
          {tab === 'organizations' && <OrganizationsPanel organizations={organizations} />}
          {tab === 'items' && <LibraryItemsPanel store={store} items={items} />}
        </>
      )}
    </main>
  );
}
