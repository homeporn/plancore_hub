'use client';

import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { CustomColumn, CustomColumnType } from '@plancore/data';
import { COLUMNS } from './columnDefs';
import { COLOR_FIELDS, type Density, type GridTheme, type EditorView } from './useEditorView';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: EditorView;
  onToggleColumn: (id: string) => void;
  onDensity: (d: Density) => void;
  onTheme: (t: GridTheme) => void;
  onReset: () => void;
  customColumns: CustomColumn[];
  canAddCustom: boolean;
  onAddCustom: (label: string, type: CustomColumnType) => void;
  onRemoveCustom: (id: string) => void;
  onColor: (key: string, value: string) => void;
  onResetColors: () => void;
}

const DENSITIES: { id: Density; label: string }[] = [
  { id: 'compact', label: 'Плотно' },
  { id: 'normal', label: 'Обычно' },
  { id: 'comfortable', label: 'Просторно' },
];

const THEMES: { id: GridTheme; label: string }[] = [
  { id: 'light', label: 'Светлая' },
  { id: 'dark', label: 'Тёмная' },
];

/** Table-view settings: column visibility, density and grid theme. */
export function EditorViewDialog({
  open,
  onOpenChange,
  view,
  onToggleColumn,
  onDensity,
  onTheme,
  onReset,
  customColumns,
  canAddCustom,
  onAddCustom,
  onRemoveCustom,
  onColor,
  onResetColors,
}: Props) {
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CustomColumnType>('text');

  function submitCustom() {
    const label = newLabel.trim();
    if (!label) return;
    onAddCustom(label, newType);
    setNewLabel('');
    setNewType('text');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Настройка таблицы</DialogTitle>
          <DialogDescription>Поля, плотность и тема таблицы. Сохраняется в браузере.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {/* Density */}
          <div>
            <p className="mb-1.5 text-sm font-medium">Плотность строк</p>
            <Segmented
              options={DENSITIES}
              value={view.density}
              onChange={(v) => onDensity(v as Density)}
            />
          </div>

          {/* Theme */}
          <div>
            <p className="mb-1.5 text-sm font-medium">Тема таблицы</p>
            <Segmented
              options={THEMES}
              value={view.theme}
              onChange={(v) => onTheme(v as GridTheme)}
            />
          </div>

          <Separator />

          {/* Row colours by level */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Цвета строк по уровням</p>
              <button onClick={onResetColors} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                Сбросить цвета
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {COLOR_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-muted-foreground">{f.label}</span>
                  <input
                    type="color"
                    value={view.colors[f.key] ?? '#ffffff'}
                    onChange={(e) => onColor(f.key, e.target.value)}
                    className="h-6 w-9 shrink-0 cursor-pointer rounded border bg-transparent"
                  />
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Columns */}
          <div>
            <p className="mb-2 text-sm font-medium">Поля (колонки)</p>
            <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
              {COLUMNS.map((c) => {
                const id = c.id as string;
                const checked = view.visibleCols.includes(id);
                return (
                  <label
                    key={id}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                      c.locked ? 'opacity-60' : 'cursor-pointer hover:bg-accent',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={checked || c.locked}
                      disabled={c.locked}
                      onChange={() => onToggleColumn(id)}
                    />
                    {c.label}
                  </label>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Custom fields */}
          <div>
            <p className="mb-2 text-sm font-medium">Произвольные поля</p>
            {!canAddCustom && (
              <p className="mb-2 text-xs text-muted-foreground">
                Выберите проект, чтобы добавлять произвольные поля.
              </p>
            )}
            {customColumns.length > 0 && (
              <ul className="mb-2 space-y-1">
                {customColumns.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                    <span className="flex-1">{c.label}</span>
                    <span className="text-xs text-muted-foreground">{c.type}</span>
                    <button
                      onClick={() => onRemoveCustom(c.id)}
                      aria-label="Удалить поле"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {canAddCustom && (
              <div className="flex items-center gap-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitCustom(); }}
                  placeholder="Название поля"
                  className="flex-1"
                />
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as CustomColumnType)}
                  className="rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="text">текст</option>
                  <option value="number">число</option>
                  <option value="date">дата</option>
                </select>
                <Button size="sm" onClick={submitCustom} disabled={!newLabel.trim()}>
                  <Plus className="h-4 w-4" /> Добавить
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={onReset}>Сбросить вид</Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>Готово</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium transition-colors',
            value === o.id ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
