-- Wave G: inter-department assignment handoff + volume registry.
-- A "задание" is issued from one department to another; the receiver develops
-- a volume (том). Volumes are a selectable registry (not free text); the
-- assignment row carries the exchange state (see core/handoff).

-- 1. Volume registry — books/volumes of a project, picked when issuing an
--    assignment. Populated by manual entry and by Excel import (состав проекта).
create table public.project_volumes (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  code text not null default ''::text,
  mark text not null default ''::text,        -- марка комплекта (АР, КР, ОВ…)
  set_name text not null default ''::text,    -- комплект / книга
  section_id uuid,                            -- ref_sections, optional
  name text not null default ''::text,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now()
);

alter table public.project_volumes
  add constraint project_volumes_pkey primary key (id);
alter table public.project_volumes
  add constraint project_volumes_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;
alter table public.project_volumes
  add constraint project_volumes_section_id_fkey
  foreign key (section_id) references public.ref_sections(id) on delete set null;

create index idx_project_volumes_project on public.project_volumes using btree (project_id, sort_order);

-- 2. Link schedule tasks to a volume and carry the handoff exchange state.
--    volume_id  — set on the development (задача/разработка) row.
--    handoff_*  — set on the assignment (задание) row.
alter table public.project_schedule_version_tasks
  add column if not exists volume_id uuid,
  add column if not exists handoff_status text,
  add column if not exists handoff_to_department text not null default ''::text;

alter table public.project_schedule_version_tasks
  add constraint psvt_volume_id_fkey
  foreign key (volume_id) references public.project_volumes(id) on delete set null;

alter table public.project_schedule_version_tasks
  add constraint psvt_handoff_status_check
  check (handoff_status is null or handoff_status in
    ('issued', 'received', 'accepted', 'rejected', 'reworking'));

create index idx_psvt_volume on public.project_schedule_version_tasks using btree (volume_id);

-- 3. RLS — project members only.
alter table public.project_volumes enable row level security;

create policy "pv_d" on public.project_volumes for delete to authenticated
  using (is_project_member(project_id));
create policy "pv_i" on public.project_volumes for insert to authenticated
  with check (is_project_member(project_id));
create policy "pv_s" on public.project_volumes for select to authenticated
  using (is_project_member(project_id));
create policy "pv_u" on public.project_volumes for update to authenticated
  using (is_project_member(project_id));
