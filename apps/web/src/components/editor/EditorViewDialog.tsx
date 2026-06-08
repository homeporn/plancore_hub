'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { COLUMNS } from './columnDefs';
import type { Density, GridTheme, EditorView } from './useEditorView';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: EditorView;
  onToggleColumn: (id: string) => void;
  onDensity: (d: Density) => void;
  onTheme: (t: GridTheme) => void;
  onReset: () => void;
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
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Настройка таблицы</DialogTitle>
          <DialogDescription>Поля, плотность и тема таблицы. Сохраняется в браузере.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={onReset}>Сбросить</Button>
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
