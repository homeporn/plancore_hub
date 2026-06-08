import type { ScheduleRow } from '@plancore/core';

export type ColId = keyof ScheduleRow | 'cpm_es' | 'cpm_ef' | 'cpm_tf' | 'cpm_critical';

export interface ColumnDef {
  id: ColId;
  label: string;
  width: number;
  editable: boolean;
  type: 'text' | 'number' | 'date' | 'select' | 'readonly';
  options?: string[];
}

export const COLUMNS: ColumnDef[] = [
  { id: 'sdr',          label: 'СДР',        width: 80,  editable: true,  type: 'text' },
  { id: 'name',         label: 'Наименование', width: 280, editable: true, type: 'text' },
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
];

export const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Не начато',
  IN_PROGRESS: 'В работе',
  COMPLETED:   'Завершено',
};
