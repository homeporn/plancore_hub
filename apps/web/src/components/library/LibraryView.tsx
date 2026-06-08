'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { LibraryStore } from '@plancore/store';
import type { RefSection, RefOrganization, LibraryItem } from '@plancore/core';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { getBrowserClient } from '@/lib/supabase/browser';
import { SectionsPanel } from './SectionsPanel';
import { OrganizationsPanel } from './OrganizationsPanel';
import { LibraryItemsPanel } from './LibraryItemsPanel';

/**
 * Read-only view over the reference library: documentation sections,
 * organizations and versioned library items. Backed by the cached LibraryStore
 * facade.
 */
export function LibraryView() {
  const store = useMemo(() => new LibraryStore(getBrowserClient()), []);

  const [sections, setSections] = useState<RefSection[]>([]);
  const [organizations, setOrganizations] = useState<RefOrganization[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([store.getSections(), store.getOrganizations(), store.listItems()])
      .then(([s, o, i]) => {
        setSections(s);
        setOrganizations(o);
        setItems(i);
      })
      .catch((e) =>
        toast.error('Не удалось загрузить библиотеку', {
          description: e instanceof Error ? e.message : undefined,
        }),
      )
      .finally(() => setLoading(false));
  }, [store]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Библиотека</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Справочники разделов, организаций и методологий.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Tabs defaultValue="sections">
          <TabsList>
            <TabsTrigger value="sections">Разделы РД/ПД</TabsTrigger>
            <TabsTrigger value="organizations">Организации</TabsTrigger>
            <TabsTrigger value="items">Методологии и правила</TabsTrigger>
          </TabsList>
          <TabsContent value="sections">
            <SectionsPanel sections={sections} />
          </TabsContent>
          <TabsContent value="organizations">
            <OrganizationsPanel organizations={organizations} />
          </TabsContent>
          <TabsContent value="items">
            <LibraryItemsPanel store={store} items={items} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
