'use client';

import { useState } from 'react';
import type { LibraryStore } from '@plancore/store';
import type { LibraryItem, LibraryItemVersion } from '@plancore/core';

interface Props {
  store: LibraryStore;
  items: LibraryItem[];
}

/** Small coloured pill for a workflow state. */
function StateBadge({ value }: { value: string }) {
  return (
    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-[var(--muted)]">{value || '—'}</span>
  );
}

export function LibraryItemsPanel({ store, items }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, LibraryItemVersion[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">В библиотеке пока нет элементов.</p>;
  }

  async function toggle(item: LibraryItem) {
    if (openId === item.id) {
      setOpenId(null);
      return;
    }
    setOpenId(item.id);
    if (!versions[item.id]) {
      setLoadingId(item.id);
      try {
        const v = await store.getItemVersions(item.id);
        setVersions((prev) => ({ ...prev, [item.id]: v }));
      } finally {
        setLoadingId(null);
      }
    }
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-[var(--border)]">
          <button onClick={() => void toggle(item)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50">
            <span className="font-mono text-xs text-[var(--muted)]">{item.itemCode}</span>
            <span className="flex-1 font-medium">{item.name}</span>
            <span className="text-xs text-[var(--muted)]">{item.section}</span>
            <span className="text-xs text-[var(--muted)]">v{item.version}</span>
            <StateBadge value={item.status} />
            <StateBadge value={item.publishState} />
          </button>

          {openId === item.id && (
            <div className="border-t border-[var(--border)] px-3 py-2 text-xs">
              <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-[var(--muted)]">
                <span>Валидация: <span className="text-[var(--foreground)]">{item.validationState || '—'}</span></span>
                <span>Владелец: <span className="text-[var(--foreground)]">{item.ownerRole || '—'}</span></span>
                <span>Ревьюер: <span className="text-[var(--foreground)]">{item.reviewerRole || '—'}</span></span>
                <span>Обновлён: <span className="text-[var(--foreground)]">{item.updatedAt.slice(0, 10)}</span></span>
              </div>
              <h4 className="mb-1 font-medium">История версий</h4>
              {loadingId === item.id ? (
                <p className="text-[var(--muted)]">Загрузка версий…</p>
              ) : (versions[item.id] ?? []).length === 0 ? (
                <p className="text-[var(--muted)]">Снапшотов нет.</p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {versions[item.id].map((v) => (
                    <li key={v.id} className="flex items-center gap-3 py-1">
                      <span className="font-mono">v{v.version}</span>
                      <StateBadge value={v.status} />
                      <StateBadge value={v.publishState} />
                      <span className="flex-1 text-[var(--muted)]">{v.note ?? ''}</span>
                      <span className="text-[var(--muted)]">{v.createdAt.slice(0, 10)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
