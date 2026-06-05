import type {
  LinkType,
  PredecessorLink,
  RowType,
  ScheduleRow,
  StageType,
  TaskStatus,
} from '../schedule/types.js';
import { mkLink } from '../schedule/links.js';
import type { TaskRow } from './dto.js';

/**
 * The single mapper from imported Excel rows to the canonical domain model.
 *
 * This replaces the old bidirectional `taskRowsToSchedule` / `mergeTaskRows`
 * pair. `TaskRow` is input-only; everything downstream operates on
 * `ScheduleRow`.
 */
export function importToSchedule(tasks: TaskRow[]): ScheduleRow[] {
  const sdrToId = new Map<string, string>();

  const rows: ScheduleRow[] = tasks.map((t) => {
    const id = crypto.randomUUID();
    if (t.sdr) sdrToId.set(t.sdr, id);
    return {
      row_id: id,
      sdr: t.sdr,
      name: t.name,
      row_type: (t.fieldType || '') as RowType,
      stage: '' as StageType,
      object: t.station,
      organization: t.organization,
      department: t.department,
      responsible: t.resourceName,
      predecessors: [],
      startDate: t.startDate,
      endDate: t.endDate,
      duration: t.duration,
      percentComplete: t.completionPercent,
      taskStatus: (t.taskStatus as TaskStatus | null) ?? 'NOT_STARTED',
      actualStart: t.actualStart,
      actualFinish: t.actualFinish,
      remainingDuration: t.remainingDuration ?? t.duration,
      work: t.laborPlan,
      actualWork: t.laborActual,
      remainingWork: t.laborRemaining,
      baselineStart: t.baselineStart,
      baselineFinish: t.baselineEnd,
      normHours: null,
      handoffStatus: null,
      handoffToDepartment: '',
      volumeId: null,
      comment: '',
    };
  });

  // Resolve predecessor SDR strings into PredecessorLinks (by resolved row_id).
  tasks.forEach((task, i) => {
    const predStr = task.predecessor;
    if (!predStr) return;
    const parts = predStr
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const row = rows[i];
    if (!row) return;
    row.predecessors = parts
      .map((part) => parsePredecessor(part, sdrToId))
      .filter((l): l is PredecessorLink => l !== null);
  });

  return rows;
}

/** Parse a single predecessor token like "1.2.3", "1.2.3FS+5д", "1.2.3SS-2". */
function parsePredecessor(
  part: string,
  sdrToId: Map<string, string>,
): PredecessorLink | null {
  const match = part.match(/^([\d.]+)\s*(FS|SS|FF|SF)?\s*([+-]?\d+)?[дd]?$/i);
  if (!match) {
    // Fallback: strip any link-type suffix and resolve a bare SDR.
    const sdr = part.replace(/\s*(FS|FF|SS|SF).*$/i, '');
    const id = sdrToId.get(sdr);
    return id ? mkLink(id) : null;
  }
  const sdr = match[1];
  if (sdr === undefined) return null;
  const linkType = (match[2]?.toUpperCase() ?? 'FS') as LinkType;
  const lag = match[3] ? parseInt(match[3], 10) : 0;
  const id = sdrToId.get(sdr);
  return id ? mkLink(id, linkType, lag) : null;
}

/** Create a blank ScheduleRow with a fresh id. */
export function createBlankRow(
  overrides: Partial<ScheduleRow> = {},
): ScheduleRow {
  return {
    row_id: crypto.randomUUID(),
    sdr: '',
    name: '',
    row_type: '',
    stage: '',
    object: '',
    organization: '',
    department: '',
    responsible: '',
    predecessors: [],
    startDate: null,
    endDate: null,
    duration: null,
    percentComplete: null,
    taskStatus: 'NOT_STARTED',
    actualStart: null,
    actualFinish: null,
    remainingDuration: null,
    work: null,
    actualWork: null,
    remainingWork: null,
    baselineStart: null,
    baselineFinish: null,
    normHours: null,
    handoffStatus: null,
    handoffToDepartment: '',
    volumeId: null,
    comment: '',
    ...overrides,
  };
}
