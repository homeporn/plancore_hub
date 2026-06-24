'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listChatMessages,
  sendChatMessage,
  deleteChatMessage,
  listChannelMembers,
  listMyChannels,
  uploadChatImage,
  chatRowToMessage,
  type ChatMessage,
  type ChatAttachments,
  type ChatChannel,
} from '@plancore/data';
import { getBrowserClient } from '@/lib/supabase/browser';
import { useAuth } from '@/lib/useAuth';

export interface ChatApi {
  messages: ChatMessage[];
  /** author_id → display email (resolved from channel/project members). */
  authorEmail: (id: string) => string;
  loading: boolean;
  send: (body: string, attachments?: ChatAttachments) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
  remove: (id: string) => Promise<void>;
  selfId: string | null;
}

/** Messages of a single channel: initial load + realtime + send. */
export function useChat(channelId: string | null): ChatApi {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const emailsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!channelId) { setMessages([]); setLoading(false); return; }
    const client = getBrowserClient();
    let active = true;
    setLoading(true);

    Promise.all([
      listChannelMembers(client, channelId).catch(() => []),
      listChatMessages(client, channelId).catch(() => []),
    ]).then(([members, history]) => {
      if (!active) return;
      emailsRef.current = new Map(members.map((m) => [m.userId, m.email]));
      setMessages(history);
      setLoading(false);
    });

    const channel = client
      .channel(`chat:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
        (payload: { new: Record<string, unknown> }) => {
          const msg = chatRowToMessage(payload.new as never);
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
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
  }, [channelId]);

  const send = useCallback(async (body: string, attachments: ChatAttachments = {}) => {
    const text = body.trim();
    const hasAttachment = !!attachments.imageUrl || !!attachments.taskRefId;
    if (!channelId || !user || (!text && !hasAttachment)) return;
    await sendChatMessage(getBrowserClient(), channelId, user.id, text, attachments);
  }, [channelId, user]);

  const uploadImage = useCallback(async (file: File) => {
    if (!channelId) throw new Error('Нет канала');
    return uploadChatImage(getBrowserClient(), channelId, file);
  }, [channelId]);

  const remove = useCallback(async (id: string) => {
    await deleteChatMessage(getBrowserClient(), id);
  }, []);

  const authorEmail = useCallback(
    (id: string) => emailsRef.current.get(id) ?? 'участник',
    [],
  );

  return { messages, authorEmail, loading, send, uploadImage, remove, selfId: user?.id ?? null };
}

/** List of channels the user can access; `reload` re-fetches after changes. */
export function useMyChannels(enabled: boolean): { channels: ChatChannel[]; loading: boolean; reload: () => void } {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    listMyChannels(getBrowserClient())
      .then(setChannels)
      .catch(() => setChannels([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    reload();
  }, [enabled, reload]);

  return { channels, loading, reload };
}
