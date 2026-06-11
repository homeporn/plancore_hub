/**
 * Time-based progress recalculation (pure).
 *
 * Computes each task's completion purely from elapsed working time relative to
 * a target "as-of" date: started → in progress → finished. Paused tasks are
 * frozen (left untouched). This is the duration-only model; a work/labour-based
 * model can be layered on later.
 */

import type { WorkCalendar } from '../calendar/types.js';
import { workingDaysBetween } from '../calendar/calendar.js';
import type { TaskStatus } from './types.js';

export interface ProgressInput {
  rowId: string;
  start: Date | null;
  finish: Date | null;
  status: TaskStatus;
}

export interface ProgressResult {
  rowId: string;
  percentComplete: number;
  taskStatus: TaskStatus;
}

/**
 * Recompute progress for each task as of `asOf`, by elapsed working days.
 * Returns results only for eligible tasks (have dates and aren't paused); the
 * caller applies them to the rows.
 */
export function recalcProgressByTime(
  tasks: ProgressInput[],
  asOf: Date,
  cal: WorkCalendar,
): ProgressResult[] {
  const out: ProgressResult[] = [];
  for (const t of tasks) {
    if (t.status === 'PAUSED') continue; // frozen
    if (!t.start || !t.finish) continue; // need dates to compute

    let percent: number;
    if (asOf <= t.start) {
      percent = 0;
    } else if (asOf >= t.finish) {
      percent = 100;
    } else {
      const total = workingDaysBetween(t.start, t.finish, cal);
      const elapsed = workingDaysBetween(t.start, asOf, cal);
      percent = total > 0 ? Math.round((elapsed / total) * 100) : 0;
      percent = Math.max(0, Math.min(100, percent));
    }

    const taskStatus: TaskStatus =
      percent >= 100 ? 'COMPLETED' : percent <= 0 ? 'NOT_STARTED' : 'IN_PROGRESS';
    out.push({ rowId: t.rowId, percentComplete: percent, taskStatus });
  }
  return out;
}
