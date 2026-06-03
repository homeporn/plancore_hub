import type {
  PredecessorLink,
  RowType,
  ScheduleRow,
  StageType,
  TaskStatus,
} from '@plancore/core';
import type { Database } from '../supabase/client.js';

type VersionTaskRow =
  Database['public']['Tables']['project_schedule_version_tasks']['Row'];
type VersionTaskInsert =
  Database['public']['Tables']['project_schedule_version_tasks']['Insert'];

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

/** ISO date (YYYY-MM-DD) for a Postgres `date` column, or null. */
function toIsoDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** Parse the `predecessors_json` jsonb into typed PredecessorLink[]. */
function parsePredecessors(json: unknown): PredecessorLink[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((raw): PredecessorLink[] => {
    if (raw === null || typeof raw !== 'object') return [];
    const obj = raw as Record<string, unknown>;
    const rowId = obj.rowId;
    const type = obj.type;
    const lag = obj.lag;
    if (typeof rowId !== 'string') return [];
    return [
      {
        rowId,
        type: (type === 'SS' || type === 'FF' || type === 'SF'
          ? type
          : 'FS') as PredecessorLink['type'],
        lag: typeof lag === 'number' ? lag : 0,
      },
    ];
  });
}

/** DB row → canonical ScheduleRow. */
export function versionTaskToScheduleRow(row: VersionTaskRow): ScheduleRow {
  return {
    row_id: row.task_row_id ?? row.id,
    sdr: row.wbs_code,
    name: row.name,
    row_type: row.row_type as RowType,
    stage: row.stage as StageType,
    object: row.object_name,
    organization: row.organization,
    department: row.department,
    responsible: row.responsible,
    predecessors: parsePredecessors(row.predecessors_json),
    startDate: toDate(row.planned_start),
    endDate: toDate(row.planned_finish),
    duration: row.planned_duration,
    percentComplete: row.percent_complete,
    taskStatus: (row.task_status as TaskStatus | null) ?? 'NOT_STARTED',
    actualStart: toDate(row.actual_start),
    actualFinish: toDate(row.actual_finish),
    remainingDuration: row.remaining_duration,
    work: row.work,
    actualWork: row.actual_work,
    remainingWork: row.remaining_work,
    baselineStart: toDate(row.baseline_start),
    baselineFinish: toDate(row.baseline_finish),
    normHours: null,
    comment: row.comment,
  };
}

/** Canonical ScheduleRow → DB insert payload for a given schedule version. */
export function scheduleRowToVersionTaskInsert(
  row: ScheduleRow,
  scheduleVersionId: string,
  sortOrder: number,
): VersionTaskInsert {
  return {
    schedule_version_id: scheduleVersionId,
    task_row_id: row.row_id,
    sort_order: sortOrder,
    wbs_code: row.sdr,
    name: row.name,
    row_type: row.row_type,
    stage: row.stage,
    object_name: row.object,
    organization: row.organization,
    department: row.department,
    responsible: row.responsible,
    predecessors_json: row.predecessors as unknown as Database['public']['Tables']['project_schedule_version_tasks']['Insert']['predecessors_json'],
    planned_start: toIsoDate(row.startDate),
    planned_finish: toIsoDate(row.endDate),
    planned_duration: row.duration,
    percent_complete: row.percentComplete,
    task_status: row.taskStatus,
    actual_start: toIsoDate(row.actualStart),
    actual_finish: toIsoDate(row.actualFinish),
    remaining_duration: row.remainingDuration,
    work: row.work,
    actual_work: row.actualWork,
    remaining_work: row.remainingWork,
    baseline_start: toIsoDate(row.baselineStart),
    baseline_finish: toIsoDate(row.baselineFinish),
    comment: row.comment,
  };
}
