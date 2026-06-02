/**
 * Schedule scaffold engine.
 *
 * Turns a WBS template (plus optional dependency and duration rules) into a
 * canonical `ScheduleRow[]` ready for the editor. Pure and deterministic: the
 * same input always yields the same rows (apart from generated row ids), so it
 * is straightforward to test against fixtures.
 */

import type { ScheduleRow, StageType } from '../schedule/types.js';
import { mkLink } from '../schedule/links.js';
import { createBlankRow } from '../import/importToSchedule.js';
import type {
  ScaffoldInput,
  ScaffoldParams,
  WbsTemplateNode,
  DurationModel,
} from './types.js';

const DEFAULT_DURATION = 5;

/** Stable sort by (wbsLevel, sortOrder, taskCode) so output order is deterministic. */
function orderTemplates(templates: WbsTemplateNode[]): WbsTemplateNode[] {
  return [...templates].sort((a, b) => {
    if (a.wbsLevel !== b.wbsLevel) return a.wbsLevel - b.wbsLevel;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.taskCode.localeCompare(b.taskCode);
  });
}

/** Resolve the working-day duration for a section, honouring overrides first. */
function resolveDuration(
  sectionCode: string,
  params: ScaffoldParams,
  modelBySection: Map<string, DurationModel>,
): number {
  const override = params.sectionDurations?.[sectionCode];
  if (override != null && override > 0) return override;
  const model = modelBySection.get(sectionCode);
  if (model && model.baseDurationDays > 0) return model.baseDurationDays;
  return params.defaultDuration ?? DEFAULT_DURATION;
}

/** A node is a leaf (real task) when no other node names it as parent. */
function computeLeafSet(templates: WbsTemplateNode[]): Set<string> {
  const parents = new Set<string>();
  for (const t of templates) {
    if (t.parentCode) parents.add(t.parentCode);
  }
  const leaves = new Set<string>();
  for (const t of templates) {
    if (!parents.has(t.taskCode)) leaves.add(t.taskCode);
  }
  return leaves;
}

/**
 * Build a schedule from reference templates.
 *
 * - Container nodes (have children) become `заголовок` rows with no duration.
 * - Leaf nodes become `задача/разработка` rows with a resolved duration.
 * - Dependency rules link the *driver* leaf of `fromSection` → driver leaf of
 *   `toSection`. If a section has no explicit driver, its first leaf is used.
 */
export function buildScheduleFromTemplate(
  input: ScaffoldInput,
  params: ScaffoldParams,
): ScheduleRow[] {
  const templates = orderTemplates(
    input.templates.filter((t) => t.objectType === params.objectType),
  );
  if (templates.length === 0) return [];

  const leaves = computeLeafSet(templates);
  const modelBySection = new Map<string, DurationModel>();
  for (const m of input.durationModels ?? []) {
    if (m.objectType === params.objectType) modelBySection.set(m.sectionCode, m);
  }

  // Generate rows, tracking the row_id chosen for each template code.
  const idByCode = new Map<string, string>();
  const rows: ScheduleRow[] = templates.map((t) => {
    const isLeaf = leaves.has(t.taskCode);
    const row = createBlankRow({
      sdr: t.taskCode,
      name: t.taskName,
      row_type: isLeaf ? 'задача/разработка' : 'заголовок',
      stage: '' as StageType,
      object: params.objectName ?? '',
      organization: params.organization ?? '',
      duration: isLeaf ? resolveDuration(t.sectionCode, params, modelBySection) : null,
      remainingDuration: isLeaf
        ? resolveDuration(t.sectionCode, params, modelBySection)
        : null,
    });
    idByCode.set(t.taskCode, row.row_id);
    return row;
  });

  applyDependencies(input, params, templates, leaves, idByCode, rows);
  return rows;
}

/** Wire section→section dependency rules onto the representative leaf rows. */
function applyDependencies(
  input: ScaffoldInput,
  params: ScaffoldParams,
  templates: WbsTemplateNode[],
  leaves: Set<string>,
  idByCode: Map<string, string>,
  rows: ScheduleRow[],
): void {
  const rules = (input.dependencies ?? []).filter(
    (d) => d.objectType === params.objectType,
  );
  if (rules.length === 0) return;

  // Pick a representative leaf code per section: explicit driver, else first leaf.
  const driverBySection = new Map<string, string>();
  const firstLeafBySection = new Map<string, string>();
  for (const t of templates) {
    if (!leaves.has(t.taskCode)) continue;
    if (!firstLeafBySection.has(t.sectionCode)) {
      firstLeafBySection.set(t.sectionCode, t.taskCode);
    }
    if (t.isDriver && !driverBySection.has(t.sectionCode)) {
      driverBySection.set(t.sectionCode, t.taskCode);
    }
  }
  const repr = (section: string): string | undefined =>
    driverBySection.get(section) ?? firstLeafBySection.get(section);

  const rowById = new Map(rows.map((r) => [r.row_id, r]));
  for (const rule of rules) {
    const fromCode = repr(rule.fromSection);
    const toCode = repr(rule.toSection);
    if (!fromCode || !toCode || fromCode === toCode) continue;
    const fromId = idByCode.get(fromCode);
    const toId = idByCode.get(toCode);
    if (!fromId || !toId) continue;
    const successor = rowById.get(toId);
    if (!successor) continue;
    if (successor.predecessors.some((p) => p.rowId === fromId)) continue;
    successor.predecessors.push(mkLink(fromId, rule.linkType, rule.lagDays));
  }
}
