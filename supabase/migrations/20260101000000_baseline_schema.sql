-- PlanCore baseline schema (Wave D).
--
-- Captured from the live Supabase project (`public` schema) so the database is
-- reproducible from version control. This is the starting point; subsequent
-- changes go into new timestamped migrations, never by editing this file.
--
-- Order: extensions → enums → tables → constraints → indexes → functions →
-- triggers → views → RLS enable → policies.

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- ── Enums ───────────────────────────────────────────────────────────────────
create type public.audit_event_type as enum (
  'work_item_recalculated', 'work_item_override_set', 'work_item_override_cleared',
  'schedule_sync_marked_outdated', 'schedule_sync_applied', 'schedule_sync_rejected',
  'norm_changed', 'actuals_updated', 'version_created'
);
create type public.calc_status as enum (
  'draft', 'calculated', 'needs_norm', 'needs_resource', 'overridden', 'archived'
);
create type public.contribution_mode as enum ('full', 'partial', 'reference_only');
create type public.element_status as enum ('draft', 'active', 'review', 'archived');
create type public.override_scope as enum ('labor', 'duration', 'both');
create type public.schedule_source as enum (
  'manual', 'from_work_item', 'aggregated_from_work_items', 'imported'
);
create type public.sync_state as enum ('synced', 'outdated', 'overridden', 'requires_review');

-- ── Tables ──────────────────────────────────────────────────────────────────
create table public.activity_log (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  user_id uuid,
  action_type text not null default 'updated'::text,
  entity_type text not null default ''::text,
  entity_id uuid,
  entity_name text not null default ''::text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);
create table public.assignments (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  task_id uuid not null,
  resource_id uuid not null,
  units_pct numeric,
  work_hours numeric,
  split_pct numeric,
  mode text not null default 'AUTO'::text,
  created_at timestamp with time zone not null default now(),
  role text
);
create table public.audit_findings (
  id uuid not null default gen_random_uuid(),
  audit_run_id uuid not null,
  project_id uuid not null,
  task_id uuid,
  severity text not null default 'info'::text,
  rule_code text not null default ''::text,
  summary text not null default ''::text,
  details text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  schedule_version_id uuid
);
create table public.audit_runs (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  file_id uuid,
  created_by uuid,
  status text not null default 'done'::text,
  severity text not null default 'info'::text,
  summary text not null default ''::text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  schedule_version_id uuid
);
create table public.baseline_snapshots (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  name text not null default ''::text,
  baseline_type text not null default 'initial'::text,
  status text not null default 'draft'::text,
  reason text not null default ''::text,
  approved_by uuid,
  created_at timestamp with time zone not null default now(),
  approved_at timestamp with time zone
);
create table public.baseline_tasks (
  id uuid not null default gen_random_uuid(),
  baseline_id uuid not null,
  task_id uuid not null,
  wbs_code text,
  name text not null default ''::text,
  baseline_start date,
  baseline_finish date,
  baseline_duration integer,
  baseline_work numeric,
  baseline_float numeric,
  baseline_critical boolean not null default false,
  responsible text not null default ''::text,
  department text not null default ''::text
);
create table public.calculation_audit_log (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  calculation_version_id uuid,
  work_item_id uuid,
  schedule_task_id uuid,
  event_type audit_event_type not null,
  actor_user_id uuid,
  reason text,
  old_data jsonb not null default '{}'::jsonb,
  new_data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);
create table public.calculation_versions (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  version_no integer not null,
  name text not null,
  status text not null default 'draft'::text,
  based_on_version_id uuid,
  is_current boolean not null default false,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  locked_at timestamp with time zone,
  reason text not null default ''::text
);
create table public.calendars (
  id uuid not null default gen_random_uuid(),
  name text not null,
  hours_per_day numeric not null default 8,
  working_days integer[] not null default '{1,2,3,4,5}'::integer[],
  exceptions jsonb
);
create table public.change_log (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  task_id uuid,
  user_id uuid not null default auth.uid(),
  field_name text not null default ''::text,
  old_value text,
  new_value text,
  reason text not null default ''::text,
  created_at timestamp with time zone not null default now()
);
create table public.dependency_matrix (
  id uuid not null default gen_random_uuid(),
  object_type text not null,
  from_section text not null,
  to_section text not null,
  link_type text not null default 'FS'::text,
  lag_days integer not null default 0,
  description text not null default ''::text,
  description_en text not null default ''::text,
  created_at timestamp with time zone not null default now()
);
create table public.duration_models (
  id uuid not null default gen_random_uuid(),
  object_type text not null default ''::text,
  section_code text not null,
  base_duration_days integer not null default 30,
  driver_section text not null default ''::text,
  formula text not null default ''::text,
  description text not null default ''::text,
  description_en text not null default ''::text,
  created_at timestamp with time zone not null default now()
);
create table public.library_change_log (
  id uuid not null default gen_random_uuid(),
  library_item_id uuid not null,
  action_type text not null,
  from_status text,
  to_status text,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  created_by uuid
);
create table public.library_item_versions (
  id uuid not null default gen_random_uuid(),
  library_item_id uuid not null,
  version text not null,
  status text not null,
  validation_state text not null,
  publish_state text not null,
  snapshot jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamp with time zone not null default now(),
  created_by uuid
);
create table public.library_items (
  id uuid not null default gen_random_uuid(),
  section text not null,
  item_code text not null,
  name text not null,
  status text not null default 'draft'::text,
  validation_state text not null default 'warning'::text,
  publish_state text not null default 'unpublished'::text,
  version text not null default '0.1.0'::text,
  scope jsonb not null default '{}'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  owner_role text not null default 'methodologist'::text,
  reviewer_role text not null default 'reviewer'::text,
  updated_at timestamp with time zone not null default now(),
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  created_by uuid
);
create table public.norm_matrix (
  id uuid not null default gen_random_uuid(),
  section_id uuid,
  subsection_id uuid,
  element_type_id uuid not null,
  work_type_id uuid not null,
  unit_id uuid not null,
  role_id uuid not null,
  base_norm_value numeric(14,6) not null,
  min_value numeric(14,6),
  max_value numeric(14,6),
  complexity_factor_default numeric(12,4) not null default 1,
  repeat_factor_default numeric(12,4) not null default 1,
  stage_factor_default numeric(12,4) not null default 1,
  optional_conditions_json jsonb not null default '{}'::jsonb,
  version text not null,
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.org_departments (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  code text not null default ''::text,
  name text not null,
  name_en text not null default ''::text,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now()
);
create table public.org_members (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid not null,
  role text not null default 'member'::text,
  created_at timestamp with time zone not null default now()
);
create table public.org_people (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  department_id uuid,
  full_name text not null,
  email text not null default ''::text,
  "position" text not null default ''::text,
  role text not null default ''::text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.organizations (
  id uuid not null default gen_random_uuid(),
  name text not null,
  owner_id uuid not null,
  created_at timestamp with time zone not null default now()
);
create table public.project_elements (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  calculation_version_id uuid not null,
  section_id uuid,
  subsection_id uuid,
  department_id uuid,
  element_type_id uuid not null,
  element_name text not null,
  work_package text not null default ''::text,
  unit_id uuid not null,
  volume numeric(16,4) not null,
  source_of_volume text not null,
  notes text not null default ''::text,
  status element_status not null default 'draft'::element_status,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
create table public.project_files (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  file_name text not null,
  file_type text not null default 'Excel'::text,
  storage_path text not null default ''::text,
  uploaded_by uuid,
  upload_date timestamp with time zone not null default now(),
  processing_status text not null default 'ready'::text,
  created_at timestamp with time zone not null default now(),
  version_mode text not null default 'new_project'::text,
  version_label text not null default ''::text,
  metadata jsonb not null default '{}'::jsonb
);
create table public.project_members (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  user_id uuid not null,
  role text not null default 'member'::text
);
create table public.project_mode_resolutions (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  source_type text not null,
  source_kind text not null,
  project_class text,
  project_type text,
  scenario text,
  master_profile_code text not null,
  secondary_profile_codes jsonb not null default '[]'::jsonb,
  active_roles jsonb not null default '[]'::jsonb,
  confidence numeric(5,4) not null default 0,
  rationale jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  needs_user_confirmation boolean not null default true,
  router_version text not null default 'seed-v1'::text,
  is_locked boolean not null default false,
  created_by uuid,
  created_at timestamp with time zone not null default now()
);
create table public.project_schedule_version_links (
  id uuid not null default gen_random_uuid(),
  schedule_version_id uuid not null,
  predecessor_task_row_id uuid,
  predecessor_wbs_code text,
  successor_task_row_id uuid,
  successor_wbs_code text,
  link_type text not null default 'FS'::text,
  lag_days integer not null default 0
);
create table public.project_schedule_version_tasks (
  id uuid not null default gen_random_uuid(),
  schedule_version_id uuid not null,
  task_row_id uuid,
  sort_order integer not null default 0,
  wbs_code text not null default ''::text,
  name text not null default ''::text,
  row_type text not null default ''::text,
  stage text not null default ''::text,
  object_name text not null default ''::text,
  organization text not null default ''::text,
  department text not null default ''::text,
  responsible text not null default ''::text,
  planned_start date,
  planned_finish date,
  planned_duration integer,
  percent_complete numeric,
  physical_percent_complete numeric,
  task_status text,
  actual_start date,
  actual_finish date,
  remaining_duration integer,
  total_volume numeric,
  done_volume numeric,
  planned_productivity numeric,
  current_total_productivity numeric,
  work numeric,
  actual_work numeric,
  remaining_work numeric,
  baseline_start date,
  baseline_finish date,
  forecast_start date,
  forecast_finish date,
  schedule_variance_days integer,
  is_delayed boolean not null default false,
  comment text not null default ''::text,
  predecessors_json jsonb not null default '[]'::jsonb
);
create table public.project_schedule_versions (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  source_file_id uuid,
  previous_version_id uuid,
  version_number integer not null,
  version_kind text not null default 'manual_update'::text,
  version_label text not null default ''::text,
  reason text not null default ''::text,
  created_by uuid default auth.uid(),
  created_at timestamp with time zone not null default now(),
  is_current boolean not null default false
);
create table public.project_sections (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  section_id uuid not null,
  subsection_id uuid,
  department_id uuid,
  status text not null default 'active'::text,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now()
);
create table public.project_team (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  person_id uuid,
  user_id uuid,
  name text not null default ''::text,
  role text not null default ''::text,
  department text not null default ''::text,
  is_lead boolean not null default false,
  created_at timestamp with time zone not null default now()
);
create table public.projects (
  id uuid not null default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone not null default now(),
  organization_id uuid,
  description text not null default ''::text,
  stage text not null default ''::text,
  object_type text not null default ''::text,
  status text not null default 'draft'::text,
  project_status_date date,
  project_timezone text not null default 'UTC'::text,
  active_mode_resolution_id uuid,
  mode_locked boolean not null default false,
  last_mode_source text,
  last_mode_confirmed_at timestamp with time zone
);
create table public.ref_coefficients (
  id uuid not null default gen_random_uuid(),
  code text not null,
  name text not null,
  coefficient_type text not null,
  default_value numeric(12,4) not null,
  min_value numeric(12,4),
  max_value numeric(12,4),
  applies_to text[] not null default '{}'::text[],
  conditions_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.ref_departments (
  id uuid not null default gen_random_uuid(),
  code text not null,
  name text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.ref_element_types (
  id uuid not null default gen_random_uuid(),
  code text not null,
  name text not null,
  category text not null default 'general'::text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.ref_roles (
  id uuid not null default gen_random_uuid(),
  code text not null,
  name text not null,
  department_id uuid,
  hours_per_day numeric(8,2) not null default 8,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.ref_sections (
  id uuid not null default gen_random_uuid(),
  code text not null,
  name text not null,
  name_en text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.ref_subsections (
  id uuid not null default gen_random_uuid(),
  section_id uuid not null,
  code text not null,
  name text not null,
  name_en text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.ref_units (
  id uuid not null default gen_random_uuid(),
  code text not null,
  name text not null,
  symbol text not null,
  dimension_group text not null,
  decimals integer not null default 2,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.ref_work_types (
  id uuid not null default gen_random_uuid(),
  code text not null,
  name text not null,
  description text not null default ''::text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.resources (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  name text not null,
  org text,
  dept text,
  role text,
  calendar_id uuid,
  fte numeric not null default 1.0,
  cost_rate numeric,
  is_active boolean not null default true
);
create table public.role_split_rules (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  scope_type text not null default 'WBS_PREFIX'::text,
  scope_value text not null default ''::text,
  gip_pct numeric not null default 10,
  lead_pct numeric not null default 30,
  eng_pct numeric not null default 60,
  is_active boolean not null default true
);
create table public.schedule_task_actuals (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  schedule_task_id uuid not null,
  status_date date not null,
  planned_volume numeric(16,4),
  actual_volume numeric(16,4),
  planned_labor_days numeric(16,4),
  actual_labor_days numeric(16,4),
  planned_duration_days numeric(16,4),
  percent_complete numeric(8,4),
  actual_start date,
  actual_finish date,
  actual_productivity numeric(16,6),
  variance_volume numeric(16,4),
  variance_labor numeric(16,4),
  variance_duration numeric(16,4),
  forecast_finish date,
  forecast_remaining_labor numeric(16,4),
  created_at timestamp with time zone not null default now()
);
create table public.schedule_task_work_items (
  id uuid not null default gen_random_uuid(),
  schedule_task_id uuid not null,
  work_item_id uuid not null,
  contribution_mode contribution_mode not null default 'full'::contribution_mode,
  contribution_share numeric(12,6) not null default 1,
  created_at timestamp with time zone not null default now()
);
create table public.sections (
  id uuid not null default gen_random_uuid(),
  section_code text not null,
  section_name text not null,
  section_name_en text not null default ''::text,
  department text not null default ''::text,
  object_types text[] not null default '{}'::text[],
  is_default boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now()
);
create table public.tasks (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  wbs_code text,
  name text not null,
  start_date date,
  finish_date date,
  duration_hours numeric,
  calendar_id uuid,
  norm_work_hours numeric,
  planned_work_hours numeric,
  row_type text not null default ''::text,
  stage text not null default ''::text,
  object text not null default ''::text,
  organization text not null default ''::text,
  department text not null default ''::text,
  responsible text not null default ''::text,
  predecessors jsonb not null default '[]'::jsonb,
  duration_days integer,
  percent_complete numeric,
  work numeric,
  actual_work numeric,
  remaining_work numeric,
  baseline_start date,
  baseline_finish date,
  comment text not null default ''::text,
  sort_order integer not null default 0,
  early_start date,
  early_finish date,
  late_start date,
  late_finish date,
  total_float integer,
  free_float integer,
  is_critical boolean not null default false,
  forecast_start date,
  forecast_finish date,
  start_variance integer,
  finish_variance integer,
  duration_variance integer,
  actual_start date,
  actual_finish date,
  remaining_duration integer,
  physical_percent_complete numeric,
  task_status text not null default 'NOT_STARTED'::text,
  total_volume numeric,
  done_volume numeric,
  planned_productivity numeric,
  current_total_productivity numeric,
  sync_state sync_state not null default 'synced'::sync_state,
  schedule_source schedule_source not null default 'manual'::schedule_source,
  sync_reason text,
  suggested_duration_days numeric(16,4),
  suggested_labor_days numeric(16,4),
  calculated_duration_variance_days numeric(16,4)
);
create table public.telegram_users (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  telegram_chat_id bigint not null,
  telegram_username text not null default ''::text,
  linked_at timestamp with time zone not null default now(),
  is_active boolean not null default true
);
create table public.timephased_work_week (
  project_id uuid not null,
  task_id uuid not null,
  resource_id uuid not null,
  week_start date not null,
  work_hours numeric not null default 0
);
create table public.wbs_templates (
  id uuid not null default gen_random_uuid(),
  object_type text not null,
  wbs_level integer not null default 1,
  task_code text not null,
  task_name text not null,
  task_name_en text not null default ''::text,
  parent_code text not null default ''::text,
  section_code text not null default ''::text,
  is_driver boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now()
);
create table public.work_item_actuals (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  work_item_id uuid not null,
  status_date date not null,
  planned_volume numeric(16,4),
  actual_volume numeric(16,4),
  planned_labor_days numeric(16,4),
  actual_labor_days numeric(16,4),
  planned_duration_days numeric(16,4),
  percent_complete numeric(8,4),
  actual_start date,
  actual_finish date,
  actual_productivity numeric(16,6),
  variance_volume numeric(16,4),
  variance_labor numeric(16,4),
  variance_duration numeric(16,4),
  forecast_finish date,
  forecast_remaining_labor numeric(16,4),
  created_at timestamp with time zone not null default now()
);
create table public.work_items (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  calculation_version_id uuid not null,
  project_element_id uuid not null,
  work_type_id uuid not null,
  role_id uuid not null,
  norm_id uuid,
  base_norm_per_unit numeric(14,6),
  applied_volume numeric(16,4) not null,
  factor_complexity numeric(12,4) not null default 1,
  factor_repeat numeric(12,4) not null default 1,
  factor_stage numeric(12,4) not null default 1,
  factor_custom numeric(12,4) not null default 1,
  calculated_labor_days numeric(16,4),
  calculated_labor_hours numeric(16,4),
  assigned_resource_count numeric(10,2),
  calculated_duration_days numeric(16,4),
  manual_override_labor_days numeric(16,4),
  manual_override_duration_days numeric(16,4),
  override_reason text,
  source_of_calculation text not null default 'norm_matrix'::text,
  calc_status calc_status not null default 'draft'::calc_status,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- ── Primary keys ────────────────────────────────────────────────────────────
alter table public.activity_log add constraint activity_log_pkey primary key (id);
alter table public.assignments add constraint assignments_pkey primary key (id);
alter table public.audit_findings add constraint audit_findings_pkey primary key (id);
alter table public.audit_runs add constraint audit_runs_pkey primary key (id);
alter table public.baseline_snapshots add constraint baseline_snapshots_pkey primary key (id);
alter table public.baseline_tasks add constraint baseline_tasks_pkey primary key (id);
alter table public.calculation_audit_log add constraint calculation_audit_log_pkey primary key (id);
alter table public.calculation_versions add constraint calculation_versions_pkey primary key (id);
alter table public.calendars add constraint calendars_pkey primary key (id);
alter table public.change_log add constraint change_log_pkey primary key (id);
alter table public.dependency_matrix add constraint dependency_matrix_pkey primary key (id);
alter table public.duration_models add constraint duration_models_pkey primary key (id);
alter table public.library_change_log add constraint library_change_log_pkey primary key (id);
alter table public.library_item_versions add constraint library_item_versions_pkey primary key (id);
alter table public.library_items add constraint library_items_pkey primary key (id);
alter table public.norm_matrix add constraint norm_matrix_pkey primary key (id);
alter table public.org_departments add constraint org_departments_pkey primary key (id);
alter table public.org_members add constraint org_members_pkey primary key (id);
alter table public.org_people add constraint org_people_pkey primary key (id);
alter table public.organizations add constraint organizations_pkey primary key (id);
alter table public.project_elements add constraint project_elements_pkey primary key (id);
alter table public.project_files add constraint project_files_pkey primary key (id);
alter table public.project_members add constraint project_members_pkey primary key (id);
alter table public.project_mode_resolutions add constraint project_mode_resolutions_pkey primary key (id);
alter table public.project_schedule_version_links add constraint project_schedule_version_links_pkey primary key (id);
alter table public.project_schedule_version_tasks add constraint project_schedule_version_tasks_pkey primary key (id);
alter table public.project_schedule_versions add constraint project_schedule_versions_pkey primary key (id);
alter table public.project_sections add constraint project_sections_pkey primary key (id);
alter table public.project_team add constraint project_team_pkey primary key (id);
alter table public.projects add constraint projects_pkey primary key (id);
alter table public.ref_coefficients add constraint ref_coefficients_pkey primary key (id);
alter table public.ref_departments add constraint ref_departments_pkey primary key (id);
alter table public.ref_element_types add constraint ref_element_types_pkey primary key (id);
alter table public.ref_roles add constraint ref_roles_pkey primary key (id);
alter table public.ref_sections add constraint ref_sections_pkey primary key (id);
alter table public.ref_subsections add constraint ref_subsections_pkey primary key (id);
alter table public.ref_units add constraint ref_units_pkey primary key (id);
alter table public.ref_work_types add constraint ref_work_types_pkey primary key (id);
alter table public.resources add constraint resources_pkey primary key (id);
alter table public.role_split_rules add constraint role_split_rules_pkey primary key (id);
alter table public.schedule_task_actuals add constraint schedule_task_actuals_pkey primary key (id);
alter table public.schedule_task_work_items add constraint schedule_task_work_items_pkey primary key (id);
alter table public.sections add constraint sections_pkey primary key (id);
alter table public.tasks add constraint tasks_pkey primary key (id);
alter table public.telegram_users add constraint telegram_users_pkey primary key (id);
alter table public.timephased_work_week add constraint timephased_work_week_pkey primary key (task_id, resource_id, week_start);
alter table public.wbs_templates add constraint wbs_templates_pkey primary key (id);
alter table public.work_item_actuals add constraint work_item_actuals_pkey primary key (id);
alter table public.work_items add constraint work_items_pkey primary key (id);

-- ── Unique constraints ──────────────────────────────────────────────────────
alter table public.calculation_versions add constraint calculation_versions_project_id_version_no_key unique (project_id, version_no);
alter table public.library_items add constraint library_items_item_code_key unique (item_code);
alter table public.org_members add constraint org_members_org_id_user_id_key unique (org_id, user_id);
alter table public.project_members add constraint project_members_project_id_user_id_key unique (project_id, user_id);
alter table public.project_sections add constraint project_sections_project_id_section_id_subsection_id_depart_key unique (project_id, section_id, subsection_id, department_id);
alter table public.ref_coefficients add constraint ref_coefficients_code_key unique (code);
alter table public.ref_departments add constraint ref_departments_code_key unique (code);
alter table public.ref_element_types add constraint ref_element_types_code_key unique (code);
alter table public.ref_roles add constraint ref_roles_code_key unique (code);
alter table public.ref_sections add constraint ref_sections_code_key unique (code);
alter table public.ref_subsections add constraint ref_subsections_section_id_code_key unique (section_id, code);
alter table public.ref_units add constraint ref_units_code_key unique (code);
alter table public.ref_work_types add constraint ref_work_types_code_key unique (code);
alter table public.schedule_task_actuals add constraint schedule_task_actuals_schedule_task_id_status_date_key unique (schedule_task_id, status_date);
alter table public.schedule_task_work_items add constraint schedule_task_work_items_schedule_task_id_work_item_id_key unique (schedule_task_id, work_item_id);
alter table public.telegram_users add constraint telegram_users_telegram_chat_id_key unique (telegram_chat_id);
alter table public.work_item_actuals add constraint work_item_actuals_work_item_id_status_date_key unique (work_item_id, status_date);

-- ── Check constraints ───────────────────────────────────────────────────────
alter table public.library_item_versions add constraint library_item_versions_publish_state_check check ((publish_state = any (array['unpublished'::text, 'published'::text, 'stale'::text])));
alter table public.library_item_versions add constraint library_item_versions_status_check check ((status = any (array['draft'::text, 'review'::text, 'approved'::text, 'archived'::text])));
alter table public.library_item_versions add constraint library_item_versions_validation_state_check check ((validation_state = any (array['valid'::text, 'warning'::text, 'invalid'::text])));
alter table public.library_items add constraint library_items_publish_state_check check ((publish_state = any (array['unpublished'::text, 'published'::text, 'stale'::text])));
alter table public.library_items add constraint library_items_section_check check ((section = any (array['entities'::text, 'rules'::text, 'templates'::text, 'prompt-profiles'::text, 'normatives'::text, 'organizations'::text, 'bundles'::text])));
alter table public.library_items add constraint library_items_status_check check ((status = any (array['draft'::text, 'review'::text, 'approved'::text, 'archived'::text])));
alter table public.library_items add constraint library_items_validation_state_check check ((validation_state = any (array['valid'::text, 'warning'::text, 'invalid'::text])));
alter table public.norm_matrix add constraint norm_matrix_base_norm_value_check check ((base_norm_value > (0)::numeric));
alter table public.norm_matrix add constraint norm_matrix_check check (((effective_to is null) or (effective_to >= effective_from)));
alter table public.norm_matrix add constraint norm_matrix_check1 check (((min_value is null) or (max_value is null) or (min_value <= max_value)));
alter table public.norm_matrix add constraint norm_matrix_complexity_factor_default_check check ((complexity_factor_default > (0)::numeric));
alter table public.norm_matrix add constraint norm_matrix_repeat_factor_default_check check ((repeat_factor_default > (0)::numeric));
alter table public.norm_matrix add constraint norm_matrix_stage_factor_default_check check ((stage_factor_default > (0)::numeric));
alter table public.project_elements add constraint project_elements_volume_check check ((volume >= (0)::numeric));
alter table public.project_mode_resolutions add constraint project_mode_resolutions_source_kind_check check ((source_kind = any (array['new_project'::text, 'upload_file'::text, 'upload_docs'::text, 'existing_project'::text])));
alter table public.project_mode_resolutions add constraint project_mode_resolutions_source_type_check check ((source_type = any (array['manual'::text, 'saved'::text, 'auto'::text, 'fallback'::text])));
alter table public.projects add constraint projects_last_mode_source_check check (((last_mode_source is null) or (last_mode_source = any (array['manual'::text, 'saved'::text, 'auto'::text, 'fallback'::text]))));
alter table public.ref_coefficients add constraint ref_coefficients_check check (((min_value is null) or (max_value is null) or (min_value <= max_value)));
alter table public.ref_coefficients add constraint ref_coefficients_default_value_check check ((default_value > (0)::numeric));
alter table public.ref_roles add constraint ref_roles_hours_per_day_check check ((hours_per_day > (0)::numeric));
alter table public.ref_units add constraint ref_units_decimals_check check ((decimals >= 0));
alter table public.schedule_task_work_items add constraint schedule_task_work_items_contribution_share_check check (((contribution_share > (0)::numeric) and (contribution_share <= (1)::numeric)));
alter table public.work_items add constraint work_items_applied_volume_check check ((applied_volume >= (0)::numeric));
alter table public.work_items add constraint work_items_assigned_resource_count_check check (((assigned_resource_count is null) or (assigned_resource_count >= (0)::numeric)));
alter table public.work_items add constraint work_items_check check ((((manual_override_labor_days is null) and (manual_override_duration_days is null)) or (coalesce(nullif(trim(both from override_reason), ''::text), ''::text) <> ''::text)));
alter table public.work_items add constraint work_items_factor_complexity_check check ((factor_complexity > (0)::numeric));
alter table public.work_items add constraint work_items_factor_custom_check check ((factor_custom > (0)::numeric));
alter table public.work_items add constraint work_items_factor_repeat_check check ((factor_repeat > (0)::numeric));
alter table public.work_items add constraint work_items_factor_stage_check check ((factor_stage > (0)::numeric));

-- ── Foreign keys ────────────────────────────────────────────────────────────
alter table public.activity_log add constraint activity_log_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.assignments add constraint assignments_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.assignments add constraint assignments_resource_id_fkey foreign key (resource_id) references resources(id) on delete cascade;
alter table public.assignments add constraint assignments_task_id_fkey foreign key (task_id) references tasks(id) on delete cascade;
alter table public.audit_findings add constraint audit_findings_audit_run_id_fkey foreign key (audit_run_id) references audit_runs(id) on delete cascade;
alter table public.audit_findings add constraint audit_findings_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.audit_findings add constraint audit_findings_schedule_version_id_fkey foreign key (schedule_version_id) references project_schedule_versions(id) on delete set null;
alter table public.audit_findings add constraint audit_findings_task_id_fkey foreign key (task_id) references tasks(id) on delete set null;
alter table public.audit_runs add constraint audit_runs_file_id_fkey foreign key (file_id) references project_files(id) on delete set null;
alter table public.audit_runs add constraint audit_runs_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.audit_runs add constraint audit_runs_schedule_version_id_fkey foreign key (schedule_version_id) references project_schedule_versions(id) on delete set null;
alter table public.baseline_snapshots add constraint baseline_snapshots_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.baseline_tasks add constraint baseline_tasks_baseline_id_fkey foreign key (baseline_id) references baseline_snapshots(id) on delete cascade;
alter table public.baseline_tasks add constraint baseline_tasks_task_id_fkey foreign key (task_id) references tasks(id) on delete cascade;
alter table public.calculation_audit_log add constraint calculation_audit_log_actor_user_id_fkey foreign key (actor_user_id) references auth.users(id) on delete set null;
alter table public.calculation_audit_log add constraint calculation_audit_log_calculation_version_id_fkey foreign key (calculation_version_id) references calculation_versions(id) on delete set null;
alter table public.calculation_audit_log add constraint calculation_audit_log_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.calculation_audit_log add constraint calculation_audit_log_schedule_task_id_fkey foreign key (schedule_task_id) references tasks(id) on delete set null;
alter table public.calculation_audit_log add constraint calculation_audit_log_work_item_id_fkey foreign key (work_item_id) references work_items(id) on delete set null;
alter table public.calculation_versions add constraint calculation_versions_based_on_version_id_fkey foreign key (based_on_version_id) references calculation_versions(id) on delete set null;
alter table public.calculation_versions add constraint calculation_versions_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;
alter table public.calculation_versions add constraint calculation_versions_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.change_log add constraint change_log_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.change_log add constraint change_log_task_id_fkey foreign key (task_id) references tasks(id) on delete set null;
alter table public.library_change_log add constraint library_change_log_created_by_fkey foreign key (created_by) references auth.users(id);
alter table public.library_change_log add constraint library_change_log_library_item_id_fkey foreign key (library_item_id) references library_items(id) on delete cascade;
alter table public.library_item_versions add constraint library_item_versions_created_by_fkey foreign key (created_by) references auth.users(id);
alter table public.library_item_versions add constraint library_item_versions_library_item_id_fkey foreign key (library_item_id) references library_items(id) on delete cascade;
alter table public.library_items add constraint library_items_created_by_fkey foreign key (created_by) references auth.users(id);
alter table public.library_items add constraint library_items_updated_by_fkey foreign key (updated_by) references auth.users(id);
alter table public.norm_matrix add constraint norm_matrix_element_type_id_fkey foreign key (element_type_id) references ref_element_types(id);
alter table public.norm_matrix add constraint norm_matrix_role_id_fkey foreign key (role_id) references ref_roles(id);
alter table public.norm_matrix add constraint norm_matrix_section_id_fkey foreign key (section_id) references ref_sections(id) on delete set null;
alter table public.norm_matrix add constraint norm_matrix_subsection_id_fkey foreign key (subsection_id) references ref_subsections(id) on delete set null;
alter table public.norm_matrix add constraint norm_matrix_unit_id_fkey foreign key (unit_id) references ref_units(id);
alter table public.norm_matrix add constraint norm_matrix_work_type_id_fkey foreign key (work_type_id) references ref_work_types(id);
alter table public.org_departments add constraint org_departments_org_id_fkey foreign key (org_id) references organizations(id) on delete cascade;
alter table public.org_members add constraint org_members_org_id_fkey foreign key (org_id) references organizations(id) on delete cascade;
alter table public.org_people add constraint org_people_department_id_fkey foreign key (department_id) references org_departments(id) on delete set null;
alter table public.org_people add constraint org_people_org_id_fkey foreign key (org_id) references organizations(id) on delete cascade;
alter table public.project_elements add constraint project_elements_calculation_version_id_fkey foreign key (calculation_version_id) references calculation_versions(id) on delete cascade;
alter table public.project_elements add constraint project_elements_department_id_fkey foreign key (department_id) references ref_departments(id) on delete set null;
alter table public.project_elements add constraint project_elements_element_type_id_fkey foreign key (element_type_id) references ref_element_types(id);
alter table public.project_elements add constraint project_elements_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.project_elements add constraint project_elements_section_id_fkey foreign key (section_id) references ref_sections(id) on delete set null;
alter table public.project_elements add constraint project_elements_subsection_id_fkey foreign key (subsection_id) references ref_subsections(id) on delete set null;
alter table public.project_elements add constraint project_elements_unit_id_fkey foreign key (unit_id) references ref_units(id);
alter table public.project_files add constraint project_files_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.project_members add constraint project_members_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.project_members add constraint project_members_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.project_mode_resolutions add constraint project_mode_resolutions_created_by_fkey foreign key (created_by) references auth.users(id);
alter table public.project_mode_resolutions add constraint project_mode_resolutions_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.project_schedule_version_links add constraint project_schedule_version_links_schedule_version_id_fkey foreign key (schedule_version_id) references project_schedule_versions(id) on delete cascade;
alter table public.project_schedule_version_tasks add constraint project_schedule_version_tasks_schedule_version_id_fkey foreign key (schedule_version_id) references project_schedule_versions(id) on delete cascade;
alter table public.project_schedule_versions add constraint project_schedule_versions_previous_version_id_fkey foreign key (previous_version_id) references project_schedule_versions(id) on delete set null;
alter table public.project_schedule_versions add constraint project_schedule_versions_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.project_schedule_versions add constraint project_schedule_versions_source_file_id_fkey foreign key (source_file_id) references project_files(id) on delete set null;
alter table public.project_sections add constraint project_sections_department_id_fkey foreign key (department_id) references ref_departments(id) on delete set null;
alter table public.project_sections add constraint project_sections_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.project_sections add constraint project_sections_section_id_fkey foreign key (section_id) references ref_sections(id);
alter table public.project_sections add constraint project_sections_subsection_id_fkey foreign key (subsection_id) references ref_subsections(id) on delete set null;
alter table public.project_team add constraint project_team_person_id_fkey foreign key (person_id) references org_people(id) on delete set null;
alter table public.project_team add constraint project_team_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.projects add constraint projects_active_mode_resolution_id_fkey foreign key (active_mode_resolution_id) references project_mode_resolutions(id) on delete set null;
alter table public.projects add constraint projects_organization_id_fkey foreign key (organization_id) references organizations(id) on delete set null;
alter table public.ref_roles add constraint ref_roles_department_id_fkey foreign key (department_id) references ref_departments(id) on delete set null;
alter table public.ref_subsections add constraint ref_subsections_section_id_fkey foreign key (section_id) references ref_sections(id) on delete cascade;
alter table public.resources add constraint resources_calendar_id_fkey foreign key (calendar_id) references calendars(id);
alter table public.resources add constraint resources_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.role_split_rules add constraint role_split_rules_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.schedule_task_actuals add constraint schedule_task_actuals_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.schedule_task_actuals add constraint schedule_task_actuals_schedule_task_id_fkey foreign key (schedule_task_id) references tasks(id) on delete cascade;
alter table public.schedule_task_work_items add constraint schedule_task_work_items_schedule_task_id_fkey foreign key (schedule_task_id) references tasks(id) on delete cascade;
alter table public.schedule_task_work_items add constraint schedule_task_work_items_work_item_id_fkey foreign key (work_item_id) references work_items(id) on delete cascade;
alter table public.tasks add constraint tasks_calendar_id_fkey foreign key (calendar_id) references calendars(id);
alter table public.tasks add constraint tasks_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.telegram_users add constraint telegram_users_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.timephased_work_week add constraint timephased_work_week_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.timephased_work_week add constraint timephased_work_week_resource_id_fkey foreign key (resource_id) references resources(id) on delete cascade;
alter table public.timephased_work_week add constraint timephased_work_week_task_id_fkey foreign key (task_id) references tasks(id) on delete cascade;
alter table public.work_item_actuals add constraint work_item_actuals_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.work_item_actuals add constraint work_item_actuals_work_item_id_fkey foreign key (work_item_id) references work_items(id) on delete cascade;
alter table public.work_items add constraint work_items_calculation_version_id_fkey foreign key (calculation_version_id) references calculation_versions(id) on delete cascade;
alter table public.work_items add constraint work_items_norm_id_fkey foreign key (norm_id) references norm_matrix(id) on delete set null;
alter table public.work_items add constraint work_items_project_element_id_fkey foreign key (project_element_id) references project_elements(id) on delete cascade;
alter table public.work_items add constraint work_items_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table public.work_items add constraint work_items_role_id_fkey foreign key (role_id) references ref_roles(id);
alter table public.work_items add constraint work_items_work_type_id_fkey foreign key (work_type_id) references ref_work_types(id);

-- ── Indexes ─────────────────────────────────────────────────────────────────
create index idx_activity_log_created_at on public.activity_log using btree (created_at desc);
create index idx_activity_log_project_id on public.activity_log using btree (project_id);
create index idx_assignments_resource on public.assignments using btree (resource_id);
create index idx_assignments_task on public.assignments using btree (task_id);
create index idx_audit_findings_audit_run_id on public.audit_findings using btree (audit_run_id);
create index idx_audit_findings_project_id on public.audit_findings using btree (project_id);
create index idx_audit_findings_schedule_version_id on public.audit_findings using btree (schedule_version_id);
create index idx_audit_runs_created_at on public.audit_runs using btree (created_at desc);
create index idx_audit_runs_file_id on public.audit_runs using btree (file_id);
create index idx_audit_runs_project_id on public.audit_runs using btree (project_id);
create index idx_audit_runs_schedule_version_id on public.audit_runs using btree (schedule_version_id);
create index idx_baseline_snapshots_project on public.baseline_snapshots using btree (project_id);
create index idx_baseline_tasks_baseline on public.baseline_tasks using btree (baseline_id);
create index idx_baseline_tasks_task on public.baseline_tasks using btree (task_id);
create index idx_calculation_audit_log_project on public.calculation_audit_log using btree (project_id, created_at desc);
create index idx_calculation_audit_log_work_item on public.calculation_audit_log using btree (work_item_id, created_at desc);
create index idx_calculation_versions_project on public.calculation_versions using btree (project_id, version_no desc);
create index idx_change_log_created on public.change_log using btree (created_at desc);
create index idx_change_log_project on public.change_log using btree (project_id);
create index idx_change_log_task on public.change_log using btree (task_id);
create index idx_norm_matrix_lookup on public.norm_matrix using btree (element_type_id, work_type_id, unit_id, role_id);
create index idx_norm_matrix_section_scope on public.norm_matrix using btree (section_id, subsection_id);
create index idx_project_elements_project_version on public.project_elements using btree (project_id, calculation_version_id);
create index idx_project_elements_scope on public.project_elements using btree (project_id, section_id, department_id);
create index idx_project_files_project_id on public.project_files using btree (project_id);
create index idx_project_files_upload_date on public.project_files using btree (upload_date desc);
create index idx_project_members_user on public.project_members using btree (user_id);
create index idx_project_schedule_version_links_version_id on public.project_schedule_version_links using btree (schedule_version_id);
create index idx_project_schedule_version_tasks_version_id on public.project_schedule_version_tasks using btree (schedule_version_id, sort_order);
create index idx_project_schedule_versions_project_id on public.project_schedule_versions using btree (project_id, created_at desc);
create unique index idx_project_schedule_versions_single_current on public.project_schedule_versions using btree (project_id) where (is_current = true);
create unique index idx_project_schedule_versions_unique_number on public.project_schedule_versions using btree (project_id, version_number);
create index idx_project_sections_project on public.project_sections using btree (project_id);
create index idx_ref_roles_department on public.ref_roles using btree (department_id);
create index idx_ref_subsections_section on public.ref_subsections using btree (section_id);
create index idx_resources_project on public.resources using btree (project_id);
create index idx_schedule_task_actuals_task_status_date on public.schedule_task_actuals using btree (schedule_task_id, status_date desc);
create index idx_schedule_task_work_items_task on public.schedule_task_work_items using btree (schedule_task_id);
create index idx_schedule_task_work_items_work_item on public.schedule_task_work_items using btree (work_item_id);
create index idx_tasks_project on public.tasks using btree (project_id);
create index idx_tasks_sync_state on public.tasks using btree (project_id, sync_state);
create index idx_telegram_users_chat_id on public.telegram_users using btree (telegram_chat_id);
create index idx_telegram_users_user_id on public.telegram_users using btree (user_id);
create index idx_work_item_actuals_work_item_status_date on public.work_item_actuals using btree (work_item_id, status_date desc);
create index idx_work_items_calc_status on public.work_items using btree (project_id, calc_status);
create index idx_work_items_norm on public.work_items using btree (norm_id);
create index idx_work_items_project_element on public.work_items using btree (project_element_id);
create index idx_work_items_project_version on public.work_items using btree (project_id, calculation_version_id);
create index library_change_log_item_created_at_idx on public.library_change_log using btree (library_item_id, created_at desc);
create index library_item_versions_item_created_at_idx on public.library_item_versions using btree (library_item_id, created_at desc);
create index library_items_section_updated_at_idx on public.library_items using btree (section, updated_at desc);
create index project_mode_resolutions_master_profile_code_idx on public.project_mode_resolutions using btree (master_profile_code);
create index project_mode_resolutions_project_id_created_at_idx on public.project_mode_resolutions using btree (project_id, created_at desc);
create unique index uq_calculation_versions_current on public.calculation_versions using btree (project_id) where (is_current = true);
create unique index uq_norm_matrix_version_key on public.norm_matrix using btree (coalesce(section_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(subsection_id, '00000000-0000-0000-0000-000000000000'::uuid), element_type_id, work_type_id, unit_id, role_id, version, effective_from);

-- ── Functions ───────────────────────────────────────────────────────────────
create or replace function public.is_org_member(_org_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.org_members
    where org_id = _org_id and user_id = auth.uid()
  )
$function$;

create or replace function public.is_project_member(_project_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.project_members
    where project_id = _project_id and user_id = auth.uid()
  )
$function$;

create or replace function public.next_calculation_version_no(_project_id uuid)
 returns integer
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(max(version_no), 0) + 1
  from public.calculation_versions
  where project_id = _project_id
$function$;

create or replace function public.create_organization(p_name text)
 returns organizations
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_org public.organizations;
begin
  insert into public.organizations(name, owner_id)
  values (p_name, auth.uid())
  returning * into v_org;
  insert into public.org_members(org_id, user_id, role)
  values (v_org.id, auth.uid(), 'owner');
  return v_org;
end;
$function$;

create or replace function public.create_project(p_name text)
 returns projects
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_project public.projects;
begin
  insert into public.projects(name)
  values (p_name)
  returning * into v_project;

  insert into public.project_members(project_id, user_id, role)
  values (v_project.id, auth.uid(), 'owner');

  return v_project;
end;
$function$;

create or replace function public.set_row_updated_at()
 returns trigger
 language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.mark_schedule_tasks_outdated_for_work_item(_work_item_id uuid, _reason text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  rec record;
  v_old jsonb;
  v_new jsonb;
begin
  for rec in
    select t.*
    from public.tasks t
    join public.schedule_task_work_items stwi on stwi.schedule_task_id = t.id
    where stwi.work_item_id = _work_item_id
  loop
    v_old := to_jsonb(rec);

    update public.tasks
    set
      sync_state = case
        when rec.sync_state = 'overridden' then 'overridden'::public.sync_state
        when rec.schedule_source = 'manual' then 'requires_review'::public.sync_state
        when rec.schedule_source = 'aggregated_from_work_items' then 'requires_review'::public.sync_state
        else 'outdated'::public.sync_state
      end,
      sync_reason = coalesce(_reason, 'Linked work item changed')
    where id = rec.id;

    select to_jsonb(t.*) into v_new
    from public.tasks t
    where t.id = rec.id;

    insert into public.calculation_audit_log (
      project_id, work_item_id, schedule_task_id, event_type,
      actor_user_id, reason, old_data, new_data
    )
    values (
      rec.project_id, _work_item_id, rec.id, 'schedule_sync_marked_outdated',
      auth.uid(), coalesce(_reason, 'Linked work item changed'), v_old, v_new
    );
  end loop;
end;
$function$;

create or replace function public.recalculate_work_item(_work_item_id uuid, _reason text default null::text)
 returns work_items
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_item public.work_items%rowtype;
  v_old jsonb;
  v_new jsonb;
  v_calc_labor numeric(16,4);
  v_calc_hours numeric(16,4);
  v_calc_duration numeric(16,4);
  v_calc_status public.calc_status;
begin
  select * into v_item from public.work_items where id = _work_item_id;
  if not found then
    raise exception 'work_item % not found', _work_item_id;
  end if;

  v_old := to_jsonb(v_item);

  if v_item.base_norm_per_unit is null or v_item.base_norm_per_unit <= 0 then
    v_calc_labor := null;
    v_calc_hours := null;
    v_calc_duration := null;
    v_calc_status := 'needs_norm';
  else
    v_calc_labor := round(
      v_item.applied_volume * v_item.base_norm_per_unit * v_item.factor_complexity
      * v_item.factor_repeat * v_item.factor_stage * v_item.factor_custom, 4);
    v_calc_hours := round(v_calc_labor * 8, 4);
    if v_item.assigned_resource_count is null or v_item.assigned_resource_count = 0 then
      v_calc_duration := null;
      v_calc_status := 'needs_resource';
    else
      v_calc_duration := round(v_calc_labor / v_item.assigned_resource_count, 4);
      v_calc_status := case
        when v_item.manual_override_labor_days is not null
          or v_item.manual_override_duration_days is not null
        then 'overridden' else 'calculated' end;
    end if;
  end if;

  update public.work_items
  set calculated_labor_days = v_calc_labor,
      calculated_labor_hours = v_calc_hours,
      calculated_duration_days = v_calc_duration,
      calc_status = v_calc_status,
      updated_at = now()
  where id = _work_item_id
  returning * into v_item;

  v_new := to_jsonb(v_item);

  insert into public.calculation_audit_log (
    project_id, calculation_version_id, work_item_id, event_type,
    actor_user_id, reason, old_data, new_data
  )
  values (
    v_item.project_id, v_item.calculation_version_id, v_item.id,
    'work_item_recalculated', auth.uid(), _reason, v_old, v_new
  );

  perform public.mark_schedule_tasks_outdated_for_work_item(_work_item_id, _reason);
  return v_item;
end;
$function$;

create or replace function public.sync_schedule_task_from_work_items(_task_id uuid, _reason text default null::text)
 returns tasks
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_task public.tasks%rowtype;
  v_old jsonb;
  v_new jsonb;
  v_agg record;
  v_next_sync_state public.sync_state;
begin
  select * into v_task from public.tasks where id = _task_id;
  if not found then
    raise exception 'task % not found', _task_id;
  end if;

  select * into v_agg
  from public.v_schedule_task_work_item_aggregates
  where schedule_task_id = _task_id;

  if not found then
    raise exception 'task % has no linked work items', _task_id;
  end if;

  v_old := to_jsonb(v_task);

  v_next_sync_state := case
    when v_task.sync_state = 'overridden' then 'overridden'
    when v_agg.has_missing_norm or v_agg.has_missing_resource then 'requires_review'
    else 'synced'
  end;

  update public.tasks
  set suggested_labor_days = v_agg.suggested_labor_days,
      suggested_duration_days = v_agg.naive_suggested_duration_days,
      calculated_duration_variance_days = case
        when duration_days is null or v_agg.naive_suggested_duration_days is null then null
        else round(duration_days - v_agg.naive_suggested_duration_days, 4)
      end,
      sync_state = v_next_sync_state,
      schedule_source = case
        when v_agg.linked_work_item_count = 1 then 'from_work_item'
        else 'aggregated_from_work_items'
      end,
      sync_reason = coalesce(_reason, 'Schedule task synchronized from linked work items')
  where id = _task_id
  returning * into v_task;

  v_new := to_jsonb(v_task);

  insert into public.calculation_audit_log (
    project_id, schedule_task_id, event_type, actor_user_id, reason, old_data, new_data
  )
  values (
    v_task.project_id, v_task.id, 'schedule_sync_applied', auth.uid(),
    coalesce(_reason, 'Schedule task synchronized from linked work items'), v_old, v_new
  );

  return v_task;
end;
$function$;

-- ── Triggers ────────────────────────────────────────────────────────────────
create trigger trg_project_elements_updated_at before update on public.project_elements
  for each row execute function set_row_updated_at();
create trigger trg_work_items_updated_at before update on public.work_items
  for each row execute function set_row_updated_at();

-- ── Views ───────────────────────────────────────────────────────────────────
create or replace view public.v_work_item_effective_values as
  select id, project_id, calculation_version_id, project_element_id, work_type_id,
    role_id, norm_id, base_norm_per_unit, applied_volume, factor_complexity,
    factor_repeat, factor_stage, factor_custom, calculated_labor_days,
    calculated_labor_hours, assigned_resource_count, calculated_duration_days,
    manual_override_labor_days, manual_override_duration_days, override_reason,
    source_of_calculation, calc_status, status, created_at, updated_at,
    coalesce(manual_override_labor_days, calculated_labor_days) as effective_labor_days,
    coalesce(manual_override_duration_days, calculated_duration_days) as effective_duration_days
  from work_items wi;

create or replace view public.v_resource_week_load as
  select r.project_id, tw.resource_id, r.name as resource_name, r.dept,
    r.role as resource_role, tw.week_start,
    coalesce(sum(tw.work_hours), (0)::numeric) as load_hours,
    (r.fte * (40)::numeric) as capacity_hours,
    greatest((0)::numeric, (coalesce(sum(tw.work_hours), (0)::numeric) - (r.fte * (40)::numeric))) as overload_hours,
    case when ((r.fte * (40)::numeric) > (0)::numeric)
      then round(((coalesce(sum(tw.work_hours), (0)::numeric) / (r.fte * (40)::numeric)) * (100)::numeric), 1)
      else (0)::numeric end as utilization_pct
  from (timephased_work_week tw join resources r on ((r.id = tw.resource_id)))
  group by r.project_id, tw.resource_id, r.name, r.dept, r.role, tw.week_start, r.fte;

create or replace view public.v_dept_week_load as
  select project_id, dept, week_start,
    sum(load_hours) as load_hours, sum(capacity_hours) as capacity_hours,
    greatest((0)::numeric, (sum(load_hours) - sum(capacity_hours))) as overload_hours,
    case when (sum(capacity_hours) > (0)::numeric)
      then round(((sum(load_hours) / sum(capacity_hours)) * (100)::numeric), 1)
      else (0)::numeric end as utilization_pct
  from v_resource_week_load
  group by project_id, dept, week_start;

create or replace view public.v_schedule_task_work_item_aggregates as
  select stwi.schedule_task_id, wi.project_id, count(*) as linked_work_item_count,
    sum((coalesce(wev.effective_labor_days, (0)::numeric) * stwi.contribution_share)) as suggested_labor_days,
    sum((coalesce(wev.effective_duration_days, (0)::numeric) * stwi.contribution_share)) as naive_suggested_duration_days,
    sum((wi.applied_volume * stwi.contribution_share)) as aggregated_volume,
    bool_or((wi.calc_status = 'needs_norm'::calc_status)) as has_missing_norm,
    bool_or((wi.calc_status = 'needs_resource'::calc_status)) as has_missing_resource,
    bool_or(((wi.manual_override_labor_days is not null) or (wi.manual_override_duration_days is not null))) as has_override
  from ((schedule_task_work_items stwi
    join work_items wi on ((wi.id = stwi.work_item_id)))
    join v_work_item_effective_values wev on ((wev.id = wi.id)))
  group by stwi.schedule_task_id, wi.project_id;

-- ── Row Level Security: enable ──────────────────────────────────────────────
alter table public.activity_log enable row level security;
alter table public.assignments enable row level security;
alter table public.audit_findings enable row level security;
alter table public.audit_runs enable row level security;
alter table public.baseline_snapshots enable row level security;
alter table public.baseline_tasks enable row level security;
alter table public.calculation_audit_log enable row level security;
alter table public.calculation_versions enable row level security;
alter table public.calendars enable row level security;
alter table public.change_log enable row level security;
alter table public.dependency_matrix enable row level security;
alter table public.duration_models enable row level security;
alter table public.library_change_log enable row level security;
alter table public.library_item_versions enable row level security;
alter table public.library_items enable row level security;
alter table public.norm_matrix enable row level security;
alter table public.org_departments enable row level security;
alter table public.org_members enable row level security;
alter table public.org_people enable row level security;
alter table public.organizations enable row level security;
alter table public.project_elements enable row level security;
alter table public.project_files enable row level security;
alter table public.project_members enable row level security;
alter table public.project_mode_resolutions enable row level security;
alter table public.project_schedule_version_links enable row level security;
alter table public.project_schedule_version_tasks enable row level security;
alter table public.project_schedule_versions enable row level security;
alter table public.project_sections enable row level security;
alter table public.project_team enable row level security;
alter table public.projects enable row level security;
alter table public.ref_coefficients enable row level security;
alter table public.ref_departments enable row level security;
alter table public.ref_element_types enable row level security;
alter table public.ref_roles enable row level security;
alter table public.ref_sections enable row level security;
alter table public.ref_subsections enable row level security;
alter table public.ref_units enable row level security;
alter table public.ref_work_types enable row level security;
alter table public.resources enable row level security;
alter table public.role_split_rules enable row level security;
alter table public.schedule_task_actuals enable row level security;
alter table public.schedule_task_work_items enable row level security;
alter table public.sections enable row level security;
alter table public.tasks enable row level security;
alter table public.telegram_users enable row level security;
alter table public.timephased_work_week enable row level security;
alter table public.wbs_templates enable row level security;
alter table public.work_item_actuals enable row level security;
alter table public.work_items enable row level security;

-- ── Row Level Security: policies ────────────────────────────────────────────
create policy "al_d" on public.activity_log for delete to authenticated using (is_project_member(project_id));
create policy "al_i" on public.activity_log for insert to authenticated with check (is_project_member(project_id));
create policy "al_s" on public.activity_log for select to authenticated using (is_project_member(project_id));
create policy "al_u" on public.activity_log for update to authenticated using (is_project_member(project_id));
create policy "Members can create assignments" on public.assignments for insert to authenticated with check (is_project_member(project_id));
create policy "Members can delete assignments" on public.assignments for delete to authenticated using (is_project_member(project_id));
create policy "Members can update assignments" on public.assignments for update to authenticated using (is_project_member(project_id));
create policy "Members can view assignments" on public.assignments for select to authenticated using (is_project_member(project_id));
create policy "af_d" on public.audit_findings for delete to authenticated using (is_project_member(project_id));
create policy "af_i" on public.audit_findings for insert to authenticated with check (is_project_member(project_id));
create policy "af_s" on public.audit_findings for select to authenticated using (is_project_member(project_id));
create policy "af_u" on public.audit_findings for update to authenticated using (is_project_member(project_id));
create policy "ar_d" on public.audit_runs for delete to authenticated using (is_project_member(project_id));
create policy "ar_i" on public.audit_runs for insert to authenticated with check (is_project_member(project_id));
create policy "ar_s" on public.audit_runs for select to authenticated using (is_project_member(project_id));
create policy "ar_u" on public.audit_runs for update to authenticated using (is_project_member(project_id));
create policy "bs_d" on public.baseline_snapshots for delete to authenticated using (is_project_member(project_id));
create policy "bs_i" on public.baseline_snapshots for insert to authenticated with check (is_project_member(project_id));
create policy "bs_s" on public.baseline_snapshots for select to authenticated using (is_project_member(project_id));
create policy "bs_u" on public.baseline_snapshots for update to authenticated using (is_project_member(project_id));
create policy "bt_d" on public.baseline_tasks for delete to authenticated using (exists ( select 1 from baseline_snapshots bs where ((bs.id = baseline_tasks.baseline_id) and is_project_member(bs.project_id))));
create policy "bt_i" on public.baseline_tasks for insert to authenticated with check (exists ( select 1 from baseline_snapshots bs where ((bs.id = baseline_tasks.baseline_id) and is_project_member(bs.project_id))));
create policy "bt_s" on public.baseline_tasks for select to authenticated using (exists ( select 1 from baseline_snapshots bs where ((bs.id = baseline_tasks.baseline_id) and is_project_member(bs.project_id))));
create policy "calculation_audit_log_i" on public.calculation_audit_log for insert to authenticated with check (is_project_member(project_id));
create policy "calculation_audit_log_s" on public.calculation_audit_log for select to authenticated using (is_project_member(project_id));
create policy "calculation_versions_d" on public.calculation_versions for delete to authenticated using (is_project_member(project_id));
create policy "calculation_versions_i" on public.calculation_versions for insert to authenticated with check (is_project_member(project_id));
create policy "calculation_versions_s" on public.calculation_versions for select to authenticated using (is_project_member(project_id));
create policy "calculation_versions_u" on public.calculation_versions for update to authenticated using (is_project_member(project_id));
create policy "Anyone authenticated can create calendars" on public.calendars for insert to authenticated with check (true);
create policy "Anyone authenticated can use calendars" on public.calendars for select to authenticated using (true);
create policy "cl_i" on public.change_log for insert to authenticated with check (is_project_member(project_id));
create policy "cl_s" on public.change_log for select to authenticated using (is_project_member(project_id));
create policy "Authenticated can delete deps" on public.dependency_matrix for delete to authenticated using (true);
create policy "Authenticated can insert deps" on public.dependency_matrix for insert to authenticated with check (true);
create policy "Authenticated can read deps" on public.dependency_matrix for select to authenticated using (true);
create policy "Authenticated can update deps" on public.dependency_matrix for update to authenticated using (true);
create policy "Authenticated can delete durations" on public.duration_models for delete to authenticated using (true);
create policy "Authenticated can insert durations" on public.duration_models for insert to authenticated with check (true);
create policy "Authenticated can read durations" on public.duration_models for select to authenticated using (true);
create policy "Authenticated can update durations" on public.duration_models for update to authenticated using (true);
create policy "Authenticated can view library change log" on public.library_change_log for select to authenticated using (true);
create policy "Authenticated can view library item versions" on public.library_item_versions for select to authenticated using (true);
create policy "Authenticated can view library items" on public.library_items for select to authenticated using (true);
create policy "norm_matrix_read" on public.norm_matrix for select to authenticated using (true);
create policy "od_d" on public.org_departments for delete to authenticated using (is_org_member(org_id));
create policy "od_i" on public.org_departments for insert to authenticated with check (is_org_member(org_id));
create policy "od_s" on public.org_departments for select to authenticated using (is_org_member(org_id));
create policy "od_u" on public.org_departments for update to authenticated using (is_org_member(org_id));
create policy "om_delete" on public.org_members for delete to authenticated using (is_org_member(org_id));
create policy "om_insert" on public.org_members for insert to authenticated with check (((user_id = auth.uid()) or is_org_member(org_id)));
create policy "om_select" on public.org_members for select to authenticated using (is_org_member(org_id));
create policy "op_d" on public.org_people for delete to authenticated using (is_org_member(org_id));
create policy "op_i" on public.org_people for insert to authenticated with check (is_org_member(org_id));
create policy "op_s" on public.org_people for select to authenticated using (is_org_member(org_id));
create policy "op_u" on public.org_people for update to authenticated using (is_org_member(org_id));
create policy "org_insert" on public.organizations for insert to authenticated with check (true);
create policy "org_select" on public.organizations for select to authenticated using (is_org_member(id));
create policy "org_update" on public.organizations for update to authenticated using (is_org_member(id));
create policy "project_elements_d" on public.project_elements for delete to authenticated using (is_project_member(project_id));
create policy "project_elements_i" on public.project_elements for insert to authenticated with check (is_project_member(project_id));
create policy "project_elements_s" on public.project_elements for select to authenticated using (is_project_member(project_id));
create policy "project_elements_u" on public.project_elements for update to authenticated using (is_project_member(project_id));
create policy "pf_d" on public.project_files for delete to authenticated using (is_project_member(project_id));
create policy "pf_i" on public.project_files for insert to authenticated with check (is_project_member(project_id));
create policy "pf_s" on public.project_files for select to authenticated using (is_project_member(project_id));
create policy "pf_u" on public.project_files for update to authenticated using (is_project_member(project_id));
create policy "Members can add members" on public.project_members for insert to authenticated with check (true);
create policy "Members can remove members" on public.project_members for delete to authenticated using (is_project_member(project_id));
create policy "Members can view members" on public.project_members for select to authenticated using (is_project_member(project_id));
create policy "Members can create project mode resolutions" on public.project_mode_resolutions for insert to authenticated with check ((is_project_member(project_id) and ((created_by is null) or (created_by = auth.uid()))));
create policy "Members can delete project mode resolutions" on public.project_mode_resolutions for delete to authenticated using (is_project_member(project_id));
create policy "Members can update project mode resolutions" on public.project_mode_resolutions for update to authenticated using (is_project_member(project_id)) with check (is_project_member(project_id));
create policy "Members can view project mode resolutions" on public.project_mode_resolutions for select to authenticated using (is_project_member(project_id));
create policy "psvl_i" on public.project_schedule_version_links for insert to authenticated with check (exists ( select 1 from project_schedule_versions psv where ((psv.id = project_schedule_version_links.schedule_version_id) and is_project_member(psv.project_id))));
create policy "psvl_s" on public.project_schedule_version_links for select to authenticated using (exists ( select 1 from project_schedule_versions psv where ((psv.id = project_schedule_version_links.schedule_version_id) and is_project_member(psv.project_id))));
create policy "psvt_i" on public.project_schedule_version_tasks for insert to authenticated with check (exists ( select 1 from project_schedule_versions psv where ((psv.id = project_schedule_version_tasks.schedule_version_id) and is_project_member(psv.project_id))));
create policy "psvt_s" on public.project_schedule_version_tasks for select to authenticated using (exists ( select 1 from project_schedule_versions psv where ((psv.id = project_schedule_version_tasks.schedule_version_id) and is_project_member(psv.project_id))));
create policy "psv_i" on public.project_schedule_versions for insert to authenticated with check (is_project_member(project_id));
create policy "psv_s" on public.project_schedule_versions for select to authenticated using (is_project_member(project_id));
create policy "psv_u" on public.project_schedule_versions for update to authenticated using (is_project_member(project_id));
create policy "project_sections_d" on public.project_sections for delete to authenticated using (is_project_member(project_id));
create policy "project_sections_i" on public.project_sections for insert to authenticated with check (is_project_member(project_id));
create policy "project_sections_s" on public.project_sections for select to authenticated using (is_project_member(project_id));
create policy "project_sections_u" on public.project_sections for update to authenticated using (is_project_member(project_id));
create policy "ptm_d" on public.project_team for delete to authenticated using (is_project_member(project_id));
create policy "ptm_i" on public.project_team for insert to authenticated with check (is_project_member(project_id));
create policy "ptm_s" on public.project_team for select to authenticated using (is_project_member(project_id));
create policy "ptm_u" on public.project_team for update to authenticated using (is_project_member(project_id));
create policy "Authenticated can create projects" on public.projects for insert to authenticated with check (true);
create policy "Members can delete projects" on public.projects for delete to authenticated using (is_project_member(id));
create policy "Members can update projects" on public.projects for update to authenticated using (is_project_member(id));
create policy "Members can view projects" on public.projects for select to authenticated using (is_project_member(id));
create policy "ref_coefficients_read" on public.ref_coefficients for select to authenticated using (true);
create policy "ref_departments_read" on public.ref_departments for select to authenticated using (true);
create policy "ref_element_types_read" on public.ref_element_types for select to authenticated using (true);
create policy "ref_roles_read" on public.ref_roles for select to authenticated using (true);
create policy "ref_sections_read" on public.ref_sections for select to authenticated using (true);
create policy "ref_subsections_read" on public.ref_subsections for select to authenticated using (true);
create policy "ref_units_read" on public.ref_units for select to authenticated using (true);
create policy "ref_work_types_read" on public.ref_work_types for select to authenticated using (true);
create policy "Members can create resources" on public.resources for insert to authenticated with check (is_project_member(project_id));
create policy "Members can delete resources" on public.resources for delete to authenticated using (is_project_member(project_id));
create policy "Members can update resources" on public.resources for update to authenticated using (is_project_member(project_id));
create policy "Members can view resources" on public.resources for select to authenticated using (is_project_member(project_id));
create policy "Members can delete rules" on public.role_split_rules for delete to public using (is_project_member(project_id));
create policy "Members can insert rules" on public.role_split_rules for insert to public with check (is_project_member(project_id));
create policy "Members can update rules" on public.role_split_rules for update to public using (is_project_member(project_id));
create policy "Members can view rules" on public.role_split_rules for select to public using (is_project_member(project_id));
create policy "schedule_task_actuals_d" on public.schedule_task_actuals for delete to authenticated using (is_project_member(project_id));
create policy "schedule_task_actuals_i" on public.schedule_task_actuals for insert to authenticated with check (is_project_member(project_id));
create policy "schedule_task_actuals_s" on public.schedule_task_actuals for select to authenticated using (is_project_member(project_id));
create policy "schedule_task_actuals_u" on public.schedule_task_actuals for update to authenticated using (is_project_member(project_id));
create policy "schedule_task_work_items_d" on public.schedule_task_work_items for delete to authenticated using (exists ( select 1 from tasks t where ((t.id = schedule_task_work_items.schedule_task_id) and is_project_member(t.project_id))));
create policy "schedule_task_work_items_i" on public.schedule_task_work_items for insert to authenticated with check (exists ( select 1 from tasks t where ((t.id = schedule_task_work_items.schedule_task_id) and is_project_member(t.project_id))));
create policy "schedule_task_work_items_s" on public.schedule_task_work_items for select to authenticated using (exists ( select 1 from tasks t where ((t.id = schedule_task_work_items.schedule_task_id) and is_project_member(t.project_id))));
create policy "schedule_task_work_items_u" on public.schedule_task_work_items for update to authenticated using (exists ( select 1 from tasks t where ((t.id = schedule_task_work_items.schedule_task_id) and is_project_member(t.project_id))));
create policy "Authenticated can delete sections" on public.sections for delete to authenticated using (true);
create policy "Authenticated can insert sections" on public.sections for insert to authenticated with check (true);
create policy "Authenticated can read sections" on public.sections for select to authenticated using (true);
create policy "Authenticated can update sections" on public.sections for update to authenticated using (true);
create policy "Members can create tasks" on public.tasks for insert to authenticated with check (is_project_member(project_id));
create policy "Members can delete tasks" on public.tasks for delete to authenticated using (is_project_member(project_id));
create policy "Members can update tasks" on public.tasks for update to authenticated using (is_project_member(project_id));
create policy "Members can view tasks" on public.tasks for select to authenticated using (is_project_member(project_id));
create policy "tg_delete" on public.telegram_users for delete to authenticated using ((user_id = auth.uid()));
create policy "tg_insert" on public.telegram_users for insert to authenticated with check ((user_id = auth.uid()));
create policy "tg_select" on public.telegram_users for select to authenticated using ((user_id = auth.uid()));
create policy "Members can delete timephased" on public.timephased_work_week for delete to public using (is_project_member(project_id));
create policy "Members can insert timephased" on public.timephased_work_week for insert to public with check (is_project_member(project_id));
create policy "Members can update timephased" on public.timephased_work_week for update to public using (is_project_member(project_id));
create policy "Members can view timephased" on public.timephased_work_week for select to public using (is_project_member(project_id));
create policy "Authenticated can delete wbs" on public.wbs_templates for delete to authenticated using (true);
create policy "Authenticated can insert wbs" on public.wbs_templates for insert to authenticated with check (true);
create policy "Authenticated can read wbs" on public.wbs_templates for select to authenticated using (true);
create policy "Authenticated can update wbs" on public.wbs_templates for update to authenticated using (true);
create policy "work_item_actuals_d" on public.work_item_actuals for delete to authenticated using (is_project_member(project_id));
create policy "work_item_actuals_i" on public.work_item_actuals for insert to authenticated with check (is_project_member(project_id));
create policy "work_item_actuals_s" on public.work_item_actuals for select to authenticated using (is_project_member(project_id));
create policy "work_item_actuals_u" on public.work_item_actuals for update to authenticated using (is_project_member(project_id));
create policy "work_items_d" on public.work_items for delete to authenticated using (is_project_member(project_id));
create policy "work_items_i" on public.work_items for insert to authenticated with check (is_project_member(project_id));
create policy "work_items_s" on public.work_items for select to authenticated using (is_project_member(project_id));
create policy "work_items_u" on public.work_items for update to authenticated using (is_project_member(project_id));
