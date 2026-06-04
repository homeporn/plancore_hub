'use client';

import { useState } from 'react';
import type { LibraryStore } from '@plancore/store';
import {
  availableActions,
  type LibraryItem,
  type LibraryAction,
  type LibraryItemState,
} from '@plancore/core';

interface Props {
  store: LibraryStore;
  item: LibraryItem;
  /** Called with the updated item after a successful action. */
  onChanged: (item: LibraryItem) => void;
}

const ACTION_LABELS: Record<LibraryAction, string> = {
  'submit-for-review': 'На проверку',
  approve: 'Утвердить',
  reject: 'Отклонить',
  archive: 'В архив',
  restore: 'Восстановить',
  publish: 'Опубликовать',
  unpublish: 'Снять с публикации',
};

/** Workflow action buttons for a library item, driven by the shared state machine. */
export function LibraryActions({ store, item, onChanged }: Props) {
  const [busy, setBusy] = useState<LibraryAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const state: LibraryItemState = {
    status: item.status as LibraryItemState['status'],
    validationState: item.validationState as LibraryItemState['validationState'],
    publishState: item.publishState as LibraryItemState['publishState'],
  };
  const actions = availableActions(state);

  async function run(action: LibraryAction) {
    setBusy(action);
    setError(null);
    try {
      onChanged(await store.runAction(item.id, action));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось выполнить действие');
    } finally {
      setBusy(null);
    }
  }

  if (actions.length === 0) {
    return <p className="text-xs text-[var(--muted)]">Действия недоступны.</p>;
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {actions.map((a) => (
          <button
            key={a}
            onClick={() => void run(a)}
            disabled={busy !== null}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
          >
            {busy === a ? '…' : ACTION_LABELS[a]}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-[var(--critical)]">{error}</p>}
    </div>
  );
}
