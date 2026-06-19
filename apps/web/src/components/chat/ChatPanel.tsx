'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, Send, ImagePlus, Link2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useProjectChat } from './useProjectChat';

export interface TaskRef {
  id: string;
  label: string;
}

interface Props {
  projectId: string;
  projectName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tasks of the open schedule, for linking a message to a task. */
  tasks?: TaskRef[];
  /** Select/scroll to a task in the editor when its chat link is clicked. */
  onOpenTask?: (taskId: string) => void;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Per-project chat: text, screenshots and links to schedule tasks. Realtime. */
export function ChatPanel({ projectId, projectName, open, onOpenChange, tasks = [], onOpenTask }: Props) {
  const { messages, authorEmail, loading, send, uploadImage, remove, selfId } =
    useProjectChat(open ? projectId : null);
  const [draft, setDraft] = useState('');
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [taskRef, setTaskRef] = useState<TaskRef | null>(null);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [taskQuery, setTaskQuery] = useState('');
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const previewUrl = useMemo(
    () => (pendingImage ? URL.createObjectURL(pendingImage) : null),
    [pendingImage],
  );
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const filteredTasks = useMemo(() => {
    const q = taskQuery.trim().toLowerCase();
    const list = q ? tasks.filter((t) => t.label.toLowerCase().includes(q)) : tasks;
    return list.slice(0, 50);
  }, [tasks, taskQuery]);

  function pickImage(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Можно прикрепить только изображение');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Скриншот больше 10 МБ');
      return;
    }
    setPendingImage(file);
  }

  async function submit() {
    const text = draft.trim();
    if (!text && !pendingImage && !taskRef) return;
    setSending(true);
    try {
      let imageUrl: string | null = null;
      if (pendingImage) imageUrl = await uploadImage(pendingImage);
      await send(text, {
        imageUrl,
        taskRefId: taskRef?.id ?? null,
        taskRefLabel: taskRef?.label ?? null,
      });
      setDraft('');
      setPendingImage(null);
      setTaskRef(null);
    } catch (e) {
      toast.error('Не удалось отправить', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle>Чат проекта{projectName ? ` · ${projectName}` : ''}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-md border bg-muted/30 p-3">
          {loading && <p className="text-sm text-muted-foreground">Загрузка…</p>}
          {!loading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Сообщений пока нет. Напишите первое.</p>
          )}
          {messages.map((m) => {
            const mine = m.authorId === selfId;
            const deleted = !!m.deletedAt;
            return (
              <div key={m.id} className={`group flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <div className="mb-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-medium">{mine ? 'Вы' : authorEmail(m.authorId)}</span>
                  <span>{fmtTime(m.createdAt)}</span>
                  {!deleted && mine && (
                    <button
                      type="button"
                      onClick={() => void remove(m.id)}
                      className="opacity-0 transition group-hover:opacity-100"
                      title="Удалить"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div
                  className={`flex max-w-[85%] flex-col gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                    deleted
                      ? 'italic text-muted-foreground'
                      : mine
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card'
                  }`}
                >
                  {deleted ? (
                    'сообщение удалено'
                  ) : (
                    <>
                      {m.taskRefId && (
                        <button
                          type="button"
                          onClick={() => { onOpenTask?.(m.taskRefId!); onOpenChange(false); }}
                          className={`flex items-center gap-1 self-start rounded px-1.5 py-0.5 text-xs underline-offset-2 hover:underline ${
                            mine ? 'bg-primary-foreground/15' : 'bg-muted'
                          }`}
                          title="Открыть задачу в графике"
                        >
                          <Link2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{m.taskRefLabel || 'Задача'}</span>
                        </button>
                      )}
                      {m.imageUrl && (
                        <a href={m.imageUrl} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.imageUrl}
                            alt="скриншот"
                            className="max-h-60 rounded border object-contain"
                          />
                        </a>
                      )}
                      {m.body && <span className="whitespace-pre-wrap break-words">{m.body}</span>}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Pending attachments preview */}
        {(pendingImage || taskRef) && (
          <div className="flex flex-wrap items-center gap-2">
            {taskRef && (
              <span className="flex items-center gap-1 rounded border bg-muted px-2 py-1 text-xs">
                <Link2 className="h-3 w-3" /> {taskRef.label}
                <button type="button" onClick={() => setTaskRef(null)} title="Убрать ссылку">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {previewUrl && (
              <span className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="превью" className="h-14 w-14 rounded border object-cover" />
                <button
                  type="button"
                  onClick={() => setPendingImage(null)}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-background shadow"
                  title="Убрать скриншот"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Task picker */}
        {taskPickerOpen && (
          <div className="rounded-md border p-2">
            <Input
              autoFocus
              value={taskQuery}
              onChange={(e) => setTaskQuery(e.target.value)}
              placeholder="Поиск задачи…"
              className="mb-2"
            />
            <div className="max-h-40 space-y-0.5 overflow-y-auto">
              {filteredTasks.length === 0 && (
                <p className="px-1 text-xs text-muted-foreground">Задачи не найдены.</p>
              )}
              {filteredTasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setTaskRef(t); setTaskPickerOpen(false); setTaskQuery(''); }}
                  className="block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-accent"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end gap-1.5">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ''; }}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileRef.current?.click()}
            title="Прикрепить скриншот"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={tasks.length === 0}
            onClick={() => setTaskPickerOpen((v) => !v)}
            title={tasks.length === 0 ? 'Нет открытого графика с задачами' : 'Ссылка на задачу'}
          >
            <Link2 className="h-4 w-4" />
          </Button>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={(e) => {
              const img = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
              if (img) pickImage(img.getAsFile());
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={2}
            placeholder="Сообщение… (Enter — отправить, можно вставить скриншот из буфера)"
            className="resize-none"
          />
          <Button
            size="icon"
            disabled={sending || (!draft.trim() && !pendingImage && !taskRef)}
            onClick={() => void submit()}
            title="Отправить"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
