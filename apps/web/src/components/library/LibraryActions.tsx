'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { LibraryStore } from '@plancore/store';
import {
  availableActions,
  type LibraryItem,
  type LibraryAction,
  type LibraryItemState,
} from '@plancore/core';
import { Button } from '@/components/ui/button';

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

  const state: LibraryItemState = {
    status: item.status as LibraryItemState['status'],
    validationState: item.validationState as LibraryItemState['validationState'],
    publishState: item.publishState as LibraryItemState['publishState'],
  };
  const actions = availableActions(state);

  async function run(action: LibraryAction) {
    setBusy(action);
    try {
      onChanged(await store.runAction(item.id, action));
      toast.success(ACTION_LABELS[action]);
    } catch (e) {
      toast.error('Не удалось выполнить действие', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  if (actions.length === 0) {
    return <p className="text-xs text-muted-foreground">Действия недоступны.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((a) => (
        <Button
          key={a}
          variant="outline"
          size="sm"
          onClick={() => void run(a)}
          disabled={busy !== null}
        >
          {busy === a ? '…' : ACTION_LABELS[a]}
        </Button>
      ))}
    </div>
  );
}
