import {
  applyApproval,
  type ApprovalAction,
  type ApprovalRole,
  type ApprovalStatus,
} from '@plancore/core';
import type { PlancoreClient, Database } from '../supabase/client.js';

type ApprovalRow = Database['public']['Tables']['version_approvals']['Row'];
type BaselineTaskInsert = Database['public']['Tables']['baseline_tasks']['Insert'];

export interface ApprovalHistoryEntry {
  id: string;
  action: ApprovalAction;
  fromStatus: ApprovalStatus;
  toStatus: ApprovalStatus;
  actorRole: ApprovalRole;
  comment: string;
  decidedAt: string;
}

function rowToHistory(row: ApprovalRow): ApprovalHistoryEntry {
  return {
    id: row.id,
    action: row.action as ApprovalAction,
    fromStatus: row.from_status as ApprovalStatus,
    toStatus: row.to_status as ApprovalStatus,
    actorRole: row.actor_role as ApprovalRole,
    comment: row.comment,
    decidedAt: row.decided_at,
  };
}

export interface ScheduleVersionInfo {
  id: string;
  versionNumber: number;
  versionLabel: string;
  approvalStatus: ApprovalStatus;
  isCurrent: boolean;
  createdBy: string | null;
  baselineId: string | null;
}

// project_team.role values that grant approver rights (mirror Edge Function).
const APPROVER_ROLES = ['гип', 'главный инженер', 'руководитель', 'approver', 'lead', 'owner'];

/** The current schedule version of a project with its approval state, or null. */
export async function getCurrentScheduleVersion(
  client: PlancoreClient,
  projectId: string,
): Promise<ScheduleVersionInfo | null> {
  const { data, error } = await client
    .from('project_schedule_versions')
    .select('id, version_number, version_label, approval_status, is_current, created_by, baseline_id')
    .eq('project_id', projectId)
    .eq('is_current', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    versionNumber: data.version_number,
    versionLabel: data.version_label,
    approvalStatus: data.approval_status as ApprovalStatus,
    isCurrent: data.is_current,
    createdBy: data.created_by,
    baselineId: data.baseline_id,
  };
}

/**
 * Resolve a user's approval role for a project version: `author` when they
 * created the version, `approver` when a project_team role marks them ГИП/lead,
 * else `viewer`. Returns the strongest applicable role. Mirrors the Edge
 * Function so the UI enables exactly the actions the server will allow.
 */
export async function resolveApprovalRole(
  client: PlancoreClient,
  projectId: string,
  userId: string,
  versionCreatedBy: string | null,
): Promise<ApprovalRole> {
  const { data, error } = await client
    .from('project_team')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId);
  if (error) throw error;
  const isApprover = (data ?? []).some((r) =>
    APPROVER_ROLES.some((needle) => (r.role ?? '').toLowerCase().includes(needle)),
  );
  if (isApprover) return 'approver';
  if (versionCreatedBy && versionCreatedBy === userId) return 'author';
  return 'viewer';
}

/** Baseline tasks for variance comparison (shape expected by computeVariance). */
export async function loadBaselineTasks(
  client: PlancoreClient,
  baselineId: string,
): Promise<{ task_id: string; baseline_start: string | null; baseline_finish: string | null; baseline_duration: number | null }[]> {
  const { data, error } = await client
    .from('baseline_tasks')
    .select('task_id, baseline_start, baseline_finish, baseline_duration')
    .eq('baseline_id', baselineId);
  if (error) throw error;
  return data ?? [];
}

/** Approval decisions for a schedule version, newest first. */
export async function listApprovalHistory(
  client: PlancoreClient,
  scheduleVersionId: string,
): Promise<ApprovalHistoryEntry[]> {
  const { data, error } = await client
    .from('version_approvals')
    .select('*')
    .eq('schedule_version_id', scheduleVersionId)
    .order('decided_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToHistory);
}

/**
 * Freeze a baseline from the current tasks of a schedule version: create a
 * baseline_snapshots row and copy the version's tasks into baseline_tasks.
 * Returns the new baseline id.
 */
export async function freezeBaseline(
  client: PlancoreClient,
  scheduleVersionId: string,
  projectId: string,
  name = 'Утверждённый план',
): Promise<string> {
  const { data: snapshot, error: snapErr } = await client
    .from('baseline_snapshots')
    .insert({ project_id: projectId, name, baseline_type: 'approved', status: 'approved' })
    .select('id')
    .single();
  if (snapErr) throw snapErr;
  const baselineId = snapshot.id;

  const { data: tasks, error: tasksErr } = await client
    .from('project_schedule_version_tasks')
    .select('id, task_row_id, wbs_code, name, planned_start, planned_finish, planned_duration, work, responsible, department')
    .eq('schedule_version_id', scheduleVersionId);
  if (tasksErr) throw tasksErr;

  const rows: BaselineTaskInsert[] = (tasks ?? []).map((t) => ({
    baseline_id: baselineId,
    // Match ScheduleRow.row_id (= task_row_id ?? id) so computeVariance lines up.
    task_id: t.task_row_id ?? t.id,
    wbs_code: t.wbs_code,
    name: t.name,
    baseline_start: t.planned_start,
    baseline_finish: t.planned_finish,
    baseline_duration: t.planned_duration,
    baseline_work: t.work,
    responsible: t.responsible,
    department: t.department,
  }));
  if (rows.length > 0) {
    const { error: insErr } = await client.from('baseline_tasks').insert(rows);
    if (insErr) throw insErr;
  }
  return baselineId;
}

/**
 * Apply an approval action to a schedule version. Validates the transition and
 * role via the pure core automaton, persists the new status, records the
 * decision in version_approvals, and freezes a baseline on approval.
 *
 * Note: the Edge Function `approval` is the authoritative path (service role);
 * this client-side variant runs under RLS for project members.
 */
export async function decideApproval(
  client: PlancoreClient,
  params: {
    scheduleVersionId: string;
    projectId: string;
    action: ApprovalAction;
    role: ApprovalRole;
    comment?: string;
  },
): Promise<{ status: ApprovalStatus; baselineId: string | null }> {
  const { scheduleVersionId, projectId, action, role, comment = '' } = params;

  const { data: version, error: vErr } = await client
    .from('project_schedule_versions')
    .select('approval_status')
    .eq('id', scheduleVersionId)
    .single();
  if (vErr) throw vErr;

  const fromStatus = version.approval_status as ApprovalStatus;
  const transition = applyApproval({ status: fromStatus }, action, role);

  let baselineId: string | null = null;
  if (transition.freezeBaseline) {
    baselineId = await freezeBaseline(client, scheduleVersionId, projectId);
  }

  const nowIso = new Date().toISOString();
  const patch: Database['public']['Tables']['project_schedule_versions']['Update'] = {
    approval_status: transition.status,
  };
  if (action === 'submit') patch.submitted_at = nowIso;
  if (action === 'approve') {
    patch.approved_at = nowIso;
    patch.baseline_id = baselineId;
  }

  const { error: upErr } = await client
    .from('project_schedule_versions')
    .update(patch)
    .eq('id', scheduleVersionId);
  if (upErr) throw upErr;

  const { error: recErr } = await client.from('version_approvals').insert({
    schedule_version_id: scheduleVersionId,
    action,
    from_status: fromStatus,
    to_status: transition.status,
    actor_role: role,
    comment,
  });
  if (recErr) throw recErr;

  return { status: transition.status, baselineId };
}
