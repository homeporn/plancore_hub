import type {
  WbsTemplateNode,
  DependencyRule,
  DurationModel,
  LinkType,
} from '@plancore/core';
import type { Database } from '../supabase/client.js';

type WbsTemplateDbRow = Database['public']['Tables']['wbs_templates']['Row'];
type DependencyDbRow = Database['public']['Tables']['dependency_matrix']['Row'];
type DurationDbRow = Database['public']['Tables']['duration_models']['Row'];

function asLinkType(value: string): LinkType {
  return value === 'SS' || value === 'FF' || value === 'SF' ? value : 'FS';
}

/** `wbs_templates` row → scaffold template node. */
export function wbsTemplateToNode(row: WbsTemplateDbRow): WbsTemplateNode {
  return {
    taskCode: row.task_code,
    parentCode: row.parent_code,
    taskName: row.task_name,
    sectionCode: row.section_code,
    wbsLevel: row.wbs_level,
    isDriver: row.is_driver,
    sortOrder: row.sort_order,
    objectType: row.object_type,
  };
}

/** `dependency_matrix` row → scaffold dependency rule. */
export function dependencyRowToRule(row: DependencyDbRow): DependencyRule {
  return {
    fromSection: row.from_section,
    toSection: row.to_section,
    linkType: asLinkType(row.link_type),
    lagDays: row.lag_days,
    objectType: row.object_type,
  };
}

/** `duration_models` row → scaffold duration model. */
export function durationRowToModel(row: DurationDbRow): DurationModel {
  return {
    sectionCode: row.section_code,
    driverSection: row.driver_section,
    baseDurationDays: row.base_duration_days,
    formula: row.formula,
    objectType: row.object_type,
  };
}
