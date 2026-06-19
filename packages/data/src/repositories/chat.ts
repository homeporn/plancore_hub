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
  projectId: string;
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
  project_id: string;
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
    projectId: r.project_id,
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

const CHAT_BUCKET = 'chat-attachments';

/**
 * Upload a screenshot to the chat bucket and return its public URL.
 * Path is `{projectId}/{uuid}.{ext}` so storage RLS can gate by project.
 */
export async function uploadChatImage(
  client: PlancoreClient,
  projectId: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${projectId}/${crypto.randomUUID()}.${ext}`;
  const storage = loose(client).storage.from(CHAT_BUCKET);
  const { error } = await storage.upload(path, file, {
    contentType: file.type || 'image/png',
    upsert: false,
  });
  if (error) throw error;
  return storage.getPublicUrl(path).data.publicUrl;
}

/** Load a project's chat messages in chronological order (most recent last). */
export async function listChatMessages(
  client: PlancoreClient,
  projectId: string,
  limit = 200,
): Promise<ChatMessage[]> {
  const { data, error } = await loose(client)
    .from('chat_messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as ChatRow[]).map(chatRowToMessage).reverse();
}

export async function sendChatMessage(
  client: PlancoreClient,
  projectId: string,
  authorId: string,
  body: string,
  attachments: ChatAttachments = {},
): Promise<ChatMessage> {
  const { data, error } = await loose(client)
    .from('chat_messages')
    .insert({
      project_id: projectId,
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
