'use client';

import {
  Plus, Flag, Copy, ClipboardPaste, Trash2, ArrowUp, ArrowDown,
  IndentIncrease, IndentDecrease, ListOrdered,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface Props {
  selectedCount: number;
  clipboardCount: number;
  disabled?: boolean;
  onAddTask: () => void;
  onAddMilestone: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onRenumber: () => void;
}

/**
 * Task-editing toolbar ("панель задач"): add tasks/milestones and run batch
 * operations on the selected rows. Batch actions are disabled until at least
 * one row is selected (or the version is read-only).
 */
export function EditorTaskBar({
  selectedCount,
  clipboardCount,
  disabled = false,
  onAddTask,
  onAddMilestone,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onCopy,
  onPaste,
  onIndent,
  onOutdent,
  onRenumber,
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

      <Button variant="ghost" size="sm" disabled={blocked || noSelection} onClick={onCopy}>
        <Copy className="h-4 w-4" /> Копировать
      </Button>
      <Button variant="ghost" size="sm" disabled={blocked || clipboardCount === 0} onClick={onPaste}>
        <ClipboardPaste className="h-4 w-4" /> Вставить
      </Button>
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

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Button variant="ghost" size="sm" disabled={blocked || noSelection} onClick={onOutdent}>
        <IndentDecrease className="h-4 w-4" /> ←
      </Button>
      <Button variant="ghost" size="sm" disabled={blocked || noSelection} onClick={onIndent}>
        <IndentIncrease className="h-4 w-4" /> →
      </Button>
      <Button variant="ghost" size="sm" disabled={blocked} onClick={onRenumber}>
        <ListOrdered className="h-4 w-4" /> Нумерация
      </Button>

      {selectedCount > 0 && (
        <span className="ml-auto text-xs text-muted-foreground">
          Выбрано: {selectedCount}
        </span>
      )}
    </div>
  );
}
