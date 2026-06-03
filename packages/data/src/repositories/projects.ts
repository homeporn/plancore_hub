import type { ScheduleRow } from '@plancore/core';
import type { PlancoreClient } from '../supabase/client.js';
import { versionTaskToScheduleRow } from '../mappers/scheduleVersionTask.js';

export interface ProjectSummary {
  id: string;
  name: string;
}

/** Project with display metadata and computed schedule bounds for the Hub. */
export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  status: string;
  stage: string;
  objectType: string;
  organizationId: string | null;
  statusDate: string | null;
  createdAt: string;
  /** Earliest planned start across the current schedule version (ISO date). */
  startDate: string | null;
  /** Latest planned finish across the current schedule version (ISO date). */
  finishDate: string | null;
  /** Number of task rows in the current schedule version. */
  taskCount: number;
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

/** Compute schedule bounds (min start / max finish / count) for one version. */
async function versionBounds(
  client: PlancoreClient,
  scheduleVersionId: string,
): Promise<{ startDate: string | null; finishDate: string | null; taskCount: number }> {
  const { data, error } = await client
    .from('project_schedule_version_tasks')
    .select('planned_start, planned_finish')
    .eq('schedule_version_id', scheduleVersionId);
  if (error) throw error;

  let startDate: string | null = null;
  let finishDate: string | null = null;
  for (const t of data ?? []) {
    if (t.planned_start && (!startDate || t.planned_start < startDate)) startDate = t.planned_start;
    if (t.planned_finish && (!finishDate || t.planned_finish > finishDate)) finishDate = t.planned_finish;
  }
  return { startDate, finishDate, taskCount: (data ?? []).length };
}

/**
 * List the signed-in user's projects with display metadata and computed
 * schedule bounds (from each project's current schedule version). Powers the
 * Hub. Projects without a current version report null bounds / zero tasks.
 */
export async function listProjectsWithMeta(
  client: PlancoreClient,
  userId: string,
): Promise<ProjectMeta[]> {
  const { data: memberships, error } = await client
    .from('project_members')
    .select(
      'project_id, projects!inner(id, name, description, status, stage, object_type, organization_id, project_status_date, created_at)',
    )
    .eq('user_id', userId);
  if (error) throw error;

  const projects = (memberships ?? [])
    .map((row) => row.projects)
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  // Resolve current version per project, then its bounds, in parallel.
  return Promise.all(
    projects.map(async (p): Promise<ProjectMeta> => {
      const base: ProjectMeta = {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        stage: p.stage,
        objectType: p.object_type,
        organizationId: p.organization_id,
        statusDate: p.project_status_date,
        createdAt: p.created_at,
        startDate: null,
        finishDate: null,
        taskCount: 0,
      };

      const { data: version, error: vErr } = await client
        .from('project_schedule_versions')
        .select('id')
        .eq('project_id', p.id)
        .eq('is_current', true)
        .maybeSingle();
      if (vErr) throw vErr;
      if (!version) return base;

      const bounds = await versionBounds(client, version.id);
      return { ...base, ...bounds };
    }),
  );
}

/** Load a single project's display metadata (without schedule bounds). */
export async function getProject(
  client: PlancoreClient,
  projectId: string,
): Promise<ProjectMeta | null> {
  const { data: p, error } = await client
    .from('projects')
    .select(
      'id, name, description, status, stage, object_type, organization_id, project_status_date, created_at',
    )
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  if (!p) return null;

  const base: ProjectMeta = {
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    stage: p.stage,
    objectType: p.object_type,
    organizationId: p.organization_id,
    statusDate: p.project_status_date,
    createdAt: p.created_at,
    startDate: null,
    finishDate: null,
    taskCount: 0,
  };

  const { data: version, error: vErr } = await client
    .from('project_schedule_versions')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_current', true)
    .maybeSingle();
  if (vErr) throw vErr;
  if (!version) return base;

  return { ...base, ...(await versionBounds(client, version.id)) };
}

/** Create a project via the `create_project` RPC (also adds the owner member). */
export async function createProject(
  client: PlancoreClient,
  name: string,
): Promise<ProjectSummary> {
  const { data, error } = await client.rpc('create_project', { p_name: name });
  if (error) throw error;
  const project = Array.isArray(data) ? data[0] : data;
  if (!project) throw new Error('create_project не вернул проект');
  return { id: project.id, name: project.name };
}
