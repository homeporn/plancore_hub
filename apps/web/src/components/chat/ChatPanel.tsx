'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useProjectChat } from './useProjectChat';

interface Props {
  projectId: string;
  projectName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Per-project chat for project members. Realtime, soft-delete own/managed. */
export function ChatPanel({ projectId, projectName, open, onOpenChange }: Props) {
  const { messages, authorEmail, loading, send, remove, selfId } = useProjectChat(open ? projectId : null);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message.
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function submit() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await send(text);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-lg flex-col">
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
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-1.5 text-sm ${
                    deleted
                      ? 'italic text-muted-foreground'
                      : mine
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card'
                  }`}
                >
                  {deleted ? 'сообщение удалено' : m.body}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={2}
            placeholder="Сообщение… (Enter — отправить, Shift+Enter — перенос строки)"
            className="resize-none"
          />
          <Button size="icon" disabled={!draft.trim()} onClick={() => void submit()} title="Отправить">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
