import type { ScheduleRow } from '@plancore/core';
import type { PlancoreClient } from '../supabase/client.js';
import { versionTaskToScheduleRow } from '../mappers/scheduleVersionTask.js';

export interface ProjectSummary {
  id: string;
  name: string;
}

/** Projects the current authenticated user is a member of. */
export async function listMemberProjects(
  client: PlancoreClient,
  userId: string,
): Promise<ProjectSummary[]> {
  const { data, error } = await client
    .from('project_members')
    .select('project_id, projects!inner(id, name)')
    .eq('user_id', userId);

  if (error) throw error;

  return (data ?? [])
    .map((row) => row.projects)
    .filter((p): p is { id: string; name: string } => Boolean(p))
    .map((p) => ({ id: p.id, name: p.name }));
}

/**
 * Load the rows of a project's current schedule version as canonical
 * ScheduleRow[], ordered by sort_order. Returns [] if no current version.
 */
export async function loadCurrentScheduleRows(
  client: PlancoreClient,
  projectId: string,
): Promise<ScheduleRow[]> {
  const { data: version, error: versionError } = await client
    .from('project_schedule_versions')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_current', true)
    .maybeSingle();

  if (versionError) throw versionError;
  if (!version) return [];

  const { data: tasks, error: tasksError } = await client
    .from('project_schedule_version_tasks')
    .select('*')
    .eq('schedule_version_id', version.id)
    .order('sort_order', { ascending: true });

  if (tasksError) throw tasksError;

  return (tasks ?? []).map(versionTaskToScheduleRow);
}
