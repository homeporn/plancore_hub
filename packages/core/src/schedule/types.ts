/**
 * Canonical schedule domain model.
 *
 * This is the single source of truth for a schedule row inside the
 * application. Excel import produces a raw DTO (see `../import`) which is
 * mapped into `ScheduleRow` exactly once. The UI and all engines operate on
 * `ScheduleRow` only — there is no parallel model.
 */

export type RowType =
  | 'заголовок'
  | 'задание'
  | 'задача/разработка'
  | 'веха'
  | 'согласование'
  | '';

export type StageType =
  | 'предпроект'
  | 'согласования'
  | 'проектирование'
  | 'смр'
  | 'пнр'
  | 'ввод'
  | '';

export const ROW_TYPE_VALUES: RowType[] = [
  'заголовок',
  'задание',
  'задача/разработка',
  'веха',
  'согласование',
];

export const STAGE_VALUES: StageType[] = [
  'предпроект',
  'согласования',
  'проектирование',
  'смр',
  'пнр',
  'ввод',
];

export const ROW_TYPE_LABELS: Record<RowType, string> = {
  'заголовок': '📁 Заголовок',
  'задание': '📋 Задание',
  'задача/разработка': '🔧 Задача/Разработка',
  'веха': '🔶 Веха',
  'согласование': '✅ Согласование',
  '': '— Не указан',
};

export type LinkType = 'FS' | 'SS' | 'FF' | 'SF';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  FS: 'Финиш → Старт',
  SS: 'Старт → Старт',
  FF: 'Финиш → Финиш',
  SF: 'Старт → Финиш',
};

/** A dependency from a predecessor row to the row that owns this link. */
export interface PredecessorLink {
  rowId: string;
  type: LinkType;
  /** Days. Positive = delay, negative = overlap. */
  lag: number;
}

export interface ScheduleRow {
  row_id: string;
  sdr: string;
  name: string;
  row_type: RowType;
  stage: StageType;
  object: string;
  organization: string;
  department: string;
  responsible: string;
  predecessors: PredecessorLink[];

  startDate: Date | null;
  endDate: Date | null;
  duration: number | null;

  percentComplete: number | null;
  taskStatus: TaskStatus;
  actualStart: Date | null;
  actualFinish: Date | null;
  remainingDuration: number | null;

  work: number | null;
  actualWork: number | null;
  remainingWork: number | null;

  baselineStart: Date | null;
  baselineFinish: Date | null;
  normHours: number | null;

  /** Optional scheduling constraint (SNET, MFO, etc.) */
  constraint?: import('../calendar/types.js').DateConstraint;

  /** Inter-department handoff exchange state (on задание rows); null otherwise. */
  handoffStatus: import('../handoff/workflow.js').HandoffStatus | null;
  /** Receiving department for a handoff assignment (on задание rows). */
  handoffToDepartment: string;
  /** Volume (том) this development row produces; null otherwise. */
  volumeId: string | null;

  comment: string;
}
