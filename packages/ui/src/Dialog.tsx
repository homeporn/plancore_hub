'use client';

import type { ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from './cn.js';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Accessible modal dialog (Radix) styled with the app's design tokens. */
export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in" />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-[var(--border)] bg-white p-5 shadow-lg focus:outline-none',
            className,
          )}
        >
          {title && (
            <RadixDialog.Title className="text-base font-semibold">{title}</RadixDialog.Title>
          )}
          {description && (
            <RadixDialog.Description className="mt-1 text-sm text-[var(--muted)]">
              {description}
            </RadixDialog.Description>
          )}
          <div className={cn(title || description ? 'mt-4' : '')}>{children}</div>
          <RadixDialog.Close
            aria-label="Закрыть"
            className="absolute right-3 top-3 rounded p-1 text-[var(--muted)] hover:bg-gray-100"
          >
            <X size={16} />
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
