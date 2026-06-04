-- Wave F: schedule version approval workflow
-- Single-step route: author submits a draft for review; an approver (ГИП)
-- approves or rejects. Approval freezes a baseline snapshot.
-- Mirrors core/approval state machine (packages/core/src/approval).

-- 1. Approval state on each schedule version.
alter table public.project_schedule_versions
  add column if not exists approval_status text not null default 'draft',
  add column if not exists submitted_by uuid,
  add column if not exists submitted_at timestamp with time zone,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamp with time zone,
  add column if not exists baseline_id uuid;

alter table public.project_schedule_versions
  add constraint project_schedule_versions_approval_status_check
  check (approval_status in ('draft', 'in_review', 'approved', 'rejected'));

alter table public.project_schedule_versions
  add constraint project_schedule_versions_baseline_id_fkey
  foreign key (baseline_id) references public.baseline_snapshots(id) on delete set null;

-- 2. Audit trail of approval decisions (one row per submit/approve/reject/recall).
create table public.version_approvals (
  id uuid not null default gen_random_uuid(),
  schedule_version_id uuid not null,
  action text not null,
  from_status text not null,
  to_status text not null,
  actor_role text not null,
  actor_user_id uuid default auth.uid(),
  comment text not null default ''::text,
  decided_at timestamp with time zone not null default now()
);

alter table public.version_approvals
  add constraint version_approvals_pkey primary key (id);

alter table public.version_approvals
  add constraint version_approvals_action_check
  check (action in ('submit', 'approve', 'reject', 'recall', 'supersede'));

alter table public.version_approvals
  add constraint version_approvals_schedule_version_id_fkey
  foreign key (schedule_version_id) references public.project_schedule_versions(id) on delete cascade;

create index idx_version_approvals_version
  on public.version_approvals using btree (schedule_version_id, decided_at desc);

-- 3. RLS — project members only, scoped via the parent schedule version.
alter table public.version_approvals enable row level security;

create policy "va_d" on public.version_approvals for delete to authenticated
  using (exists (select 1 from public.project_schedule_versions v
    where v.id = version_approvals.schedule_version_id and is_project_member(v.project_id)));
create policy "va_i" on public.version_approvals for insert to authenticated
  with check (exists (select 1 from public.project_schedule_versions v
    where v.id = version_approvals.schedule_version_id and is_project_member(v.project_id)));
create policy "va_s" on public.version_approvals for select to authenticated
  using (exists (select 1 from public.project_schedule_versions v
    where v.id = version_approvals.schedule_version_id and is_project_member(v.project_id)));
