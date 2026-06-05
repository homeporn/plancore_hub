'use client';

import { Button } from '@plancore/ui';
import type { SaveState } from './useScheduleCollab';
import type { PresenceUser } from '@plancore/store';

const SAVE_LABEL: Record<SaveState, string> = {
  idle: 'Сохранить',
  saving: 'Сохранение…',
  saved: 'Сохранено ✓',
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
          className="text-xs text-[var(--muted)]"
          title={others.map((o) => o.name).join(', ')}
        >
          ● Редактируют ещё: {others.length}
        </span>
      )}

      {stale && (
        <span className="flex items-center gap-1 text-xs text-[var(--warning)]">
          Версия обновлена
          <button onClick={onReload} className="underline hover:no-underline">
            обновить
          </button>
        </span>
      )}

      {!editable && (
        <span className="text-xs text-[var(--muted)]">Версия утверждена — только чтение</span>
      )}

      {error && <span className="text-xs text-[var(--critical)]">{error}</span>}

      <Button
        variant="primary"
        size="sm"
        disabled={!editable || saveState === 'saving'}
        onClick={onSave}
      >
        {SAVE_LABEL[saveState]}
      </Button>
    </div>
  );
}
