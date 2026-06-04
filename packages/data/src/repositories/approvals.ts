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
    .select('id, wbs_code, name, planned_start, planned_finish, planned_duration, work, responsible, department')
    .eq('schedule_version_id', scheduleVersionId);
  if (tasksErr) throw tasksErr;

  const rows: BaselineTaskInsert[] = (tasks ?? []).map((t) => ({
    baseline_id: baselineId,
    task_id: t.id,
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
