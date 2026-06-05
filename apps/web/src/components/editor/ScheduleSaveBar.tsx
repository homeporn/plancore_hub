'use client';

import { Save, Check, Lock, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SaveState } from './useScheduleCollab';
import type { PresenceUser } from '@plancore/store';

const SAVE_LABEL: Record<SaveState, string> = {
  idle: 'Сохранить',
  saving: 'Сохранение…',
  saved: 'Сохранено',
  stale: 'Сохранить',
  locked: 'Заблокировано',
  error: 'Сохранить',
};

interface Props {
  editable: boolean;
  others: PresenceUser[];
  stale: boolean;
  saveState: SaveState;
  error: string | null;
  onSave: () => void;
  onReload: () => void;
}

/** Toolbar controls for saving the draft and showing collaboration state. */
export function ScheduleSaveBar({
  editable,
  others,
  stale,
  saveState,
  error,
  onSave,
  onReload,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      {others.length > 0 && (
        <span
          className="flex items-center gap-1 text-xs text-muted-foreground"
          title={others.map((o) => o.name).join(', ')}
        >
          <Users className="h-3.5 w-3.5" /> {others.length}
        </span>
      )}

      {stale && (
        <button
          onClick={onReload}
          className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:underline"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Версия обновлена — обновить
        </button>
      )}

      {!editable && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Только чтение
        </span>
      )}

      {error && <span className="text-xs text-destructive">{error}</span>}

      <Button size="sm" disabled={!editable || saveState === 'saving'} onClick={onSave}>
        {saveState === 'saved' ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {SAVE_LABEL[saveState]}
      </Button>
    </div>
  );
}
