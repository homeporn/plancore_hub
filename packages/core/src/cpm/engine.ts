/**
 * CPM (Critical Path Method) Engine
 * Deterministic schedule calculation: ES/EF/LS/LF/TF/FF/Critical Path
 * Supports working-day calendars and date constraints (SNET/SNLT/FNET/FNLT/MSO/MFO).
 */

import type { ScheduleRow, PredecessorLink } from '../schedule/types.js';
import { DEFAULT_CALENDAR } from '../calendar/types.js';
import type { WorkCalendar } from '../calendar/types.js';
import { offsetToDate, dateToOffset } from '../calendar/calendar.js';

export interface CpmResult {
  row_id: string;
  early_start: number;   // working-day offset from project start
  early_finish: number;
  late_start: number;
  late_finish: number;
  total_float: number;
  free_float: number;
  is_critical: boolean;
  // Converted dates
  earlyStartDate: Date | null;
  earlyFinishDate: Date | null;
  lateStartDate: Date | null;
  lateFinishDate: Date | null;
}

export interface CpmOutput {
  results: Map<string, CpmResult>;
  criticalPath: string[];
  projectDuration: number;
  hasCycles: boolean;
}

function topologicalSort(rows: ScheduleRow[]): { sorted: string[]; hasCycles: boolean } {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const rowSet = new Set(rows.map(r => r.row_id));

  for (const r of rows) {
    inDegree.set(r.row_id, 0);
    adj.set(r.row_id, []);
  }

  for (const r of rows) {
    for (const link of r.predecessors) {
      if (rowSet.has(link.rowId)) {
        adj.get(link.rowId)!.push(r.row_id);
        inDegree.set(r.row_id, (inDegree.get(r.row_id) || 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const succ of adj.get(id) || []) {
      const newDeg = (inDegree.get(succ) || 1) - 1;
      inDegree.set(succ, newDeg);
      if (newDeg === 0) queue.push(succ);
    }
  }

  const hasCycles = sorted.length < rows.length;
  for (const r of rows) {
    if (!sorted.includes(r.row_id)) sorted.push(r.row_id);
  }

  return { sorted, hasCycles };
}

function getEffectiveDuration(row: ScheduleRow): number {
  if (row.row_type === 'веха') return 0;
  if (row.taskStatus === 'COMPLETED' || row.actualFinish) return 0;
  if (row.taskStatus === 'IN_PROGRESS' && row.remainingDuration != null && row.remainingDuration >= 0) {
    return row.remainingDuration;
  }
  if (row.duration != null && row.duration > 0) return row.duration;
  return 1;
}

/**
 * Run full CPM calculation on schedule rows.
 * Returns ES/EF/LS/LF/TF/FF and critical path for all non-header rows.
 */
export function runCpm(rows: ScheduleRow[], calendar: WorkCalendar = DEFAULT_CALENDAR): CpmOutput {
  const tasks = rows.filter(r => r.row_type !== 'заголовок');
  if (tasks.length === 0) {
    return { results: new Map(), criticalPath: [], projectDuration: 0, hasCycles: false };
  }

  const rowMap = new Map<string, ScheduleRow>();
  tasks.forEach(r => rowMap.set(r.row_id, r));

  const { sorted, hasCycles } = topologicalSort(tasks);

  // Build successors map
  const successors = new Map<string, { rowId: string; link: PredecessorLink }[]>();
  for (const r of tasks) {
    for (const link of r.predecessors) {
      if (rowMap.has(link.rowId)) {
        if (!successors.has(link.rowId)) successors.set(link.rowId, []);
        successors.get(link.rowId)!.push({ rowId: r.row_id, link });
      }
    }
  }

  // Find project anchor date for constraint conversion
  let projectStartDate: Date | null = null;
  for (const r of rows) {
    if (r.startDate && (!projectStartDate || r.startDate < projectStartDate)) {
      projectStartDate = r.startDate;
    }
  }
  if (!projectStartDate) projectStartDate = new Date();

  // Pre-compute constraint offsets
  const constraintMin = new Map<string, number>(); // minimum ES
  const constraintMax = new Map<string, number>(); // maximum LS
  const constraintFinishMin = new Map<string, number>(); // minimum EF
  const constraintFinishMax = new Map<string, number>(); // maximum LF

  for (const r of tasks) {
    if (!r.constraint) continue;
    const offset = dateToOffset(projectStartDate, r.constraint.date, calendar);
    switch (r.constraint.type) {
      case 'SNET': constraintMin.set(r.row_id, offset); break;
      case 'SNLT': constraintMax.set(r.row_id, offset); break;
      case 'FNET': constraintFinishMin.set(r.row_id, offset); break;
      case 'FNLT': constraintFinishMax.set(r.row_id, offset); break;
      case 'MSO':
        constraintMin.set(r.row_id, offset);
        constraintMax.set(r.row_id, offset);
        break;
      case 'MFO':
        constraintFinishMin.set(r.row_id, offset);
        constraintFinishMax.set(r.row_id, offset);
        break;
    }
  }

  // Initialize results
  const results = new Map<string, CpmResult>();
  for (const r of tasks) {
    results.set(r.row_id, {
      row_id: r.row_id,
      early_start: 0,
      early_finish: 0,
      late_start: Infinity,
      late_finish: Infinity,
      total_float: 0,
      free_float: 0,
      is_critical: false,
      earlyStartDate: null,
      earlyFinishDate: null,
      lateStartDate: null,
      lateFinishDate: null,
    });
  }

  // ── Forward pass: compute ES/EF ──
  for (const id of sorted) {
    const row = rowMap.get(id)!;
    const result = results.get(id)!;
    const duration = getEffectiveDuration(row);

    let maxStart = constraintMin.get(id) ?? 0;

    for (const link of row.predecessors) {
      const predResult = results.get(link.rowId);
      if (!predResult) continue;

      let candidate: number;
      switch (link.type) {
        case 'FS': candidate = predResult.early_finish + link.lag; break;
        case 'SS': candidate = predResult.early_start + link.lag; break;
        case 'FF': candidate = predResult.early_finish + link.lag - duration; break;
        case 'SF': candidate = predResult.early_start + link.lag - duration; break;
        default:   candidate = predResult.early_finish + link.lag;
      }
      if (candidate > maxStart) maxStart = candidate;
    }

    // FNET: EF must be >= constraintFinishMin → ES >= constraintFinishMin - duration
    const finMin = constraintFinishMin.get(id);
    if (finMin !== undefined) {
      const implied = finMin - duration;
      if (implied > maxStart) maxStart = implied;
    }

    result.early_start = maxStart;
    result.early_finish = maxStart + duration;

    // Apply FNET hard floor on EF
    if (finMin !== undefined && result.early_finish < finMin) {
      result.early_finish = finMin;
    }
  }

  // Project duration
  let projectFinish = 0;
  for (const [, r] of results) {
    if (r.early_finish > projectFinish) projectFinish = r.early_finish;
  }

  // ── Backward pass: compute LS/LF ──
  for (const [, r] of results) {
    const row = rowMap.get(r.row_id)!;
    const duration = getEffectiveDuration(row);
    const lfMax = constraintFinishMax.get(r.row_id);
    r.late_finish = lfMax !== undefined ? Math.min(projectFinish, lfMax) : projectFinish;
    r.late_start = r.late_finish - duration;
  }

  for (let i = sorted.length - 1; i >= 0; i--) {
    const id = sorted[i];
    const row = rowMap.get(id)!;
    const result = results.get(id)!;
    const duration = getEffectiveDuration(row);

    const succs = successors.get(id) || [];
    for (const { rowId: succId, link } of succs) {
      const succResult = results.get(succId);
      if (!succResult) continue;

      let candidate: number;
      switch (link.type) {
        case 'FS': candidate = succResult.late_start - link.lag; break;
        case 'SS': candidate = succResult.late_start - link.lag; break;
        case 'FF': candidate = succResult.late_finish - link.lag; break;
        case 'SF': candidate = succResult.late_finish - link.lag; break;
        default:   candidate = succResult.late_start - link.lag;
      }

      if (link.type === 'FS' || link.type === 'SF') {
        if (candidate < result.late_finish) {
          result.late_finish = candidate;
          result.late_start = candidate - duration;
        }
      } else if (link.type === 'SS') {
        if (candidate < result.late_start) {
          result.late_start = candidate;
          result.late_finish = candidate + duration;
        }
      } else { // FF
        if (candidate < result.late_finish) {
          result.late_finish = candidate;
          result.late_start = candidate - duration;
        }
      }
    }

    // Apply SNLT constraint on LS
    const lsMax = constraintMax.get(id);
    if (lsMax !== undefined && result.late_start > lsMax) {
      result.late_start = lsMax;
      result.late_finish = lsMax + duration;
    }
  }

  // ── Compute floats and critical path ──
  const criticalPath: string[] = [];

  for (const [id, result] of results) {
    result.total_float = result.late_start - result.early_start;

    const succs = successors.get(id) || [];
    if (succs.length > 0) {
      let minSuccRef = Infinity;
      for (const { rowId: succId, link } of succs) {
        const succResult = results.get(succId);
        if (!succResult) continue;
        let ref: number;
        switch (link.type) {
          case 'FS': ref = succResult.early_start - link.lag; break;
          case 'SS': ref = succResult.early_start - link.lag; break;
          case 'FF': ref = succResult.early_finish - link.lag; break;
          case 'SF': ref = succResult.early_start - link.lag; break;
          default:   ref = succResult.early_start - link.lag;
        }
        if (ref < minSuccRef) minSuccRef = ref;
      }
      result.free_float = Math.max(0, minSuccRef - result.early_finish);
    } else {
      result.free_float = Math.max(0, projectFinish - result.early_finish);
    }

    result.is_critical = result.total_float <= 0;
    if (result.is_critical) criticalPath.push(id);

    result.earlyStartDate = offsetToDate(projectStartDate, result.early_start, calendar);
    result.earlyFinishDate = offsetToDate(projectStartDate, result.early_finish, calendar);
    result.lateStartDate = offsetToDate(projectStartDate, result.late_start, calendar);
    result.lateFinishDate = offsetToDate(projectStartDate, result.late_finish, calendar);
  }

  return { results, criticalPath, projectDuration: projectFinish, hasCycles };
}

/**
 * Compute variance between current schedule and baseline dates.
 */
export interface VarianceResult {
  task_id: string;
  start_variance: number | null;
  finish_variance: number | null;
  duration_variance: number | null;
}

export function computeVariance(
  currentRows: ScheduleRow[],
  baselineTasks: { task_id: string; baseline_start: string | null; baseline_finish: string | null; baseline_duration: number | null }[]
): VarianceResult[] {
  const baseMap = new Map(baselineTasks.map(b => [b.task_id, b]));
  const results: VarianceResult[] = [];

  for (const row of currentRows) {
    const base = baseMap.get(row.row_id);
    if (!base) continue;

    const sv = row.startDate && base.baseline_start
      ? daysDiff(new Date(base.baseline_start), row.startDate)
      : null;
    const fv = row.endDate && base.baseline_finish
      ? daysDiff(new Date(base.baseline_finish), row.endDate)
      : null;
    const dv = row.duration != null && base.baseline_duration != null
      ? row.duration - base.baseline_duration
      : null;

    results.push({ task_id: row.row_id, start_variance: sv, finish_variance: fv, duration_variance: dv });
  }

  return results;
}

function daysDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
