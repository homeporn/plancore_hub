/**
 * Excel import DTO.
 *
 * `TaskRow` is the raw, per-row representation produced by the Excel parser.
 * It is NOT a domain model — it is an input boundary type. A single mapper
 * (`importToSchedule`) converts `TaskRow[]` into the canonical `ScheduleRow[]`.
 * The audit engine validates `TaskRow[]` directly, because audit is about the
 * quality of the imported data.
 */

export type FieldType =
  | 'заголовок'
  | 'задание'
  | 'задача/разработка'
  | 'веха'
  | 'согласование'
  | '';

export interface TaskRow {
  rowIndex: number;
  sdr: string; // СДР
  name: string; // Название задачи
  fieldType: FieldType; // Тип поля
  predecessor: string; // Предшественник
  successor: string; // Последователь
  organization: string; // Организация
  department: string; // Отдел
  station: string; // Станция / объект
  startDate: Date | null; // Дата начала
  endDate: Date | null; // Дата окончания
  duration: number | null; // Длительность (дни)
  completionPercent: number | null; // % завершения
  physicalPercentComplete: number | null;
  taskStatus: string | null;
  actualStart: Date | null;
  actualFinish: Date | null;
  remainingDuration: number | null;
  totalVolume: number | null;
  doneVolume: number | null;
  plannedProductivity: number | null;
  currentTotalProductivity: number | null;
  laborPlan: number | null; // Трудозатраты (план)
  laborActual: number | null; // Фактические трудозатраты
  laborRemaining: number | null; // Оставшиеся трудозатраты
  resourceName: string; // Название ресурса
  baselineStart: Date | null; // Базовое начало
  baselineEnd: Date | null; // Базовое окончание
  baselineLaborPlan: number | null; // Базовые трудозатраты
}

export const EXPECTED_COLUMNS = [
  'СДР',
  'Название задачи',
  'Предшественник',
  'Последователь',
  'Организация',
  'Отдел',
  'Станция / объект',
] as const;

export const FIELD_TYPE_VALUES: FieldType[] = [
  'заголовок',
  'задание',
  'задача/разработка',
  'веха',
  'согласование',
];
