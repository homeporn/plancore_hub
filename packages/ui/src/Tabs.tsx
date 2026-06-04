'use client';

import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from './cn.js';

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

/** A simple controlled tab bar (Radix) matching the app's underline style. */
export function Tabs({ tabs, value, onValueChange, className }: TabsProps) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange} className={className}>
      <RadixTabs.List className="flex gap-1 border-b border-[var(--border)]">
        {tabs.map((t) => (
          <RadixTabs.Trigger
            key={t.id}
            value={t.id}
            className={cn(
              'px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]',
              'data-[state=active]:border-b-2 data-[state=active]:border-[var(--foreground)]',
              'data-[state=active]:font-medium data-[state=active]:text-[var(--foreground)]',
            )}
          >
            {t.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
    </RadixTabs.Root>
  );
}
