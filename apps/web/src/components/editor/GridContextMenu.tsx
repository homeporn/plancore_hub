'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export interface MenuItem {
  type?: 'item' | 'separator';
  label?: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onSelect?: () => void;
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

/** Lightweight floating context menu, positioned at the cursor and clamped to
 *  the viewport. Closes on outside click, scroll, resize or Escape. */
export function GridContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('contextmenu', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('contextmenu', onDown, true);
    };
  }, [onClose]);

  // Clamp position so the menu stays on-screen.
  const MENU_W = 230;
  const estH = items.length * 30 + 8;
  const left = typeof window !== 'undefined' ? Math.min(x, window.innerWidth - MENU_W - 8) : x;
  const top = typeof window !== 'undefined' ? Math.min(y, window.innerHeight - estH - 8) : y;

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-[60] min-w-[210px] overflow-hidden rounded-md border bg-popover py-1 text-popover-foreground shadow-md"
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
    >
      {items.map((item, i) => {
        if (item.type === 'separator') {
          return <div key={`sep-${i}`} className="my-1 h-px bg-border" />;
        }
        return (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => { item.onSelect?.(); onClose(); }}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm disabled:pointer-events-none disabled:opacity-40 ${
              item.danger ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40' : 'hover:bg-accent'
            }`}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center opacity-80">{item.icon}</span>
            <span className="flex-1 truncate">{item.label}</span>
            {item.shortcut && (
              <span className="ml-3 shrink-0 text-xs text-muted-foreground">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
