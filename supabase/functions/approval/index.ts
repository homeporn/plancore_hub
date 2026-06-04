// Schedule version approval orchestrator Edge Function.
//
// The single authoritative entry point for *transitioning* a schedule version
// through the approval workflow. It:
//   1. authenticates the caller (JWT from the Authorization header),
//   2. resolves the caller's approval role from project_team / version author,
//   3. validates the requested action against the current status (shared state
//      machine in ./workflow.ts),
//   4. on approval, freezes a baseline snapshot from the version's tasks,
//   5. persists the new status on the version and appends a version_approvals
//      audit row.
//
// Reads stay on the client under RLS; only transitions go here so the state
// machine, baseline freeze and audit trail are enforced in one place.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  applyApproval,
  ApprovalError,
  canApprove,
  type ApprovalAction,
  type ApprovalRole,
  type ApprovalStatus,
} from './workflow.ts';

interface RequestBody {
  scheduleVersionId: string;
  action: ApprovalAction;
  comment?: string;
}

// project_team.role values that grant approver rights (ГИП and equivalents).
const APPROVER_ROLES = ['гип', 'главный инженер', 'руководитель', 'approver', 'lead', 'owner'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);
  const userId = userData.user.id;

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.scheduleVersionId || !body.action) {
    return json({ error: 'scheduleVersionId and action are required' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Load the version (status, project, author).
  const { data: version, error: loadError } = await admin
    .from('project_schedule_versions')
    .select('id, project_id, approval_status, created_by')
    .eq('id', body.scheduleVersionId)
    .maybeSingle();
  if (loadError) return json({ error: loadError.message }, 500);
  if (!version) return json({ error: 'Schedule version not found' }, 404);

  // Caller must be a project member.
  const { data: membership, error: memberError } = await admin
    .from('project_members')
    .select('user_id')
    .eq('project_id', version.project_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (memberError) return json({ error: memberError.message }, 500);
  if (!membership) return json({ error: 'Forbidden: not a project member' }, 403);

  // Resolve the caller's approval capabilities.
  const isAuthor = version.created_by === userId;
  const { data: teamRows, error: teamError } = await admin
    .from('project_team')
    .select('role')
    .eq('project_id', version.project_id)
    .eq('user_id', userId);
  if (teamError) return json({ error: teamError.message }, 500);
  const isApprover = (teamRows ?? []).some((r) =>
    APPROVER_ROLES.some((needle) => (r.role ?? '').toLowerCase().includes(needle)),
  );

  const fromStatus = version.approval_status as ApprovalStatus;
  // Pick the strongest role that permits the action (a ГИП may also be author).
  const candidates: ApprovalRole[] = [];
  if (isApprover) candidates.push('approver');
  if (isAuthor) candidates.push('author');
  candidates.push('viewer');
  const role = candidates.find((r) => canApprove(fromStatus, body.action, r));
  if (!role) {
    return json({ error: 'Forbidden: your role cannot perform this action' }, 403);
  }

  let transition;
  try {
    transition = applyApproval(fromStatus, body.action, role);
  } catch (e) {
    if (e instanceof ApprovalError) return json({ error: e.message }, 422);
    throw e;
  }

  // On approval, freeze a baseline snapshot from the version's tasks.
  let baselineId: string | null = null;
  if (transition.freezeBaseline) {
    const { data: snapshot, error: snapErr } = await admin
      .from('baseline_snapshots')
      .insert({
        project_id: version.project_id,
        name: 'Утверждённый план',
        baseline_type: 'approved',
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (snapErr) return json({ error: snapErr.message }, 500);
    baselineId = snapshot.id;

    const { data: tasks, error: tasksErr } = await admin
      .from('project_schedule_version_tasks')
      .select(
        'id, task_row_id, wbs_code, name, planned_start, planned_finish, planned_duration, work, responsible, department',
      )
      .eq('schedule_version_id', body.scheduleVersionId);
    if (tasksErr) return json({ error: tasksErr.message }, 500);

    const rows = (tasks ?? []).map((t) => ({
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
      const { error: insErr } = await admin.from('baseline_tasks').insert(rows);
      if (insErr) return json({ error: insErr.message }, 500);
    }
  }

  // Persist new status on the version.
  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = { approval_status: transition.status };
  if (body.action === 'submit') {
    patch.submitted_at = nowIso;
    patch.submitted_by = userId;
  }
  if (body.action === 'approve') {
    patch.approved_at = nowIso;
    patch.approved_by = userId;
    patch.baseline_id = baselineId;
  }
  const { error: updateError } = await admin
    .from('project_schedule_versions')
    .update(patch)
    .eq('id', body.scheduleVersionId);
  if (updateError) return json({ error: updateError.message }, 500);

  // Append the audit row.
  const { error: recError } = await admin.from('version_approvals').insert({
    schedule_version_id: body.scheduleVersionId,
    action: body.action,
    from_status: fromStatus,
    to_status: transition.status,
    actor_role: role,
    actor_user_id: userId,
    comment: body.comment ?? '',
  });
  if (recError) return json({ error: recError.message }, 500);

  return json({ status: transition.status, baselineId, role });
});
