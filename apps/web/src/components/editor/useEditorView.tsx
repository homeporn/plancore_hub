'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_VISIBLE_COLS } from './columnDefs';

export type Density = 'compact' | 'normal' | 'comfortable';
export type GridTheme = 'light' | 'dark';

export interface EditorView {
  /** Ordered set of visible column ids. */
  visibleCols: string[];
  density: Density;
  theme: GridTheme;
}

const STORAGE_KEY = 'plancore.editor.view';

const DEFAULT_VIEW: EditorView = {
  visibleCols: DEFAULT_VISIBLE_COLS,
  density: 'normal',
  theme: 'light',
};

/** Editor table-view preferences (columns / density / theme), persisted locally. */
export function useEditorView() {
  const [view, setView] = useState<EditorView>(DEFAULT_VIEW);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setView({ ...DEFAULT_VIEW, ...(JSON.parse(raw) as Partial<EditorView>) });
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: EditorView) => {
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleColumn = useCallback(
    (id: string) =>
      setView((prev) => {
        const has = prev.visibleCols.includes(id);
        const visibleCols = has
          ? prev.visibleCols.filter((c) => c !== id)
          : [...prev.visibleCols, id];
        const next = { ...prev, visibleCols };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      }),
    [],
  );

  const setDensity = useCallback(
    (density: Density) => persist({ ...view, density }),
    [persist, view],
  );
  const setTheme = useCallback(
    (theme: GridTheme) => persist({ ...view, theme }),
    [persist, view],
  );
  const reset = useCallback(() => persist(DEFAULT_VIEW), [persist]);

  return { view, toggleColumn, setDensity, setTheme, reset };
}
