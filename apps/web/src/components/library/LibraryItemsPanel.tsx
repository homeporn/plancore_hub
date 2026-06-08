'use client';

import { useEffect, useState } from 'react';
import type { LibraryStore } from '@plancore/store';
import type { LibraryItem, LibraryItemVersion } from '@plancore/core';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LibraryActions } from './LibraryActions';

interface Props {
  store: LibraryStore;
  items: LibraryItem[];
}

function StateBadge({ value }: { value: string }) {
  return <Badge variant="secondary">{value || '—'}</Badge>;
}

export function LibraryItemsPanel({ store, items }: Props) {
  // Local copy so workflow actions can update an item in place.
  const [list, setList] = useState<LibraryItem[]>(items);
  const [openId, setOpenId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, LibraryItemVersion[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => setList(items), [items]);

  if (list.length === 0) {
    return <p className="text-sm text-muted-foreground">В библиотеке пока нет элементов.</p>;
  }

  async function loadVersions(itemId: string) {
    setLoadingId(itemId);
    try {
      const v = await store.getItemVersions(itemId);
      setVersions((prev) => ({ ...prev, [itemId]: v }));
    } finally {
      setLoadingId(null);
    }
  }

  async function toggle(item: LibraryItem) {
    if (openId === item.id) {
      setOpenId(null);
      return;
    }
    setOpenId(item.id);
    if (!versions[item.id]) await loadVersions(item.id);
  }

  function handleChanged(updated: LibraryItem) {
    setList((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    void loadVersions(updated.id);
  }

  return (
    <ul className="space-y-2">
      {list.map((item) => (
        <li key={item.id} className="overflow-hidden rounded-lg border">
          <button
            onClick={() => void toggle(item)}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60"
          >
            <span className="font-mono text-xs text-muted-foreground">{item.itemCode}</span>
            <span className="flex-1 font-medium">{item.name}</span>
            <span className="text-xs text-muted-foreground">{item.section}</span>
            <span className="text-xs text-muted-foreground">v{item.version}</span>
            <StateBadge value={item.status} />
            <StateBadge value={item.publishState} />
          </button>

          {openId === item.id && (
            <div className="border-t bg-muted/30 px-3 py-3 text-xs">
              <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
                <span>Валидация: <span className="text-foreground">{item.validationState || '—'}</span></span>
                <span>Владелец: <span className="text-foreground">{item.ownerRole || '—'}</span></span>
                <span>Ревьюер: <span className="text-foreground">{item.reviewerRole || '—'}</span></span>
                <span>Обновлён: <span className="text-foreground">{item.updatedAt.slice(0, 10)}</span></span>
              </div>

              <div className="mb-3">
                <h4 className="mb-1 font-medium text-foreground">Действия</h4>
                <LibraryActions store={store} item={item} onChanged={handleChanged} />
              </div>

              <h4 className="mb-1 font-medium text-foreground">История версий</h4>
              {loadingId === item.id ? (
                <Skeleton className="h-8 w-full" />
              ) : (versions[item.id] ?? []).length === 0 ? (
                <p className="text-muted-foreground">Снапшотов нет.</p>
              ) : (
                <ul className="divide-y">
                  {versions[item.id].map((v) => (
                    <li key={v.id} className="flex items-center gap-3 py-1.5">
                      <span className="font-mono">v{v.version}</span>
                      <StateBadge value={v.status} />
                      <StateBadge value={v.publishState} />
                      <span className="flex-1 text-muted-foreground">{v.note ?? ''}</span>
                      <span className="text-muted-foreground">{v.createdAt.slice(0, 10)}</span>
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
