/**
 * CPM (Critical Path Method) Engine
 * Deterministic schedule calculation: ES/EF/LS/LF/TF/FF/Critical Path
 */

import type { ScheduleRow, PredecessorLink } from '../schedule/types.js';

export interface CpmResult {
  row_id: string;
  early_start: number;   // day offset from project start
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
  // Add remaining (cycles) at end
  for (const r of rows) {
    if (!sorted.includes(r.row_id)) sorted.push(r.row_id);
  }

  return { sorted, hasCycles };
}

function getLinkOffset(link: PredecessorLink, predResult: CpmResult, predDuration: number): number {
  switch (link.type) {
    case 'FS': return predResult.early_finish + link.lag;
    case 'SS': return predResult.early_start + link.lag;
    case 'FF': return predResult.early_finish + link.lag; // will be adjusted for finish constraint
    case 'SF': return predResult.early_start + link.lag;
    default: return predResult.early_finish + link.lag;
  }
}

function getLinkOffsetLate(link: PredecessorLink, succResult: CpmResult, succDuration: number): number {
  switch (link.type) {
    case 'FS': return succResult.late_start - link.lag;
    case 'SS': return succResult.late_start - link.lag;
    case 'FF': return succResult.late_finish - link.lag;
    case 'SF': return succResult.late_finish - link.lag;
    default: return succResult.late_start - link.lag;
  }
}

function getEffectiveDuration(row: ScheduleRow): number {
  if (row.row_type === 'веха') {
    return 0;
  }

  if (row.taskStatus === 'COMPLETED' || row.actualFinish) {
    return 0;
  }

  if (row.taskStatus === 'IN_PROGRESS') {
    if (row.remainingDuration != null && row.remainingDuration >= 0) {
      return row.remainingDuration;
    }
  }

  if (row.duration != null && row.duration > 0) {
    return row.duration;
  }

  return 1;
}

/**
 * Run full CPM calculation on schedule rows.
 * Returns ES/EF/LS/LF/TF/FF and critical path for all non-header rows.
 */
export function runCpm(rows: ScheduleRow[]): CpmOutput {
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

    let maxStart = 0;

    for (const link of row.predecessors) {
      const predResult = results.get(link.rowId);
      if (!predResult) continue;

      let candidate: number;
      switch (link.type) {
        case 'FS':
          candidate = predResult.early_finish + link.lag;
          break;
        case 'SS':
          candidate = predResult.early_start + link.lag;
          break;
        case 'FF':
          candidate = predResult.early_finish + link.lag - duration;
          break;
        case 'SF':
          candidate = predResult.early_start + link.lag - duration;
          break;
        default:
          candidate = predResult.early_finish + link.lag;
      }
      if (candidate > maxStart) maxStart = candidate;
    }

    result.early_start = maxStart;
    result.early_finish = maxStart + duration;
  }

  // Project duration
  let projectFinish = 0;
  for (const [, r] of results) {
    if (r.early_finish > projectFinish) projectFinish = r.early_finish;
  }

  // ── Backward pass: compute LS/LF ──
  // Initialize all to project finish
  for (const [, r] of results) {
    r.late_finish = projectFinish;
    const row = rowMap.get(r.row_id)!;
    const duration = getEffectiveDuration(row);
    r.late_start = projectFinish - duration;
  }

  // Reverse order
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
        case 'FS':
          candidate = succResult.late_start - link.lag;
          break;
        case 'SS':
          candidate = succResult.late_start - link.lag;
          break;
        case 'FF':
          candidate = succResult.late_finish - link.lag;
          break;
        case 'SF':
          candidate = succResult.late_finish - link.lag;
          break;
        default:
          candidate = succResult.late_start - link.lag;
      }

      if (link.type === 'FS' || link.type === 'SF') {
        if (candidate < result.late_finish) {
          result.late_finish = candidate;
          result.late_start = candidate - duration;
        }
      } else {
        if (link.type === 'SS') {
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
    }
  }

  // ── Compute floats and critical path ──
  // Find project anchor date
  let projectStartDate: Date | null = null;
  for (const r of rows) {
    if (r.startDate && (!projectStartDate || r.startDate < projectStartDate)) {
      projectStartDate = r.startDate;
    }
  }
  if (!projectStartDate) projectStartDate = new Date();

  const criticalPath: string[] = [];

  for (const [id, result] of results) {
    result.total_float = result.late_start - result.early_start;
    
    // Free float: min(ES of all successors considering link type) - EF of this task
    const succs = successors.get(id) || [];
    if (succs.length > 0) {
      let minSuccStart = Infinity;
      for (const { rowId: succId, link } of succs) {
        const succResult = results.get(succId);
        if (!succResult) continue;
        
        let ref: number;
        switch (link.type) {
          case 'FS': ref = succResult.early_start - link.lag; break;
          case 'SS': ref = succResult.early_start - link.lag; break;
          case 'FF': ref = succResult.early_finish - link.lag; break;
          case 'SF': ref = succResult.early_start - link.lag; break;
          default: ref = succResult.early_start - link.lag;
        }
        if (ref < minSuccStart) minSuccStart = ref;
      }
      result.free_float = Math.max(0, minSuccStart - result.early_finish);
    } else {
      result.free_float = Math.max(0, projectFinish - result.early_finish);
    }

    result.is_critical = result.total_float <= 0;
    if (result.is_critical) criticalPath.push(id);

    // Convert to dates
    result.earlyStartDate = addDaysToDate(projectStartDate, result.early_start);
    result.earlyFinishDate = addDaysToDate(projectStartDate, result.early_finish);
    result.lateStartDate = addDaysToDate(projectStartDate, result.late_start);
    result.lateFinishDate = addDaysToDate(projectStartDate, result.late_finish);
  }

  return { results, criticalPath, projectDuration: projectFinish, hasCycles };
}

function addDaysToDate(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Compute variance between current schedule and baseline dates.
 */
export interface VarianceResult {
  task_id: string;
  start_variance: number | null; // days (positive = late)
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
