import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlancoreClient } from '../supabase/client.js';

/**
 * Per-project chat + role management.
 *
 * `chat_messages` and the role RPCs were added in the Wave I migration and are
 * not yet part of the generated `Database` types, so we access them through a
 * schema-agnostic client view. Public functions return explicit DTOs.
 */
function loose(client: PlancoreClient): SupabaseClient {
  return client as unknown as SupabaseClient;
}

// ── Roles ────────────────────────────────────────────────────────────────────

export type ProjectRole = 'owner' | 'admin' | 'planner' | 'viewer' | 'member';

export interface ProjectMember {
  userId: string;
  email: string;
  role: ProjectRole;
}

/** The signed-in user's role on a project (null if not a member). */
export async function getMyProjectRole(
  client: PlancoreClient,
  projectId: string,
  userId: string,
): Promise<ProjectRole | null> {
  const { data, error } = await client
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.role as ProjectRole | undefined) ?? null;
}

/** All members of a project with email + role (via SECURITY DEFINER RPC). */
export async function listProjectMembers(
  client: PlancoreClient,
  projectId: string,
): Promise<ProjectMember[]> {
  const { data, error } = await loose(client).rpc('list_project_members', { _project_id: projectId });
  if (error) throw error;
  return ((data ?? []) as { user_id: string; email: string; role: string }[]).map((r) => ({
    userId: r.user_id,
    email: r.email,
    role: r.role as ProjectRole,
  }));
}

export async function setMemberRole(
  client: PlancoreClient,
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<void> {
  const { error } = await loose(client).rpc('set_project_member_role', {
    _project_id: projectId,
    _user_id: userId,
    _role: role,
  });
  if (error) throw error;
}

export async function addMemberByEmail(
  client: PlancoreClient,
  projectId: string,
  email: string,
  role: ProjectRole,
): Promise<void> {
  const { error } = await loose(client).rpc('add_project_member', {
    _project_id: projectId,
    _email: email,
    _role: role,
  });
  if (error) throw error;
}

export async function removeMember(
  client: PlancoreClient,
  projectId: string,
  userId: string,
): Promise<void> {
  const { error } = await loose(client).rpc('remove_project_member', {
    _project_id: projectId,
    _user_id: userId,
  });
  if (error) throw error;
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  imageUrl: string | null;
  taskRefId: string | null;
  taskRefLabel: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

interface ChatRow {
  id: string;
  channel_id: string;
  author_id: string;
  body: string;
  image_url: string | null;
  task_ref_id: string | null;
  task_ref_label: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

export function chatRowToMessage(r: ChatRow): ChatMessage {
  return {
    id: r.id,
    channelId: r.channel_id,
    authorId: r.author_id,
    body: r.body,
    imageUrl: r.image_url,
    taskRefId: r.task_ref_id,
    taskRefLabel: r.task_ref_label,
    createdAt: r.created_at,
    editedAt: r.edited_at,
    deletedAt: r.deleted_at,
  };
}

export interface ChatAttachments {
  imageUrl?: string | null;
  taskRefId?: string | null;
  taskRefLabel?: string | null;
}

// ── Channels ───────────────────────────────────────────────────────────────

export interface ChatChannel {
  channelId: string;
  projectId: string | null;
  title: string;
  isProject: boolean;
  lastMessageAt: string | null;
  memberCount: number;
}

/** Channels the current user can access (project channels + standalone). */
export async function listMyChannels(client: PlancoreClient): Promise<ChatChannel[]> {
  const { data, error } = await loose(client).rpc('list_my_channels');
  if (error) throw error;
  return ((data ?? []) as {
    channel_id: string; project_id: string | null; title: string;
    is_project: boolean; last_message_at: string | null; member_count: number;
  }[]).map((r) => ({
    channelId: r.channel_id,
    projectId: r.project_id,
    title: r.title,
    isProject: r.is_project,
    lastMessageAt: r.last_message_at,
    memberCount: r.member_count,
  }));
}

/** Get (creating if needed) the chat channel bound to a project. */
export async function ensureProjectChannel(
  client: PlancoreClient,
  projectId: string,
): Promise<string> {
  const { data, error } = await loose(client).rpc('ensure_project_channel', { _project_id: projectId });
  if (error) throw error;
  return data as string;
}

/** Create a standalone (project-less) chat with optional members by email. */
export async function createChatChannel(
  client: PlancoreClient,
  title: string,
  memberEmails: string[] = [],
): Promise<string> {
  const { data, error } = await loose(client).rpc('create_chat_channel', {
    _title: title,
    _member_emails: memberEmails,
  });
  if (error) throw error;
  return data as string;
}

export async function listChannelMembers(
  client: PlancoreClient,
  channelId: string,
): Promise<{ userId: string; email: string }[]> {
  const { data, error } = await loose(client).rpc('list_channel_members', { _channel_id: channelId });
  if (error) throw error;
  return ((data ?? []) as { user_id: string; email: string }[]).map((r) => ({
    userId: r.user_id,
    email: r.email,
  }));
}

export async function addChannelMember(
  client: PlancoreClient,
  channelId: string,
  email: string,
): Promise<void> {
  const { error } = await loose(client).rpc('add_channel_member', { _channel_id: channelId, _email: email });
  if (error) throw error;
}

export async function removeChannelMember(
  client: PlancoreClient,
  channelId: string,
  userId: string,
): Promise<void> {
  const { error } = await loose(client).rpc('remove_channel_member', { _channel_id: channelId, _user_id: userId });
  if (error) throw error;
}

const CHAT_BUCKET = 'chat-attachments';

/**
 * Upload a screenshot to the chat bucket and return its public URL.
 * Path is `{channelId}/{uuid}.{ext}` so storage RLS can gate by channel access.
 */
export async function uploadChatImage(
  client: PlancoreClient,
  channelId: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${channelId}/${crypto.randomUUID()}.${ext}`;
  const storage = loose(client).storage.from(CHAT_BUCKET);
  const { error } = await storage.upload(path, file, {
    contentType: file.type || 'image/png',
    upsert: false,
  });
  if (error) throw error;
  return storage.getPublicUrl(path).data.publicUrl;
}

/** Load a channel's messages in chronological order (most recent last). */
export async function listChatMessages(
  client: PlancoreClient,
  channelId: string,
  limit = 200,
): Promise<ChatMessage[]> {
  const { data, error } = await loose(client)
    .from('chat_messages')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as ChatRow[]).map(chatRowToMessage).reverse();
}

export async function sendChatMessage(
  client: PlancoreClient,
  channelId: string,
  authorId: string,
  body: string,
  attachments: ChatAttachments = {},
): Promise<ChatMessage> {
  const { data, error } = await loose(client)
    .from('chat_messages')
    .insert({
      channel_id: channelId,
      author_id: authorId,
      body,
      image_url: attachments.imageUrl ?? null,
      task_ref_id: attachments.taskRefId ?? null,
      task_ref_label: attachments.taskRefLabel ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return chatRowToMessage(data as ChatRow);
}

/** Soft-delete a message (author or a manager). */
export async function deleteChatMessage(
  client: PlancoreClient,
  messageId: string,
): Promise<void> {
  const { error } = await loose(client)
    .from('chat_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}
