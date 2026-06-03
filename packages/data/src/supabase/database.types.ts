export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action_type: string
          created_at: string
          entity_id: string | null
          entity_name: string
          entity_type: string
          id: string
          metadata: Json
          project_id: string
          user_id: string | null
        }
        Insert: {
          action_type?: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string
          entity_type?: string
          id?: string
          metadata?: Json
          project_id: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string
          entity_type?: string
          id?: string
          metadata?: Json
          project_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          id: string
          mode: string
          project_id: string
          resource_id: string
          role: string | null
          split_pct: number | null
          task_id: string
          units_pct: number | null
          work_hours: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          project_id: string
          resource_id: string
          role?: string | null
          split_pct?: number | null
          task_id: string
          units_pct?: number | null
          work_hours?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          project_id?: string
          resource_id?: string
          role?: string | null
          split_pct?: number | null
          task_id?: string
          units_pct?: number | null
          work_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_findings: {
        Row: {
          audit_run_id: string
          created_at: string
          details: string
          id: string
          project_id: string
          rule_code: string
          schedule_version_id: string | null
          severity: string
          summary: string
          task_id: string | null
        }
        Insert: {
          audit_run_id: string
          created_at?: string
          details?: string
          id?: string
          project_id: string
          rule_code?: string
          schedule_version_id?: string | null
          severity?: string
          summary?: string
          task_id?: string | null
        }
        Update: {
          audit_run_id?: string
          created_at?: string
          details?: string
          id?: string
          project_id?: string
          rule_code?: string
          schedule_version_id?: string | null
          severity?: string
          summary?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_schedule_version_id_fkey"
            columns: ["schedule_version_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          file_id: string | null
          id: string
          project_id: string
          schedule_version_id: string | null
          severity: string
          started_at: string | null
          status: string
          summary: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          file_id?: string | null
          id?: string
          project_id: string
          schedule_version_id?: string | null
          severity?: string
          started_at?: string | null
          status?: string
          summary?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          file_id?: string | null
          id?: string
          project_id?: string
          schedule_version_id?: string | null
          severity?: string
          started_at?: string | null
          status?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_runs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_runs_schedule_version_id_fkey"
            columns: ["schedule_version_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      baseline_snapshots: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          baseline_type: string
          created_at: string
          id: string
          name: string
          project_id: string
          reason: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          baseline_type?: string
          created_at?: string
          id?: string
          name?: string
          project_id: string
          reason?: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          baseline_type?: string
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "baseline_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      baseline_tasks: {
        Row: {
          baseline_critical: boolean
          baseline_duration: number | null
          baseline_finish: string | null
          baseline_float: number | null
          baseline_id: string
          baseline_start: string | null
          baseline_work: number | null
          department: string
          id: string
          name: string
          responsible: string
          task_id: string
          wbs_code: string | null
        }
        Insert: {
          baseline_critical?: boolean
          baseline_duration?: number | null
          baseline_finish?: string | null
          baseline_float?: number | null
          baseline_id: string
          baseline_start?: string | null
          baseline_work?: number | null
          department?: string
          id?: string
          name?: string
          responsible?: string
          task_id: string
          wbs_code?: string | null
        }
        Update: {
          baseline_critical?: boolean
          baseline_duration?: number | null
          baseline_finish?: string | null
          baseline_float?: number | null
          baseline_id?: string
          baseline_start?: string | null
          baseline_work?: number | null
          department?: string
          id?: string
          name?: string
          responsible?: string
          task_id?: string
          wbs_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "baseline_tasks_baseline_id_fkey"
            columns: ["baseline_id"]
            isOneToOne: false
            referencedRelation: "baseline_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baseline_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      calculation_audit_log: {
        Row: {
          actor_user_id: string | null
          calculation_version_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id: string
          new_data: Json
          old_data: Json
          project_id: string
          reason: string | null
          schedule_task_id: string | null
          work_item_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          calculation_version_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id?: string
          new_data?: Json
          old_data?: Json
          project_id: string
          reason?: string | null
          schedule_task_id?: string | null
          work_item_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          calculation_version_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["audit_event_type"]
          id?: string
          new_data?: Json
          old_data?: Json
          project_id?: string
          reason?: string | null
          schedule_task_id?: string | null
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calculation_audit_log_calculation_version_id_fkey"
            columns: ["calculation_version_id"]
            isOneToOne: false
            referencedRelation: "calculation_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculation_audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculation_audit_log_schedule_task_id_fkey"
            columns: ["schedule_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculation_audit_log_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_work_item_effective_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculation_audit_log_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      calculation_versions: {
        Row: {
          based_on_version_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_current: boolean
          locked_at: string | null
          name: string
          project_id: string
          reason: string
          status: string
          version_no: number
        }
        Insert: {
          based_on_version_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          locked_at?: string | null
          name: string
          project_id: string
          reason?: string
          status?: string
          version_no: number
        }
        Update: {
          based_on_version_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          locked_at?: string | null
          name?: string
          project_id?: string
          reason?: string
          status?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "calculation_versions_based_on_version_id_fkey"
            columns: ["based_on_version_id"]
            isOneToOne: false
            referencedRelation: "calculation_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculation_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          exceptions: Json | null
          hours_per_day: number
          id: string
          name: string
          working_days: number[]
        }
        Insert: {
          exceptions?: Json | null
          hours_per_day?: number
          id?: string
          name: string
          working_days?: number[]
        }
        Update: {
          exceptions?: Json | null
          hours_per_day?: number
          id?: string
          name?: string
          working_days?: number[]
        }
        Relationships: []
      }
      change_log: {
        Row: {
          created_at: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          project_id: string
          reason: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          project_id: string
          reason?: string
          task_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          project_id?: string
          reason?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      dependency_matrix: {
        Row: {
          created_at: string
          description: string
          description_en: string
          from_section: string
          id: string
          lag_days: number
          link_type: string
          object_type: string
          to_section: string
        }
        Insert: {
          created_at?: string
          description?: string
          description_en?: string
          from_section: string
          id?: string
          lag_days?: number
          link_type?: string
          object_type: string
          to_section: string
        }
        Update: {
          created_at?: string
          description?: string
          description_en?: string
          from_section?: string
          id?: string
          lag_days?: number
          link_type?: string
          object_type?: string
          to_section?: string
        }
        Relationships: []
      }
      duration_models: {
        Row: {
          base_duration_days: number
          created_at: string
          description: string
          description_en: string
          driver_section: string
          formula: string
          id: string
          object_type: string
          section_code: string
        }
        Insert: {
          base_duration_days?: number
          created_at?: string
          description?: string
          description_en?: string
          driver_section?: string
          formula?: string
          id?: string
          object_type?: string
          section_code: string
        }
        Update: {
          base_duration_days?: number
          created_at?: string
          description?: string
          description_en?: string
          driver_section?: string
          formula?: string
          id?: string
          object_type?: string
          section_code?: string
        }
        Relationships: []
      }
      library_change_log: {
        Row: {
          action_type: string
          created_at: string
          created_by: string | null
          details: Json
          from_status: string | null
          id: string
          library_item_id: string
          summary: string
          to_status: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          created_by?: string | null
          details?: Json
          from_status?: string | null
          id?: string
          library_item_id: string
          summary: string
          to_status?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          details?: Json
          from_status?: string | null
          id?: string
          library_item_id?: string
          summary?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_change_log_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
        ]
      }
      library_item_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          library_item_id: string
          note: string | null
          publish_state: string
          snapshot: Json
          status: string
          validation_state: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          library_item_id: string
          note?: string | null
          publish_state: string
          snapshot?: Json
          status: string
          validation_state: string
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          library_item_id?: string
          note?: string | null
          publish_state?: string
          snapshot?: Json
          status?: string
          validation_state?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_item_versions_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
        ]
      }
      library_items: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_code: string
          name: string
          owner_role: string
          payload: Json
          publish_state: string
          reviewer_role: string
          scope: Json
          section: string
          status: string
          summary: Json
          tags: Json
          updated_at: string
          updated_by: string | null
          validation_state: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_code: string
          name: string
          owner_role?: string
          payload?: Json
          publish_state?: string
          reviewer_role?: string
          scope?: Json
          section: string
          status?: string
          summary?: Json
          tags?: Json
          updated_at?: string
          updated_by?: string | null
          validation_state?: string
          version?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_code?: string
          name?: string
          owner_role?: string
          payload?: Json
          publish_state?: string
          reviewer_role?: string
          scope?: Json
          section?: string
          status?: string
          summary?: Json
          tags?: Json
          updated_at?: string
          updated_by?: string | null
          validation_state?: string
          version?: string
        }
        Relationships: []
      }
      norm_matrix: {
        Row: {
          base_norm_value: number
          complexity_factor_default: number
          created_at: string
          effective_from: string
          effective_to: string | null
          element_type_id: string
          id: string
          is_active: boolean
          max_value: number | null
          min_value: number | null
          optional_conditions_json: Json
          repeat_factor_default: number
          role_id: string
          section_id: string | null
          stage_factor_default: number
          subsection_id: string | null
          unit_id: string
          version: string
          work_type_id: string
        }
        Insert: {
          base_norm_value: number
          complexity_factor_default?: number
          created_at?: string
          effective_from: string
          effective_to?: string | null
          element_type_id: string
          id?: string
          is_active?: boolean
          max_value?: number | null
          min_value?: number | null
          optional_conditions_json?: Json
          repeat_factor_default?: number
          role_id: string
          section_id?: string | null
          stage_factor_default?: number
          subsection_id?: string | null
          unit_id: string
          version: string
          work_type_id: string
        }
        Update: {
          base_norm_value?: number
          complexity_factor_default?: number
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          element_type_id?: string
          id?: string
          is_active?: boolean
          max_value?: number | null
          min_value?: number | null
          optional_conditions_json?: Json
          repeat_factor_default?: number
          role_id?: string
          section_id?: string | null
          stage_factor_default?: number
          subsection_id?: string | null
          unit_id?: string
          version?: string
          work_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "norm_matrix_element_type_id_fkey"
            columns: ["element_type_id"]
            isOneToOne: false
            referencedRelation: "ref_element_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norm_matrix_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "ref_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norm_matrix_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "ref_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norm_matrix_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "ref_subsections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norm_matrix_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "ref_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norm_matrix_work_type_id_fkey"
            columns: ["work_type_id"]
            isOneToOne: false
            referencedRelation: "ref_work_types"
            referencedColumns: ["id"]
          },
        ]
      }
      org_departments: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          name_en: string
          org_id: string
          sort_order: number
        }
        Insert: {
          code?: string
          created_at?: string
          id?: string
          name: string
          name_en?: string
          org_id: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          name_en?: string
          org_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_departments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_people: {
        Row: {
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          org_id: string
          position: string
          role: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email?: string
          full_name: string
          id?: string
          is_active?: boolean
          org_id: string
          position?: string
          role?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          org_id?: string
          position?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_people_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "org_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_people_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      project_elements: {
        Row: {
          calculation_version_id: string
          created_at: string
          department_id: string | null
          element_name: string
          element_type_id: string
          id: string
          notes: string
          project_id: string
          section_id: string | null
          source_of_volume: string
          status: Database["public"]["Enums"]["element_status"]
          subsection_id: string | null
          unit_id: string
          updated_at: string
          volume: number
          work_package: string
        }
        Insert: {
          calculation_version_id: string
          created_at?: string
          department_id?: string | null
          element_name: string
          element_type_id: string
          id?: string
          notes?: string
          project_id: string
          section_id?: string | null
          source_of_volume: string
          status?: Database["public"]["Enums"]["element_status"]
          subsection_id?: string | null
          unit_id: string
          updated_at?: string
          volume: number
          work_package?: string
        }
        Update: {
          calculation_version_id?: string
          created_at?: string
          department_id?: string | null
          element_name?: string
          element_type_id?: string
          id?: string
          notes?: string
          project_id?: string
          section_id?: string | null
          source_of_volume?: string
          status?: Database["public"]["Enums"]["element_status"]
          subsection_id?: string | null
          unit_id?: string
          updated_at?: string
          volume?: number
          work_package?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_elements_calculation_version_id_fkey"
            columns: ["calculation_version_id"]
            isOneToOne: false
            referencedRelation: "calculation_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_elements_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "ref_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_elements_element_type_id_fkey"
            columns: ["element_type_id"]
            isOneToOne: false
            referencedRelation: "ref_element_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_elements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_elements_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "ref_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_elements_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "ref_subsections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_elements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "ref_units"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string
          file_name: string
          file_type: string
          id: string
          metadata: Json
          processing_status: string
          project_id: string
          storage_path: string
          upload_date: string
          uploaded_by: string | null
          version_label: string
          version_mode: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string
          id?: string
          metadata?: Json
          processing_status?: string
          project_id: string
          storage_path?: string
          upload_date?: string
          uploaded_by?: string | null
          version_label?: string
          version_mode?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string
          id?: string
          metadata?: Json
          processing_status?: string
          project_id?: string
          storage_path?: string
          upload_date?: string
          uploaded_by?: string | null
          version_label?: string
          version_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_mode_resolutions: {
        Row: {
          active_roles: Json
          confidence: number
          conflicts: Json
          created_at: string
          created_by: string | null
          id: string
          is_locked: boolean
          master_profile_code: string
          needs_user_confirmation: boolean
          project_class: string | null
          project_id: string
          project_type: string | null
          rationale: Json
          router_version: string
          scenario: string | null
          secondary_profile_codes: Json
          source_kind: string
          source_type: string
        }
        Insert: {
          active_roles?: Json
          confidence?: number
          conflicts?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_locked?: boolean
          master_profile_code: string
          needs_user_confirmation?: boolean
          project_class?: string | null
          project_id: string
          project_type?: string | null
          rationale?: Json
          router_version?: string
          scenario?: string | null
          secondary_profile_codes?: Json
          source_kind: string
          source_type: string
        }
        Update: {
          active_roles?: Json
          confidence?: number
          conflicts?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_locked?: boolean
          master_profile_code?: string
          needs_user_confirmation?: boolean
          project_class?: string | null
          project_id?: string
          project_type?: string | null
          rationale?: Json
          router_version?: string
          scenario?: string | null
          secondary_profile_codes?: Json
          source_kind?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_mode_resolutions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_schedule_version_links: {
        Row: {
          id: string
          lag_days: number
          link_type: string
          predecessor_task_row_id: string | null
          predecessor_wbs_code: string | null
          schedule_version_id: string
          successor_task_row_id: string | null
          successor_wbs_code: string | null
        }
        Insert: {
          id?: string
          lag_days?: number
          link_type?: string
          predecessor_task_row_id?: string | null
          predecessor_wbs_code?: string | null
          schedule_version_id: string
          successor_task_row_id?: string | null
          successor_wbs_code?: string | null
        }
        Update: {
          id?: string
          lag_days?: number
          link_type?: string
          predecessor_task_row_id?: string | null
          predecessor_wbs_code?: string | null
          schedule_version_id?: string
          successor_task_row_id?: string | null
          successor_wbs_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_schedule_version_links_schedule_version_id_fkey"
            columns: ["schedule_version_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_schedule_version_tasks: {
        Row: {
          actual_finish: string | null
          actual_start: string | null
          actual_work: number | null
          baseline_finish: string | null
          baseline_start: string | null
          comment: string
          current_total_productivity: number | null
          department: string
          done_volume: number | null
          forecast_finish: string | null
          forecast_start: string | null
          id: string
          is_delayed: boolean
          name: string
          object_name: string
          organization: string
          percent_complete: number | null
          physical_percent_complete: number | null
          planned_duration: number | null
          planned_finish: string | null
          planned_productivity: number | null
          planned_start: string | null
          predecessors_json: Json
          remaining_duration: number | null
          remaining_work: number | null
          responsible: string
          row_type: string
          schedule_variance_days: number | null
          schedule_version_id: string
          sort_order: number
          stage: string
          task_row_id: string | null
          task_status: string | null
          total_volume: number | null
          wbs_code: string
          work: number | null
        }
        Insert: {
          actual_finish?: string | null
          actual_start?: string | null
          actual_work?: number | null
          baseline_finish?: string | null
          baseline_start?: string | null
          comment?: string
          current_total_productivity?: number | null
          department?: string
          done_volume?: number | null
          forecast_finish?: string | null
          forecast_start?: string | null
          id?: string
          is_delayed?: boolean
          name?: string
          object_name?: string
          organization?: string
          percent_complete?: number | null
          physical_percent_complete?: number | null
          planned_duration?: number | null
          planned_finish?: string | null
          planned_productivity?: number | null
          planned_start?: string | null
          predecessors_json?: Json
          remaining_duration?: number | null
          remaining_work?: number | null
          responsible?: string
          row_type?: string
          schedule_variance_days?: number | null
          schedule_version_id: string
          sort_order?: number
          stage?: string
          task_row_id?: string | null
          task_status?: string | null
          total_volume?: number | null
          wbs_code?: string
          work?: number | null
        }
        Update: {
          actual_finish?: string | null
          actual_start?: string | null
          actual_work?: number | null
          baseline_finish?: string | null
          baseline_start?: string | null
          comment?: string
          current_total_productivity?: number | null
          department?: string
          done_volume?: number | null
          forecast_finish?: string | null
          forecast_start?: string | null
          id?: string
          is_delayed?: boolean
          name?: string
          object_name?: string
          organization?: string
          percent_complete?: number | null
          physical_percent_complete?: number | null
          planned_duration?: number | null
          planned_finish?: string | null
          planned_productivity?: number | null
          planned_start?: string | null
          predecessors_json?: Json
          remaining_duration?: number | null
          remaining_work?: number | null
          responsible?: string
          row_type?: string
          schedule_variance_days?: number | null
          schedule_version_id?: string
          sort_order?: number
          stage?: string
          task_row_id?: string | null
          task_status?: string | null
          total_volume?: number | null
          wbs_code?: string
          work?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_schedule_version_tasks_schedule_version_id_fkey"
            columns: ["schedule_version_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_schedule_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_current: boolean
          previous_version_id: string | null
          project_id: string
          reason: string
          source_file_id: string | null
          version_kind: string
          version_label: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          previous_version_id?: string | null
          project_id: string
          reason?: string
          source_file_id?: string | null
          version_kind?: string
          version_label?: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          previous_version_id?: string | null
          project_id?: string
          reason?: string
          source_file_id?: string | null
          version_kind?: string
          version_label?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_schedule_versions_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_schedule_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_schedule_versions_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sections: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          notes: string
          project_id: string
          section_id: string
          status: string
          subsection_id: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          notes?: string
          project_id: string
          section_id: string
          status?: string
          subsection_id?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          notes?: string
          project_id?: string
          section_id?: string
          status?: string
          subsection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_sections_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "ref_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "ref_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sections_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "ref_subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team: {
        Row: {
          created_at: string
          department: string
          id: string
          is_lead: boolean
          name: string
          person_id: string | null
          project_id: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          department?: string
          id?: string
          is_lead?: boolean
          name?: string
          person_id?: string | null
          project_id: string
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          is_lead?: boolean
          name?: string
          person_id?: string | null
          project_id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_team_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "org_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          active_mode_resolution_id: string | null
          created_at: string
          description: string
          id: string
          last_mode_confirmed_at: string | null
          last_mode_source: string | null
          mode_locked: boolean
          name: string
          object_type: string
          organization_id: string | null
          project_status_date: string | null
          project_timezone: string
          stage: string
          status: string
        }
        Insert: {
          active_mode_resolution_id?: string | null
          created_at?: string
          description?: string
          id?: string
          last_mode_confirmed_at?: string | null
          last_mode_source?: string | null
          mode_locked?: boolean
          name: string
          object_type?: string
          organization_id?: string | null
          project_status_date?: string | null
          project_timezone?: string
          stage?: string
          status?: string
        }
        Update: {
          active_mode_resolution_id?: string | null
          created_at?: string
          description?: string
          id?: string
          last_mode_confirmed_at?: string | null
          last_mode_source?: string | null
          mode_locked?: boolean
          name?: string
          object_type?: string
          organization_id?: string | null
          project_status_date?: string | null
          project_timezone?: string
          stage?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_active_mode_resolution_id_fkey"
            columns: ["active_mode_resolution_id"]
            isOneToOne: false
            referencedRelation: "project_mode_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_coefficients: {
        Row: {
          applies_to: string[]
          code: string
          coefficient_type: string
          conditions_json: Json
          created_at: string
          default_value: number
          id: string
          is_active: boolean
          max_value: number | null
          min_value: number | null
          name: string
        }
        Insert: {
          applies_to?: string[]
          code: string
          coefficient_type: string
          conditions_json?: Json
          created_at?: string
          default_value: number
          id?: string
          is_active?: boolean
          max_value?: number | null
          min_value?: number | null
          name: string
        }
        Update: {
          applies_to?: string[]
          code?: string
          coefficient_type?: string
          conditions_json?: Json
          created_at?: string
          default_value?: number
          id?: string
          is_active?: boolean
          max_value?: number | null
          min_value?: number | null
          name?: string
        }
        Relationships: []
      }
      ref_departments: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      ref_element_types: {
        Row: {
          category: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      ref_roles: {
        Row: {
          code: string
          created_at: string
          department_id: string | null
          hours_per_day: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          department_id?: string | null
          hours_per_day?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string | null
          hours_per_day?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ref_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "ref_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_sections: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      ref_subsections: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          section_id: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
          section_id: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          section_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ref_subsections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "ref_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_units: {
        Row: {
          code: string
          created_at: string
          decimals: number
          dimension_group: string
          id: string
          is_active: boolean
          name: string
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string
          decimals?: number
          dimension_group: string
          id?: string
          is_active?: boolean
          name: string
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string
          decimals?: number
          dimension_group?: string
          id?: string
          is_active?: boolean
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      ref_work_types: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          calendar_id: string | null
          cost_rate: number | null
          dept: string | null
          fte: number
          id: string
          is_active: boolean
          name: string
          org: string | null
          project_id: string
          role: string | null
        }
        Insert: {
          calendar_id?: string | null
          cost_rate?: number | null
          dept?: string | null
          fte?: number
          id?: string
          is_active?: boolean
          name: string
          org?: string | null
          project_id: string
          role?: string | null
        }
        Update: {
          calendar_id?: string | null
          cost_rate?: number | null
          dept?: string | null
          fte?: number
          id?: string
          is_active?: boolean
          name?: string
          org?: string | null
          project_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      role_split_rules: {
        Row: {
          eng_pct: number
          gip_pct: number
          id: string
          is_active: boolean
          lead_pct: number
          project_id: string
          scope_type: string
          scope_value: string
        }
        Insert: {
          eng_pct?: number
          gip_pct?: number
          id?: string
          is_active?: boolean
          lead_pct?: number
          project_id: string
          scope_type?: string
          scope_value?: string
        }
        Update: {
          eng_pct?: number
          gip_pct?: number
          id?: string
          is_active?: boolean
          lead_pct?: number
          project_id?: string
          scope_type?: string
          scope_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_split_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_task_actuals: {
        Row: {
          actual_finish: string | null
          actual_labor_days: number | null
          actual_productivity: number | null
          actual_start: string | null
          actual_volume: number | null
          created_at: string
          forecast_finish: string | null
          forecast_remaining_labor: number | null
          id: string
          percent_complete: number | null
          planned_duration_days: number | null
          planned_labor_days: number | null
          planned_volume: number | null
          project_id: string
          schedule_task_id: string
          status_date: string
          variance_duration: number | null
          variance_labor: number | null
          variance_volume: number | null
        }
        Insert: {
          actual_finish?: string | null
          actual_labor_days?: number | null
          actual_productivity?: number | null
          actual_start?: string | null
          actual_volume?: number | null
          created_at?: string
          forecast_finish?: string | null
          forecast_remaining_labor?: number | null
          id?: string
          percent_complete?: number | null
          planned_duration_days?: number | null
          planned_labor_days?: number | null
          planned_volume?: number | null
          project_id: string
          schedule_task_id: string
          status_date: string
          variance_duration?: number | null
          variance_labor?: number | null
          variance_volume?: number | null
        }
        Update: {
          actual_finish?: string | null
          actual_labor_days?: number | null
          actual_productivity?: number | null
          actual_start?: string | null
          actual_volume?: number | null
          created_at?: string
          forecast_finish?: string | null
          forecast_remaining_labor?: number | null
          id?: string
          percent_complete?: number | null
          planned_duration_days?: number | null
          planned_labor_days?: number | null
          planned_volume?: number | null
          project_id?: string
          schedule_task_id?: string
          status_date?: string
          variance_duration?: number | null
          variance_labor?: number | null
          variance_volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_task_actuals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_task_actuals_schedule_task_id_fkey"
            columns: ["schedule_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_task_work_items: {
        Row: {
          contribution_mode: Database["public"]["Enums"]["contribution_mode"]
          contribution_share: number
          created_at: string
          id: string
          schedule_task_id: string
          work_item_id: string
        }
        Insert: {
          contribution_mode?: Database["public"]["Enums"]["contribution_mode"]
          contribution_share?: number
          created_at?: string
          id?: string
          schedule_task_id: string
          work_item_id: string
        }
        Update: {
          contribution_mode?: Database["public"]["Enums"]["contribution_mode"]
          contribution_share?: number
          created_at?: string
          id?: string
          schedule_task_id?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_task_work_items_schedule_task_id_fkey"
            columns: ["schedule_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_task_work_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_work_item_effective_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_task_work_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string
          department: string
          id: string
          is_default: boolean
          object_types: string[]
          section_code: string
          section_name: string
          section_name_en: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          department?: string
          id?: string
          is_default?: boolean
          object_types?: string[]
          section_code: string
          section_name: string
          section_name_en?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          is_default?: boolean
          object_types?: string[]
          section_code?: string
          section_name?: string
          section_name_en?: string
          sort_order?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actual_finish: string | null
          actual_start: string | null
          actual_work: number | null
          baseline_finish: string | null
          baseline_start: string | null
          calculated_duration_variance_days: number | null
          calendar_id: string | null
          comment: string
          current_total_productivity: number | null
          department: string
          done_volume: number | null
          duration_days: number | null
          duration_hours: number | null
          duration_variance: number | null
          early_finish: string | null
          early_start: string | null
          finish_date: string | null
          finish_variance: number | null
          forecast_finish: string | null
          forecast_start: string | null
          free_float: number | null
          id: string
          is_critical: boolean
          late_finish: string | null
          late_start: string | null
          name: string
          norm_work_hours: number | null
          object: string
          organization: string
          percent_complete: number | null
          physical_percent_complete: number | null
          planned_productivity: number | null
          planned_work_hours: number | null
          predecessors: Json
          project_id: string
          remaining_duration: number | null
          remaining_work: number | null
          responsible: string
          row_type: string
          schedule_source: Database["public"]["Enums"]["schedule_source"]
          sort_order: number
          stage: string
          start_date: string | null
          start_variance: number | null
          suggested_duration_days: number | null
          suggested_labor_days: number | null
          sync_reason: string | null
          sync_state: Database["public"]["Enums"]["sync_state"]
          task_status: string
          total_float: number | null
          total_volume: number | null
          wbs_code: string | null
          work: number | null
        }
        Insert: {
          actual_finish?: string | null
          actual_start?: string | null
          actual_work?: number | null
          baseline_finish?: string | null
          baseline_start?: string | null
          calculated_duration_variance_days?: number | null
          calendar_id?: string | null
          comment?: string
          current_total_productivity?: number | null
          department?: string
          done_volume?: number | null
          duration_days?: number | null
          duration_hours?: number | null
          duration_variance?: number | null
          early_finish?: string | null
          early_start?: string | null
          finish_date?: string | null
          finish_variance?: number | null
          forecast_finish?: string | null
          forecast_start?: string | null
          free_float?: number | null
          id?: string
          is_critical?: boolean
          late_finish?: string | null
          late_start?: string | null
          name: string
          norm_work_hours?: number | null
          object?: string
          organization?: string
          percent_complete?: number | null
          physical_percent_complete?: number | null
          planned_productivity?: number | null
          planned_work_hours?: number | null
          predecessors?: Json
          project_id: string
          remaining_duration?: number | null
          remaining_work?: number | null
          responsible?: string
          row_type?: string
          schedule_source?: Database["public"]["Enums"]["schedule_source"]
          sort_order?: number
          stage?: string
          start_date?: string | null
          start_variance?: number | null
          suggested_duration_days?: number | null
          suggested_labor_days?: number | null
          sync_reason?: string | null
          sync_state?: Database["public"]["Enums"]["sync_state"]
          task_status?: string
          total_float?: number | null
          total_volume?: number | null
          wbs_code?: string | null
          work?: number | null
        }
        Update: {
          actual_finish?: string | null
          actual_start?: string | null
          actual_work?: number | null
          baseline_finish?: string | null
          baseline_start?: string | null
          calculated_duration_variance_days?: number | null
          calendar_id?: string | null
          comment?: string
          current_total_productivity?: number | null
          department?: string
          done_volume?: number | null
          duration_days?: number | null
          duration_hours?: number | null
          duration_variance?: number | null
          early_finish?: string | null
          early_start?: string | null
          finish_date?: string | null
          finish_variance?: number | null
          forecast_finish?: string | null
          forecast_start?: string | null
          free_float?: number | null
          id?: string
          is_critical?: boolean
          late_finish?: string | null
          late_start?: string | null
          name?: string
          norm_work_hours?: number | null
          object?: string
          organization?: string
          percent_complete?: number | null
          physical_percent_complete?: number | null
          planned_productivity?: number | null
          planned_work_hours?: number | null
          predecessors?: Json
          project_id?: string
          remaining_duration?: number | null
          remaining_work?: number | null
          responsible?: string
          row_type?: string
          schedule_source?: Database["public"]["Enums"]["schedule_source"]
          sort_order?: number
          stage?: string
          start_date?: string | null
          start_variance?: number | null
          suggested_duration_days?: number | null
          suggested_labor_days?: number | null
          sync_reason?: string | null
          sync_state?: Database["public"]["Enums"]["sync_state"]
          task_status?: string
          total_float?: number | null
          total_volume?: number | null
          wbs_code?: string | null
          work?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_users: {
        Row: {
          id: string
          is_active: boolean
          linked_at: string
          telegram_chat_id: number
          telegram_username: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          linked_at?: string
          telegram_chat_id: number
          telegram_username?: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          linked_at?: string
          telegram_chat_id?: number
          telegram_username?: string
          user_id?: string
        }
        Relationships: []
      }
      timephased_work_week: {
        Row: {
          project_id: string
          resource_id: string
          task_id: string
          week_start: string
          work_hours: number
        }
        Insert: {
          project_id: string
          resource_id: string
          task_id: string
          week_start: string
          work_hours?: number
        }
        Update: {
          project_id?: string
          resource_id?: string
          task_id?: string
          week_start?: string
          work_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "timephased_work_week_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timephased_work_week_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timephased_work_week_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      wbs_templates: {
        Row: {
          created_at: string
          id: string
          is_driver: boolean
          object_type: string
          parent_code: string
          section_code: string
          sort_order: number
          task_code: string
          task_name: string
          task_name_en: string
          wbs_level: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_driver?: boolean
          object_type: string
          parent_code?: string
          section_code?: string
          sort_order?: number
          task_code: string
          task_name: string
          task_name_en?: string
          wbs_level?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_driver?: boolean
          object_type?: string
          parent_code?: string
          section_code?: string
          sort_order?: number
          task_code?: string
          task_name?: string
          task_name_en?: string
          wbs_level?: number
        }
        Relationships: []
      }
      work_item_actuals: {
        Row: {
          actual_finish: string | null
          actual_labor_days: number | null
          actual_productivity: number | null
          actual_start: string | null
          actual_volume: number | null
          created_at: string
          forecast_finish: string | null
          forecast_remaining_labor: number | null
          id: string
          percent_complete: number | null
          planned_duration_days: number | null
          planned_labor_days: number | null
          planned_volume: number | null
          project_id: string
          status_date: string
          variance_duration: number | null
          variance_labor: number | null
          variance_volume: number | null
          work_item_id: string
        }
        Insert: {
          actual_finish?: string | null
          actual_labor_days?: number | null
          actual_productivity?: number | null
          actual_start?: string | null
          actual_volume?: number | null
          created_at?: string
          forecast_finish?: string | null
          forecast_remaining_labor?: number | null
          id?: string
          percent_complete?: number | null
          planned_duration_days?: number | null
          planned_labor_days?: number | null
          planned_volume?: number | null
          project_id: string
          status_date: string
          variance_duration?: number | null
          variance_labor?: number | null
          variance_volume?: number | null
          work_item_id: string
        }
        Update: {
          actual_finish?: string | null
          actual_labor_days?: number | null
          actual_productivity?: number | null
          actual_start?: string | null
          actual_volume?: number | null
          created_at?: string
          forecast_finish?: string | null
          forecast_remaining_labor?: number | null
          id?: string
          percent_complete?: number | null
          planned_duration_days?: number | null
          planned_labor_days?: number | null
          planned_volume?: number | null
          project_id?: string
          status_date?: string
          variance_duration?: number | null
          variance_labor?: number | null
          variance_volume?: number | null
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_actuals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_actuals_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "v_work_item_effective_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_actuals_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_items: {
        Row: {
          applied_volume: number
          assigned_resource_count: number | null
          base_norm_per_unit: number | null
          calc_status: Database["public"]["Enums"]["calc_status"]
          calculated_duration_days: number | null
          calculated_labor_days: number | null
          calculated_labor_hours: number | null
          calculation_version_id: string
          created_at: string
          factor_complexity: number
          factor_custom: number
          factor_repeat: number
          factor_stage: number
          id: string
          manual_override_duration_days: number | null
          manual_override_labor_days: number | null
          norm_id: string | null
          override_reason: string | null
          project_element_id: string
          project_id: string
          role_id: string
          source_of_calculation: string
          status: string
          updated_at: string
          work_type_id: string
        }
        Insert: {
          applied_volume: number
          assigned_resource_count?: number | null
          base_norm_per_unit?: number | null
          calc_status?: Database["public"]["Enums"]["calc_status"]
          calculated_duration_days?: number | null
          calculated_labor_days?: number | null
          calculated_labor_hours?: number | null
          calculation_version_id: string
          created_at?: string
          factor_complexity?: number
          factor_custom?: number
          factor_repeat?: number
          factor_stage?: number
          id?: string
          manual_override_duration_days?: number | null
          manual_override_labor_days?: number | null
          norm_id?: string | null
          override_reason?: string | null
          project_element_id: string
          project_id: string
          role_id: string
          source_of_calculation?: string
          status?: string
          updated_at?: string
          work_type_id: string
        }
        Update: {
          applied_volume?: number
          assigned_resource_count?: number | null
          base_norm_per_unit?: number | null
          calc_status?: Database["public"]["Enums"]["calc_status"]
          calculated_duration_days?: number | null
          calculated_labor_days?: number | null
          calculated_labor_hours?: number | null
          calculation_version_id?: string
          created_at?: string
          factor_complexity?: number
          factor_custom?: number
          factor_repeat?: number
          factor_stage?: number
          id?: string
          manual_override_duration_days?: number | null
          manual_override_labor_days?: number | null
          norm_id?: string | null
          override_reason?: string | null
          project_element_id?: string
          project_id?: string
          role_id?: string
          source_of_calculation?: string
          status?: string
          updated_at?: string
          work_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_items_calculation_version_id_fkey"
            columns: ["calculation_version_id"]
            isOneToOne: false
            referencedRelation: "calculation_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_norm_id_fkey"
            columns: ["norm_id"]
            isOneToOne: false
            referencedRelation: "norm_matrix"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_project_element_id_fkey"
            columns: ["project_element_id"]
            isOneToOne: false
            referencedRelation: "project_elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "ref_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_work_type_id_fkey"
            columns: ["work_type_id"]
            isOneToOne: false
            referencedRelation: "ref_work_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_dept_week_load: {
        Row: {
          capacity_hours: number | null
          dept: string | null
          load_hours: number | null
          overload_hours: number | null
          project_id: string | null
          utilization_pct: number | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_resource_week_load: {
        Row: {
          capacity_hours: number | null
          dept: string | null
          load_hours: number | null
          overload_hours: number | null
          project_id: string | null
          resource_id: string | null
          resource_name: string | null
          resource_role: string | null
          utilization_pct: number | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timephased_work_week_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      v_schedule_task_work_item_aggregates: {
        Row: {
          aggregated_volume: number | null
          has_missing_norm: boolean | null
          has_missing_resource: boolean | null
          has_override: boolean | null
          linked_work_item_count: number | null
          naive_suggested_duration_days: number | null
          project_id: string | null
          schedule_task_id: string | null
          suggested_labor_days: number | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_task_work_items_schedule_task_id_fkey"
            columns: ["schedule_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_work_item_effective_values: {
        Row: {
          applied_volume: number | null
          assigned_resource_count: number | null
          base_norm_per_unit: number | null
          calc_status: Database["public"]["Enums"]["calc_status"] | null
          calculated_duration_days: number | null
          calculated_labor_days: number | null
          calculated_labor_hours: number | null
          calculation_version_id: string | null
          created_at: string | null
          effective_duration_days: number | null
          effective_labor_days: number | null
          factor_complexity: number | null
          factor_custom: number | null
          factor_repeat: number | null
          factor_stage: number | null
          id: string | null
          manual_override_duration_days: number | null
          manual_override_labor_days: number | null
          norm_id: string | null
          override_reason: string | null
          project_element_id: string | null
          project_id: string | null
          role_id: string | null
          source_of_calculation: string | null
          status: string | null
          updated_at: string | null
          work_type_id: string | null
        }
        Insert: {
          applied_volume?: number | null
          assigned_resource_count?: number | null
          base_norm_per_unit?: number | null
          calc_status?: Database["public"]["Enums"]["calc_status"] | null
          calculated_duration_days?: number | null
          calculated_labor_days?: number | null
          calculated_labor_hours?: number | null
          calculation_version_id?: string | null
          created_at?: string | null
          effective_duration_days?: never
          effective_labor_days?: never
          factor_complexity?: number | null
          factor_custom?: number | null
          factor_repeat?: number | null
          factor_stage?: number | null
          id?: string | null
          manual_override_duration_days?: number | null
          manual_override_labor_days?: number | null
          norm_id?: string | null
          override_reason?: string | null
          project_element_id?: string | null
          project_id?: string | null
          role_id?: string | null
          source_of_calculation?: string | null
          status?: string | null
          updated_at?: string | null
          work_type_id?: string | null
        }
        Update: {
          applied_volume?: number | null
          assigned_resource_count?: number | null
          base_norm_per_unit?: number | null
          calc_status?: Database["public"]["Enums"]["calc_status"] | null
          calculated_duration_days?: number | null
          calculated_labor_days?: number | null
          calculated_labor_hours?: number | null
          calculation_version_id?: string | null
          created_at?: string | null
          effective_duration_days?: never
          effective_labor_days?: never
          factor_complexity?: number | null
          factor_custom?: number | null
          factor_repeat?: number | null
          factor_stage?: number | null
          id?: string | null
          manual_override_duration_days?: number | null
          manual_override_labor_days?: number | null
          norm_id?: string | null
          override_reason?: string | null
          project_element_id?: string | null
          project_id?: string | null
          role_id?: string | null
          source_of_calculation?: string | null
          status?: string | null
          updated_at?: string | null
          work_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_items_calculation_version_id_fkey"
            columns: ["calculation_version_id"]
            isOneToOne: false
            referencedRelation: "calculation_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_norm_id_fkey"
            columns: ["norm_id"]
            isOneToOne: false
            referencedRelation: "norm_matrix"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_project_element_id_fkey"
            columns: ["project_element_id"]
            isOneToOne: false
            referencedRelation: "project_elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "ref_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_work_type_id_fkey"
            columns: ["work_type_id"]
            isOneToOne: false
            referencedRelation: "ref_work_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_organization: {
        Args: { p_name: string }
        Returns: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_project: {
        Args: { p_name: string }
        Returns: {
          active_mode_resolution_id: string | null
          created_at: string
          description: string
          id: string
          last_mode_confirmed_at: string | null
          last_mode_source: string | null
          mode_locked: boolean
          name: string
          object_type: string
          organization_id: string | null
          project_status_date: string | null
          project_timezone: string
          stage: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      is_project_member: { Args: { _project_id: string }; Returns: boolean }
      mark_schedule_tasks_outdated_for_work_item: {
        Args: { _reason?: string; _work_item_id: string }
        Returns: undefined
      }
      next_calculation_version_no: {
        Args: { _project_id: string }
        Returns: number
      }
      recalculate_work_item: {
        Args: { _reason?: string; _work_item_id: string }
        Returns: {
          applied_volume: number
          assigned_resource_count: number | null
          base_norm_per_unit: number | null
          calc_status: Database["public"]["Enums"]["calc_status"]
          calculated_duration_days: number | null
          calculated_labor_days: number | null
          calculated_labor_hours: number | null
          calculation_version_id: string
          created_at: string
          factor_complexity: number
          factor_custom: number
          factor_repeat: number
          factor_stage: number
          id: string
          manual_override_duration_days: number | null
          manual_override_labor_days: number | null
          norm_id: string | null
          override_reason: string | null
          project_element_id: string
          project_id: string
          role_id: string
          source_of_calculation: string
          status: string
          updated_at: string
          work_type_id: string
        }
        SetofOptions: {
          from: "*"
          to: "work_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_schedule_task_from_work_items: {
        Args: { _reason?: string; _task_id: string }
        Returns: {
          actual_finish: string | null
          actual_start: string | null
          actual_work: number | null
          baseline_finish: string | null
          baseline_start: string | null
          calculated_duration_variance_days: number | null
          calendar_id: string | null
          comment: string
          current_total_productivity: number | null
          department: string
          done_volume: number | null
          duration_days: number | null
          duration_hours: number | null
          duration_variance: number | null
          early_finish: string | null
          early_start: string | null
          finish_date: string | null
          finish_variance: number | null
          forecast_finish: string | null
          forecast_start: string | null
          free_float: number | null
          id: string
          is_critical: boolean
          late_finish: string | null
          late_start: string | null
          name: string
          norm_work_hours: number | null
          object: string
          organization: string
          percent_complete: number | null
          physical_percent_complete: number | null
          planned_productivity: number | null
          planned_work_hours: number | null
          predecessors: Json
          project_id: string
          remaining_duration: number | null
          remaining_work: number | null
          responsible: string
          row_type: string
          schedule_source: Database["public"]["Enums"]["schedule_source"]
          sort_order: number
          stage: string
          start_date: string | null
          start_variance: number | null
          suggested_duration_days: number | null
          suggested_labor_days: number | null
          sync_reason: string | null
          sync_state: Database["public"]["Enums"]["sync_state"]
          task_status: string
          total_float: number | null
          total_volume: number | null
          wbs_code: string | null
          work: number | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      audit_event_type:
        | "work_item_recalculated"
        | "work_item_override_set"
        | "work_item_override_cleared"
        | "schedule_sync_marked_outdated"
        | "schedule_sync_applied"
        | "schedule_sync_rejected"
        | "norm_changed"
        | "actuals_updated"
        | "version_created"
      calc_status:
        | "draft"
        | "calculated"
        | "needs_norm"
        | "needs_resource"
        | "overridden"
        | "archived"
      contribution_mode: "full" | "partial" | "reference_only"
      element_status: "draft" | "active" | "review" | "archived"
      override_scope: "labor" | "duration" | "both"
      schedule_source:
        | "manual"
        | "from_work_item"
        | "aggregated_from_work_items"
        | "imported"
      sync_state: "synced" | "outdated" | "overridden" | "requires_review"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      audit_event_type: [
        "work_item_recalculated",
        "work_item_override_set",
        "work_item_override_cleared",
        "schedule_sync_marked_outdated",
        "schedule_sync_applied",
        "schedule_sync_rejected",
        "norm_changed",
        "actuals_updated",
        "version_created",
      ],
      calc_status: [
        "draft",
        "calculated",
        "needs_norm",
        "needs_resource",
        "overridden",
        "archived",
      ],
      contribution_mode: ["full", "partial", "reference_only"],
      element_status: ["draft", "active", "review", "archived"],
      override_scope: ["labor", "duration", "both"],
      schedule_source: [
        "manual",
        "from_work_item",
        "aggregated_from_work_items",
        "imported",
      ],
      sync_state: ["synced", "outdated", "overridden", "requires_review"],
    },
  },
} as const
