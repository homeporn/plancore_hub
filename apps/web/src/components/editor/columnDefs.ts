import type { ScheduleRow } from '@plancore/core';

export type ColId = keyof ScheduleRow | 'cpm_es' | 'cpm_ef' | 'cpm_tf' | 'cpm_critical';

export interface ColumnDef {
  id: ColId;
  label: string;
  width: number;
  editable: boolean;
  type: 'text' | 'number' | 'date' | 'select' | 'readonly';
  options?: string[];
  /** Hidden by default — user can enable it via the column manager. */
  defaultHidden?: boolean;
  /** Cannot be hidden (always shown). */
  locked?: boolean;
}

export const COLUMNS: ColumnDef[] = [
  { id: 'sdr',          label: 'СДР',        width: 80,  editable: true,  type: 'text' },
  { id: 'name',         label: 'Наименование', width: 280, editable: true, type: 'text', locked: true },
  { id: 'row_type',     label: 'Тип',        width: 120, editable: true,  type: 'select',
    options: ['заголовок','задание','задача/разработка','веха','согласование'] },
  { id: 'predecessors', label: 'Предшеств.', width: 130, editable: true,  type: 'text' },
  { id: 'duration',     label: 'Длит., д',   width: 80,  editable: true,  type: 'number' },
  { id: 'startDate',    label: 'Начало',     width: 110, editable: true,  type: 'date' },
  { id: 'endDate',      label: 'Конец',      width: 110, editable: true,  type: 'date' },
  { id: 'taskStatus',   label: 'Статус',     width: 120, editable: true,  type: 'select',
    options: ['NOT_STARTED','IN_PROGRESS','COMPLETED'] },
  { id: 'percentComplete', label: '%, завершение', width: 90, editable: true, type: 'number' },
  { id: 'responsible',  label: 'Ответственный', width: 140, editable: true, type: 'text' },
  { id: 'organization', label: 'Организация', width: 140, editable: true, type: 'text' },
  { id: 'handoffStatus', label: 'Обмен',      width: 120, editable: false, type: 'readonly' },
  // CPM computed columns (read-only)
  { id: 'cpm_es',       label: 'РН (день)',  width: 90,  editable: false, type: 'readonly' },
  { id: 'cpm_ef',       label: 'РО (день)',  width: 90,  editable: false, type: 'readonly' },
  { id: 'cpm_tf',       label: 'Резерв',     width: 80,  editable: false, type: 'readonly' },
  { id: 'cpm_critical', label: 'Крит.',      width: 60,  editable: false, type: 'readonly' },
  // Additional built-in fields — available via the column manager.
  { id: 'stage',        label: 'Стадия',     width: 120, editable: true,  type: 'text',   defaultHidden: true },
  { id: 'object',       label: 'Объект',     width: 140, editable: true,  type: 'text',   defaultHidden: true },
  { id: 'department',   label: 'Отдел',      width: 120, editable: true,  type: 'text',   defaultHidden: true },
  { id: 'handoffToDepartment', label: 'Передать в отдел', width: 140, editable: true, type: 'text', defaultHidden: true },
  { id: 'actualStart',  label: 'Факт. начало', width: 110, editable: true, type: 'date',  defaultHidden: true },
  { id: 'actualFinish', label: 'Факт. конец',  width: 110, editable: true, type: 'date',  defaultHidden: true },
  { id: 'remainingDuration', label: 'Ост. длит.', width: 90, editable: true, type: 'number', defaultHidden: true },
  { id: 'work',         label: 'Трудозатраты', width: 100, editable: true, type: 'number', defaultHidden: true },
  { id: 'actualWork',   label: 'Факт. труд.', width: 100, editable: true, type: 'number', defaultHidden: true },
  { id: 'remainingWork', label: 'Ост. труд.', width: 100, editable: true, type: 'number', defaultHidden: true },
  { id: 'normHours',    label: 'Норм. часы',  width: 100, editable: true, type: 'number', defaultHidden: true },
  { id: 'baselineStart', label: 'База: начало', width: 110, editable: true, type: 'date', defaultHidden: true },
  { id: 'baselineFinish', label: 'База: конец', width: 110, editable: true, type: 'date', defaultHidden: true },
  { id: 'comment',      label: 'Комментарий', width: 200, editable: true, type: 'text',   defaultHidden: true },
];

/** Default visible column ids (everything not marked defaultHidden). */
export const DEFAULT_VISIBLE_COLS: string[] = COLUMNS.filter((c) => !c.defaultHidden).map(
  (c) => c.id as string,
);

export const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Не начато',
  IN_PROGRESS: 'В работе',
  COMPLETED:   'Завершено',
};
