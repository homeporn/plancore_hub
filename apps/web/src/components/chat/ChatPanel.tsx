'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, Send, ImagePlus, Link2, X, Plus, Hash, Folder, MessageSquarePlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  ensureProjectChannel,
  createChatChannel,
  type ChatChannel,
} from '@plancore/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { getBrowserClient } from '@/lib/supabase/browser';
import { useChat, useMyChannels } from './useProjectChat';

export interface TaskRef {
  id: string;
  label: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When opened from a project, its chat channel is selected by default. */
  initialProjectId?: string | null;
  /** Tasks of the open schedule, for linking a message to a task. */
  tasks?: TaskRef[];
  /** Select/scroll to a task in the editor when its chat link is clicked. */
  onOpenTask?: (taskId: string) => void;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Multi-channel project chat: pick a project/standalone channel, then converse. */
export function ChatPanel({ open, onOpenChange, initialProjectId, tasks = [], onOpenTask }: Props) {
  const { channels, loading: channelsLoading, reload } = useMyChannels(open);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeChannel = channels.find((c) => c.channelId === activeId) ?? null;
  const isProjectChannel = !!activeChannel?.isProject && activeChannel.projectId === initialProjectId;

  const { messages, authorEmail, loading, send, uploadImage, remove, selfId } =
    useChat(open ? activeId : null);

  const [draft, setDraft] = useState('');
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [taskRef, setTaskRef] = useState<TaskRef | null>(null);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [taskQuery, setTaskQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newEmails, setNewEmails] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Resolve the default channel when the panel opens.
  useEffect(() => {
    if (!open) return;
    let active = true;
    if (initialProjectId) {
      ensureProjectChannel(getBrowserClient(), initialProjectId)
        .then((id) => { if (active) { setActiveId(id); reload(); } })
        .catch(() => { /* fall through to list selection */ });
    }
    return () => { active = false; };
  }, [open, initialProjectId, reload]);

  // If nothing selected yet, pick the first available channel.
  useEffect(() => {
    if (open && !activeId && channels.length > 0) setActiveId(channels[0].channelId);
  }, [open, activeId, channels]);

  const previewUrl = useMemo(
    () => (pendingImage ? URL.createObjectURL(pendingImage) : null),
    [pendingImage],
  );
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Reset the composer when switching channels.
  useEffect(() => { setDraft(''); setPendingImage(null); setTaskRef(null); setTaskPickerOpen(false); }, [activeId]);

  const filteredTasks = useMemo(() => {
    const q = taskQuery.trim().toLowerCase();
    const list = q ? tasks.filter((t) => t.label.toLowerCase().includes(q)) : tasks;
    return list.slice(0, 50);
  }, [tasks, taskQuery]);

  function pickImage(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Можно прикрепить только изображение'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Скриншот больше 10 МБ'); return; }
    setPendingImage(file);
  }

  async function submit() {
    const text = draft.trim();
    if (!activeId || (!text && !pendingImage && !taskRef)) return;
    setSending(true);
    try {
      let imageUrl: string | null = null;
      if (pendingImage) imageUrl = await uploadImage(pendingImage);
      await send(text, { imageUrl, taskRefId: taskRef?.id ?? null, taskRefLabel: taskRef?.label ?? null });
      setDraft(''); setPendingImage(null); setTaskRef(null);
    } catch (e) {
      toast.error('Не удалось отправить', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSending(false);
    }
  }

  async function createChannel() {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const emails = newEmails.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
      const id = await createChatChannel(getBrowserClient(), title, emails);
      toast.success('Чат создан', { description: title });
      setNewTitle(''); setNewEmails(''); setCreating(false);
      reload();
      setActiveId(id);
    } catch (e) {
      toast.error('Не удалось создать чат', { description: e instanceof Error ? e.message : undefined });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-3xl gap-0 p-0">
        {/* Channel sidebar */}
        <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/30">
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <span className="text-sm font-semibold">Чаты</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCreating((v) => !v)}
              title="Новый чат без проекта"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {creating && (
            <div className="space-y-1.5 border-b p-2">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Название чата" className="h-8" />
              <Input value={newEmails} onChange={(e) => setNewEmails(e.target.value)} placeholder="email через запятую" className="h-8" />
              <Button size="sm" className="w-full" disabled={!newTitle.trim()} onClick={() => void createChannel()}>
                <MessageSquarePlus className="h-4 w-4" /> Создать
              </Button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {channelsLoading && <p className="px-2 py-1 text-xs text-muted-foreground">Загрузка…</p>}
            {!channelsLoading && channels.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">Нет доступных чатов.</p>
            )}
            {channels.map((c: ChatChannel) => (
              <button
                key={c.channelId}
                type="button"
                onClick={() => setActiveId(c.channelId)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                  c.channelId === activeId ? 'bg-accent font-medium' : 'hover:bg-accent/50'
                }`}
                title={c.title}
              >
                {c.isProject ? <Folder className="h-3.5 w-3.5 shrink-0 opacity-70" /> : <Hash className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                <span className="truncate">{c.title}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Conversation */}
        <div className="flex min-w-0 flex-1 flex-col p-4">
          <DialogHeader className="mb-2">
            <DialogTitle className="truncate">
              {activeChannel ? activeChannel.title : 'Чат'}
              {activeChannel && !activeChannel.isProject && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">общий чат</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-md border bg-muted/30 p-3">
            {!activeId && <p className="text-sm text-muted-foreground">Выберите чат слева.</p>}
            {activeId && loading && <p className="text-sm text-muted-foreground">Загрузка…</p>}
            {activeId && !loading && messages.length === 0 && (
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
                      <button type="button" onClick={() => void remove(m.id)} className="opacity-0 transition group-hover:opacity-100" title="Удалить">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div
                    className={`flex max-w-[85%] flex-col gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                      deleted ? 'italic text-muted-foreground' : mine ? 'bg-primary text-primary-foreground' : 'bg-card'
                    }`}
                  >
                    {deleted ? 'сообщение удалено' : (
                      <>
                        {m.taskRefId && (
                          <button
                            type="button"
                            onClick={() => { onOpenTask?.(m.taskRefId!); onOpenChange(false); }}
                            disabled={!onOpenTask}
                            className={`flex items-center gap-1 self-start rounded px-1.5 py-0.5 text-xs underline-offset-2 enabled:hover:underline disabled:opacity-70 ${
                              mine ? 'bg-primary-foreground/15' : 'bg-muted'
                            }`}
                            title={onOpenTask ? 'Открыть задачу в графике' : 'Откройте этот проект, чтобы перейти к задаче'}
                          >
                            <Link2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{m.taskRefLabel || 'Задача'}</span>
                          </button>
                        )}
                        {m.imageUrl && (
                          <a href={m.imageUrl} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m.imageUrl} alt="скриншот" className="max-h-60 rounded border object-contain" />
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {taskRef && (
                <span className="flex items-center gap-1 rounded border bg-muted px-2 py-1 text-xs">
                  <Link2 className="h-3 w-3" /> {taskRef.label}
                  <button type="button" onClick={() => setTaskRef(null)} title="Убрать ссылку"><X className="h-3 w-3" /></button>
                </span>
              )}
              {previewUrl && (
                <span className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="превью" className="h-14 w-14 rounded border object-cover" />
                  <button type="button" onClick={() => setPendingImage(null)} className="absolute -right-1.5 -top-1.5 rounded-full bg-background shadow" title="Убрать скриншот">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Task picker */}
          {taskPickerOpen && (
            <div className="mt-2 rounded-md border p-2">
              <Input autoFocus value={taskQuery} onChange={(e) => setTaskQuery(e.target.value)} placeholder="Поиск задачи…" className="mb-2" />
              <div className="max-h-40 space-y-0.5 overflow-y-auto">
                {filteredTasks.length === 0 && <p className="px-1 text-xs text-muted-foreground">Задачи не найдены.</p>}
                {filteredTasks.map((t) => (
                  <button key={t.id} type="button" onClick={() => { setTaskRef(t); setTaskPickerOpen(false); setTaskQuery(''); }} className="block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-accent">
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2 flex items-end gap-1.5">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ''; }} />
            <Button variant="outline" size="icon" disabled={!activeId} onClick={() => fileRef.current?.click()} title="Прикрепить скриншот">
              <ImagePlus className="h-4 w-4" />
            </Button>
            {isProjectChannel && (
              <Button variant="outline" size="icon" disabled={tasks.length === 0} onClick={() => setTaskPickerOpen((v) => !v)} title={tasks.length === 0 ? 'Нет задач в открытом графике' : 'Ссылка на задачу'}>
                <Link2 className="h-4 w-4" />
              </Button>
            )}
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPaste={(e) => {
                const img = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
                if (img) pickImage(img.getAsFile());
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(); } }}
              rows={2}
              disabled={!activeId}
              placeholder="Сообщение… (Enter — отправить, можно вставить скриншот из буфера)"
              className="resize-none"
            />
            <Button size="icon" disabled={!activeId || sending || (!draft.trim() && !pendingImage && !taskRef)} onClick={() => void submit()} title="Отправить">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
