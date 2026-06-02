/**
 * Inputs for generating a schedule from reference templates.
 *
 * These types are framework-agnostic mirrors of the Supabase reference tables
 * (`wbs_templates`, `dependency_matrix`, `duration_models`). The data layer
 * maps DB rows into these shapes; the scaffold engine stays pure and testable.
 */

import type { LinkType } from '../schedule/types.js';

/** One node of a work-breakdown-structure template (mirror of `wbs_templates`). */
export interface WbsTemplateNode {
  /** Hierarchical code, used as the row's СДР (e.g. "2", "2.1", "2.1.3"). */
  taskCode: string;
  /** Parent's taskCode; empty string for top-level nodes. */
  parentCode: string;
  taskName: string;
  /** Section this node belongs to (key into dependency/duration rules). */
  sectionCode: string;
  /** 0-based (or 1-based) depth; informational, hierarchy derives from codes. */
  wbsLevel: number;
  /** Driver tasks are the representative task of their section for linking. */
  isDriver: boolean;
  sortOrder: number;
  objectType: string;
}

/** A section→section dependency rule (mirror of `dependency_matrix`). */
export interface DependencyRule {
  fromSection: string;
  toSection: string;
  linkType: LinkType;
  lagDays: number;
  objectType: string;
}

/** A section duration model (mirror of `duration_models`). */
export interface DurationModel {
  sectionCode: string;
  driverSection: string;
  baseDurationDays: number;
  formula: string;
  objectType: string;
}

/** The reference data the scaffold engine consumes. */
export interface ScaffoldInput {
  templates: WbsTemplateNode[];
  dependencies?: DependencyRule[];
  durationModels?: DurationModel[];
}

/** User-supplied parameters for one scaffold run. */
export interface ScaffoldParams {
  objectType: string;
  /** Object/station name applied to every generated row. */
  objectName?: string;
  organization?: string;
  /** Per-section duration override (working days), keyed by sectionCode. */
  sectionDurations?: Record<string, number>;
  /** Fallback duration when no model/override applies. */
  defaultDuration?: number;
}
