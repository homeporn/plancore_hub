import type { ScheduleRow } from '../schedule/types.js';
import type { FieldType, TaskRow } from './dto.js';

/**
 * Project a canonical ScheduleRow[] into the `TaskRow[]` shape consumed by the
 * audit engine. This lets the audit run on schedules loaded from the database
 * (ScheduleRow), not just freshly imported Excel files.
 *
 * Predecessor links are serialised back into the textual form the audit
 * understands (e.g. "1.2", "1.2SS", "1.2+3д"), and successors are derived.
 */
export function scheduleToAuditTasks(rows: ScheduleRow[]): TaskRow[] {
  const idToSdr = new Map<string, string>();
  rows.forEach((r) => idToSdr.set(r.row_id, r.sdr));

  const successorMap = new Map<string, Set<string>>();
  for (const row of rows) {
    for (const link of row.predecessors) {
      const set = successorMap.get(link.rowId) ?? new Set<string>();
      set.add(row.row_id);
      successorMap.set(link.rowId, set);
    }
  }

  return rows.map((row, index) => {
    const predecessor = row.predecessors
      .map((l) => {
        const sdr = idToSdr.get(l.rowId) ?? '';
        if (!sdr) return '';
        let s = sdr;
        if (l.type !== 'FS') s += l.type;
        if (l.lag !== 0) s += (l.lag > 0 ? '+' : '') + l.lag + 'д';
        return s;
      })
      .filter(Boolean)
      .join(';');

    const succIds = successorMap.get(row.row_id);
    const successor = succIds
      ? Array.from(succIds)
          .map((id) => idToSdr.get(id) ?? '')
          .filter(Boolean)
          .join(';')
      : '';

    return {
      rowIndex: index + 2,
      sdr: row.sdr,
      name: row.name,
      fieldType: row.row_type as FieldType,
      predecessor,
      successor,
      organization: row.organization,
      department: row.department,
      station: row.object,
      startDate: row.startDate,
      endDate: row.endDate,
      duration: row.duration,
      completionPercent: row.percentComplete,
      physicalPercentComplete: null,
      taskStatus: row.taskStatus,
      actualStart: row.actualStart,
      actualFinish: row.actualFinish,
      remainingDuration: row.remainingDuration,
      totalVolume: null,
      doneVolume: null,
      plannedProductivity: null,
      currentTotalProductivity: null,
      laborPlan: row.work,
      laborActual: row.actualWork,
      laborRemaining: row.remainingWork,
      resourceName: row.responsible,
      baselineStart: row.baselineStart,
      baselineEnd: row.baselineFinish,
      baselineLaborPlan: null,
    };
  });
}
