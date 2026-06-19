-- Wave I: per-project chat + role-based access control.
--
-- Roles (stored in project_members.role):
--   owner   — владелец продукта: все опции (полный контроль проекта).
--   admin   — администратор: полный функционал + назначение ролей участникам.
--   planner — планировщик: правит существующие графики; не создаёт новые
--             версии графика и проекты, не назначает роли.
--   viewer  — наблюдатель: только просмотр + чат.
--   member  — устаревшая роль (совместимость): приравнена к редактору.
--
-- Capability helpers below are the single source of truth, reused by RLS.

-- ── Role helper functions ────────────────────────────────────────────────────
create or replace function public.project_role(_project_id uuid)
 returns text
 language sql stable security definer set search_path to 'public'
as $$
  select role from public.project_members
  where project_id = _project_id and user_id = auth.uid()
$$;

-- Can assign roles / manage members (owner, admin).
create or replace function public.can_manage_members(_project_id uuid)
 returns boolean
 language sql stable security definer set search_path to 'public'
as $$
  select public.project_role(_project_id) in ('owner', 'admin')
$$;

-- Can edit an existing schedule (owner, admin, planner, legacy member).
create or replace function public.can_edit_schedule(_project_id uuid)
 returns boolean
 language sql stable security definer set search_path to 'public'
as $$
  select public.project_role(_project_id) in ('owner', 'admin', 'planner', 'member')
$$;

-- ── Tighten project_members policies (role assignment = managers only) ────────
drop policy if exists "Members can add members" on public.project_members;
drop policy if exists "Members can remove members" on public.project_members;
drop policy if exists "Members can view members" on public.project_members;

create policy pm_select on public.project_members for select to authenticated
  using (is_project_member(project_id));
create policy pm_insert on public.project_members for insert to authenticated
  with check (can_manage_members(project_id));
create policy pm_update on public.project_members for update to authenticated
  using (can_manage_members(project_id));
create policy pm_delete on public.project_members for delete to authenticated
  using (can_manage_members(project_id));

-- ── Gate schedule version creation vs. editing ───────────────────────────────
-- New versions (graphs): owner/admin only. Editing existing: owner/admin/planner.
drop policy if exists "psv_i" on public.project_schedule_versions;
drop policy if exists "psv_u" on public.project_schedule_versions;
create policy psv_i on public.project_schedule_versions for insert to authenticated
  with check (can_manage_members(project_id));
create policy psv_u on public.project_schedule_versions for update to authenticated
  using (can_edit_schedule(project_id));

drop policy if exists "psvt_i" on public.project_schedule_version_tasks;
create policy psvt_i on public.project_schedule_version_tasks for insert to authenticated
  with check (exists (
    select 1 from public.project_schedule_versions psv
    where psv.id = project_schedule_version_tasks.schedule_version_id
      and can_edit_schedule(psv.project_id)
  ));

-- The atomic draft-save RPC must honour the edit capability (planner allowed,
-- viewer blocked).
create or replace function public.save_schedule_draft(
  _version_id uuid,
  _expected_revision integer,
  _tasks jsonb
)
returns jsonb
language plpgsql security definer set search_path to 'public'
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

  if not public.can_edit_schedule(_project_id) then
    raise exception 'Forbidden: no edit permission for this project';
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
    handoff_to_department, volume_id, comment
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
    t.handoff_status, coalesce(t.handoff_to_department, ''), t.volume_id, coalesce(t.comment, '')
  from jsonb_to_recordset(_tasks) as t(
    task_row_id uuid, sort_order integer, wbs_code text, name text, row_type text,
    stage text, object_name text, organization text, department text,
    responsible text, predecessors_json jsonb, planned_start date,
    planned_finish date, planned_duration integer, percent_complete numeric,
    task_status text, actual_start date, actual_finish date,
    remaining_duration integer, work numeric, actual_work numeric,
    remaining_work numeric, baseline_start date, baseline_finish date,
    handoff_status text, handoff_to_department text, volume_id uuid, comment text
  );

  _revision := _revision + 1;
  update public.project_schedule_versions
    set revision = _revision, updated_at = now()
  where id = _version_id;

  return jsonb_build_object('outcome', 'saved', 'revision', _revision);
end;
$function$;

-- ── Member management RPCs (email-based, managers only) ───────────────────────
create or replace function public.list_project_members(_project_id uuid)
 returns table(user_id uuid, email text, role text)
 language sql stable security definer set search_path to 'public', 'auth'
as $$
  select pm.user_id, u.email::text, pm.role
  from public.project_members pm
  join auth.users u on u.id = pm.user_id
  where pm.project_id = _project_id and public.is_project_member(_project_id)
  order by pm.role, u.email
$$;

create or replace function public.set_project_member_role(
  _project_id uuid, _user_id uuid, _role text
)
 returns void
 language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.can_manage_members(_project_id) then
    raise exception 'Forbidden: cannot manage members';
  end if;
  if _role not in ('owner', 'admin', 'planner', 'viewer', 'member') then
    raise exception 'Invalid role: %', _role;
  end if;
  update public.project_members set role = _role
  where project_id = _project_id and user_id = _user_id;
end;
$$;

create or replace function public.add_project_member(
  _project_id uuid, _email text, _role text
)
 returns void
 language plpgsql security definer set search_path to 'public', 'auth'
as $$
declare _uid uuid;
begin
  if not public.can_manage_members(_project_id) then
    raise exception 'Forbidden: cannot manage members';
  end if;
  if _role not in ('owner', 'admin', 'planner', 'viewer', 'member') then
    raise exception 'Invalid role: %', _role;
  end if;
  select id into _uid from auth.users where lower(email) = lower(_email);
  if _uid is null then
    raise exception 'Пользователь с email % не найден', _email;
  end if;
  insert into public.project_members(project_id, user_id, role)
  values (_project_id, _uid, _role)
  on conflict (project_id, user_id) do update set role = excluded.role;
end;
$$;

create or replace function public.remove_project_member(
  _project_id uuid, _user_id uuid
)
 returns void
 language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.can_manage_members(_project_id) then
    raise exception 'Forbidden: cannot manage members';
  end if;
  -- Never remove the last owner.
  if (select role from public.project_members
      where project_id = _project_id and user_id = _user_id) = 'owner'
     and (select count(*) from public.project_members
          where project_id = _project_id and role = 'owner') <= 1 then
    raise exception 'Cannot remove the last owner';
  end if;
  delete from public.project_members
  where project_id = _project_id and user_id = _user_id;
end;
$$;

-- ── Per-project chat ─────────────────────────────────────────────────────────
create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now(),
  edited_at   timestamptz,
  deleted_at  timestamptz
);
create index idx_chat_messages_project on public.chat_messages (project_id, created_at);

alter table public.chat_messages enable row level security;

create policy chat_select on public.chat_messages for select to authenticated
  using (is_project_member(project_id));
create policy chat_insert on public.chat_messages for insert to authenticated
  with check (is_project_member(project_id) and author_id = auth.uid());
create policy chat_update on public.chat_messages for update to authenticated
  using (author_id = auth.uid() or can_manage_members(project_id));

alter publication supabase_realtime add table public.chat_messages;
