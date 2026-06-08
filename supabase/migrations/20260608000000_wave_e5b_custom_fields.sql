-- Wave E5b: user-defined custom columns for the schedule editor.
-- Custom column *definitions* live per project; their *values* live per task
-- row in a jsonb bag keyed by the column key.

-- 1. Per-task custom values.
alter table public.project_schedule_version_tasks
  add column if not exists custom jsonb not null default '{}'::jsonb;

-- 2. Per-project custom column definitions.
create table if not exists public.project_custom_columns (
  id uuid not null default gen_random_uuid() primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  key text not null,
  label text not null,
  col_type text not null default 'text',
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  unique (project_id, key)
);

alter table public.project_custom_columns enable row level security;

drop policy if exists project_custom_columns_select on public.project_custom_columns;
create policy project_custom_columns_select on public.project_custom_columns
  for select using (public.is_project_member(project_id));

drop policy if exists project_custom_columns_write on public.project_custom_columns;
create policy project_custom_columns_write on public.project_custom_columns
  for all using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- 3. Carry the custom bag through the atomic draft save.
create or replace function public.save_schedule_draft(
  _version_id uuid,
  _expected_revision integer,
  _tasks jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  _project_id uuid;
  _status text;
  _revision integer;
begin
  select project_id, approval_status, revision
    into _project_id, _status, _revision
  from public.project_schedule_versions
  where id = _version_id
  for update;

  if not found then
    raise exception 'Schedule version % not found', _version_id;
  end if;

  if not public.is_project_member(_project_id) then
    raise exception 'Forbidden: not a project member';
  end if;

  if _status not in ('draft', 'rejected') then
    return jsonb_build_object('outcome', 'locked', 'revision', _revision);
  end if;

  if _expected_revision is distinct from _revision then
    return jsonb_build_object('outcome', 'stale', 'revision', _revision);
  end if;

  delete from public.project_schedule_version_tasks
  where schedule_version_id = _version_id;

  insert into public.project_schedule_version_tasks (
    schedule_version_id, task_row_id, sort_order, wbs_code, name, row_type, stage,
    object_name, organization, department, responsible, predecessors_json,
    planned_start, planned_finish, planned_duration, percent_complete, task_status,
    actual_start, actual_finish, remaining_duration, work, actual_work,
    remaining_work, baseline_start, baseline_finish, handoff_status,
    handoff_to_department, volume_id, comment, custom
  )
  select
    _version_id, t.task_row_id, coalesce(t.sort_order, 0), coalesce(t.wbs_code, ''),
    coalesce(t.name, ''), coalesce(t.row_type, ''), coalesce(t.stage, ''),
    coalesce(t.object_name, ''), coalesce(t.organization, ''),
    coalesce(t.department, ''), coalesce(t.responsible, ''),
    coalesce(t.predecessors_json, '[]'::jsonb),
    t.planned_start, t.planned_finish, t.planned_duration, t.percent_complete,
    t.task_status, t.actual_start, t.actual_finish, t.remaining_duration, t.work,
    t.actual_work, t.remaining_work, t.baseline_start, t.baseline_finish,
    t.handoff_status, coalesce(t.handoff_to_department, ''), t.volume_id,
    coalesce(t.comment, ''), coalesce(t.custom, '{}'::jsonb)
  from jsonb_to_recordset(_tasks) as t(
    task_row_id uuid, sort_order integer, wbs_code text, name text, row_type text,
    stage text, object_name text, organization text, department text,
    responsible text, predecessors_json jsonb, planned_start date,
    planned_finish date, planned_duration integer, percent_complete numeric,
    task_status text, actual_start date, actual_finish date,
    remaining_duration integer, work numeric, actual_work numeric,
    remaining_work numeric, baseline_start date, baseline_finish date,
    handoff_status text, handoff_to_department text, volume_id uuid, comment text,
    custom jsonb
  );

  _revision := _revision + 1;
  update public.project_schedule_versions
    set revision = _revision, updated_at = now()
  where id = _version_id;

  return jsonb_build_object('outcome', 'saved', 'revision', _revision);
end;
$function$;
