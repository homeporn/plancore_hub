'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_VISIBLE_COLS } from './columnDefs';

export type Density = 'compact' | 'normal' | 'comfortable';
export type GridTheme = 'light' | 'dark';

/** Editable row colours, keyed to the --plc-* CSS variables. */
export type LevelColors = Record<string, string>;

export interface EditorView {
  /** Ordered set of visible column ids. */
  visibleCols: string[];
  density: Density;
  theme: GridTheme;
  /** Row colours by nesting level / state (overrides globals.css defaults). */
  colors: LevelColors;
}

/** Color keys ↔ labels ↔ CSS variable names. */
export const COLOR_FIELDS: { key: string; cssVar: string; label: string }[] = [
  { key: 'lvl0Bg', cssVar: '--plc-lvl0-bg', label: '1 уровень — фон' },
  { key: 'lvl0Fg', cssVar: '--plc-lvl0-fg', label: '1 уровень — текст' },
  { key: 'lvl1Bg', cssVar: '--plc-lvl1-bg', label: '2 уровень — фон' },
  { key: 'lvl1Fg', cssVar: '--plc-lvl1-fg', label: '2 уровень — текст' },
  { key: 'lvl2Bg', cssVar: '--plc-lvl2-bg', label: '3 уровень — фон' },
  { key: 'lvl2Fg', cssVar: '--plc-lvl2-fg', label: '3 уровень — текст' },
  { key: 'lvl3Bg', cssVar: '--plc-lvl3-bg', label: '4 уровень — фон' },
  { key: 'lvl3Fg', cssVar: '--plc-lvl3-fg', label: '4 уровень — текст' },
  { key: 'leafBg', cssVar: '--plc-leaf-bg', label: 'Подзадачи — фон' },
  { key: 'leafFg', cssVar: '--plc-leaf-fg', label: 'Подзадачи — текст' },
  { key: 'selectedBg', cssVar: '--plc-selected-bg', label: 'Активная строка — фон' },
];

const DEFAULT_COLORS: LevelColors = {
  lvl0Bg: '#1e3a8a', lvl0Fg: '#ffffff',
  lvl1Bg: '#2563eb', lvl1Fg: '#ffffff',
  lvl2Bg: '#60a5fa', lvl2Fg: '#ffffff',
  lvl3Bg: '#bfdbfe', lvl3Fg: '#0f172a',
  leafBg: '#ffffff', leafFg: '#0f172a',
  selectedBg: '#e5e7eb',
};

const STORAGE_KEY = 'plancore.editor.view';

const DEFAULT_VIEW: EditorView = {
  visibleCols: DEFAULT_VISIBLE_COLS,
  density: 'normal',
  theme: 'light',
  colors: DEFAULT_COLORS,
};

/** Editor table-view preferences (columns / density / theme / colours), persisted locally. */
export function useEditorView() {
  const [view, setView] = useState<EditorView>(DEFAULT_VIEW);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<EditorView>;
        setView({
          ...DEFAULT_VIEW,
          ...parsed,
          colors: { ...DEFAULT_COLORS, ...(parsed.colors ?? {}) },
        });
      }
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

  const setDensity = useCallback((density: Density) => persist({ ...view, density }), [persist, view]);
  const setTheme = useCallback((theme: GridTheme) => persist({ ...view, theme }), [persist, view]);
  const setColor = useCallback(
    (key: string, value: string) => persist({ ...view, colors: { ...view.colors, [key]: value } }),
    [persist, view],
  );
  const resetColors = useCallback(() => persist({ ...view, colors: DEFAULT_COLORS }), [persist, view]);
  const reset = useCallback(() => persist(DEFAULT_VIEW), [persist]);

  /** Inline style mapping colours → CSS variables, for the grid wrapper. */
  const colorVars = useMemo(() => {
    const style: Record<string, string> = {};
    for (const f of COLOR_FIELDS) {
      const v = view.colors[f.key];
      if (v) style[f.cssVar] = v;
    }
    // Keep the selected-row text readable on a light gray.
    style['--plc-selected-fg'] = '#0f172a';
    return style as React.CSSProperties;
  }, [view.colors]);

  return { view, colorVars, toggleColumn, setDensity, setTheme, setColor, resetColors, reset };
}
