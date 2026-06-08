'use client';

import { Plus, Flag, Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface Props {
  selectedCount: number;
  disabled?: boolean;
  onAddTask: () => void;
  onAddMilestone: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

/**
 * Task-editing toolbar ("панель задач"): add tasks/milestones and run batch
 * operations on the selected rows. Batch actions are disabled until at least
 * one row is selected (or the version is read-only).
 */
export function EditorTaskBar({
  selectedCount,
  disabled = false,
  onAddTask,
  onAddMilestone,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: Props) {
  const noSelection = selectedCount === 0;
  const blocked = disabled;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b bg-muted/40 px-4 py-1.5">
      <Button variant="ghost" size="sm" disabled={blocked} onClick={onAddTask}>
        <Plus className="h-4 w-4" /> Задача
      </Button>
      <Button variant="ghost" size="sm" disabled={blocked} onClick={onAddMilestone}>
        <Flag className="h-4 w-4" /> Веха
      </Button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Button variant="ghost" size="sm" disabled={blocked || noSelection} onClick={onDuplicate}>
        <Copy className="h-4 w-4" /> Дублировать
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={blocked || noSelection}
        onClick={onDelete}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" /> Удалить
      </Button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Button variant="ghost" size="sm" disabled={blocked || noSelection} onClick={onMoveUp}>
        <ArrowUp className="h-4 w-4" /> Вверх
      </Button>
      <Button variant="ghost" size="sm" disabled={blocked || noSelection} onClick={onMoveDown}>
        <ArrowDown className="h-4 w-4" /> Вниз
      </Button>

      {selectedCount > 0 && (
        <span className="ml-auto text-xs text-muted-foreground">
          Выбрано: {selectedCount}
        </span>
      )}
    </div>
  );
}
