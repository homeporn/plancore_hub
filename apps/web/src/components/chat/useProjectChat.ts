'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listChatMessages,
  sendChatMessage,
  deleteChatMessage,
  listProjectMembers,
  uploadChatImage,
  chatRowToMessage,
  type ChatMessage,
  type ChatAttachments,
} from '@plancore/data';
import { getBrowserClient } from '@/lib/supabase/browser';
import { useAuth } from '@/lib/useAuth';

export interface ChatApi {
  messages: ChatMessage[];
  /** author_id → display email (resolved from project members). */
  authorEmail: (id: string) => string;
  loading: boolean;
  send: (body: string, attachments?: ChatAttachments) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
  remove: (id: string) => Promise<void>;
  selfId: string | null;
}

/** Project chat: initial load + realtime inserts/updates + send. */
export function useProjectChat(projectId: string | null): ChatApi {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const emailsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!projectId) { setMessages([]); setLoading(false); return; }
    const client = getBrowserClient();
    let active = true;
    setLoading(true);

    // Resolve member emails for author display, then load history.
    Promise.all([
      listProjectMembers(client, projectId).catch(() => []),
      listChatMessages(client, projectId).catch(() => []),
    ]).then(([members, history]) => {
      if (!active) return;
      emailsRef.current = new Map(members.map((m) => [m.userId, m.email]));
      setMessages(history);
      setLoading(false);
    });

    // Realtime: new + edited/deleted messages for this project.
    const channel = client
      .channel(`chat:${projectId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `project_id=eq.${projectId}` },
        (payload: { new: Record<string, unknown> }) => {
          const msg = chatRowToMessage(payload.new as never);
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `project_id=eq.${projectId}` },
        (payload: { new: Record<string, unknown> }) => {
          const msg = chatRowToMessage(payload.new as never);
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        },
      )
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [projectId]);

  const send = useCallback(async (body: string, attachments: ChatAttachments = {}) => {
    const text = body.trim();
    const hasAttachment = !!attachments.imageUrl || !!attachments.taskRefId;
    if (!projectId || !user || (!text && !hasAttachment)) return;
    // The realtime INSERT echo appends the message to the list.
    await sendChatMessage(getBrowserClient(), projectId, user.id, text, attachments);
  }, [projectId, user]);

  const uploadImage = useCallback(async (file: File) => {
    if (!projectId) throw new Error('Нет проекта');
    return uploadChatImage(getBrowserClient(), projectId, file);
  }, [projectId]);

  const remove = useCallback(async (id: string) => {
    await deleteChatMessage(getBrowserClient(), id);
  }, []);

  const authorEmail = useCallback(
    (id: string) => emailsRef.current.get(id) ?? 'участник',
    [],
  );

  return { messages, authorEmail, loading, send, uploadImage, remove, selfId: user?.id ?? null };
}
