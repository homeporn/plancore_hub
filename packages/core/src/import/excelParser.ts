import * as XLSX from 'xlsx';
import type { TaskRow, FieldType } from './dto.js';
import { FIELD_TYPE_VALUES, EXPECTED_COLUMNS } from './dto.js';

const COLUMN_MAP: Record<string, keyof TaskRow> = {
  'сдр': 'sdr',
  'название задачи': 'name',
  'тип поля': 'fieldType',
  'тип строки': 'fieldType',
  'предшественник': 'predecessor',
  'последователь': 'successor',
  'организация': 'organization',
  'отдел': 'department',
  'станция / объект': 'station',
  'станция/объект': 'station',
  'станция': 'station',
  'объект': 'station',
  'дата начала': 'startDate',
  'дата окончания': 'endDate',
  'начало': 'startDate',
  'окончание': 'endDate',
  'start': 'startDate',
  'finish': 'endDate',
  'start date': 'startDate',
  'finish date': 'endDate',
  'длительность': 'duration',
  'duration': 'duration',
  '% завершения': 'completionPercent',
  '% выполнения': 'completionPercent',
  'процент завершения': 'completionPercent',
  '% complete': 'completionPercent',
  'трудозатраты': 'laborPlan',
  'трудоёмкость': 'laborPlan',
  'work': 'laborPlan',
  'фактические трудозатраты': 'laborActual',
  'actual work': 'laborActual',
  'оставшиеся трудозатраты': 'laborRemaining',
  'remaining work': 'laborRemaining',
  'название ресурса': 'resourceName',
  'ресурс': 'resourceName',
  'resource name': 'resourceName',
  'resource names': 'resourceName',
  'базовое начало': 'baselineStart',
  'baseline start': 'baselineStart',
  'базовое окончание': 'baselineEnd',
  'baseline finish': 'baselineEnd',
  'базовые трудозатраты': 'baselineLaborPlan',
  'baseline work': 'baselineLaborPlan',
};

function parseDate(value: unknown): Date | null {
  if (value == null || value === '') return null;

  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return isNaN(date.getTime()) ? null : date;
  }

  const str = String(value).trim();
  if (!str) return null;

  const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const d = new Date(+dotMatch[3], +dotMatch[2] - 1, +dotMatch[1]);
    return isNaN(d.getTime()) ? null : d;
  }

  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const d = new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
    return isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function parseFieldType(value: unknown): FieldType {
  if (value == null || value === '') return '';
  const normalized = String(value).trim().toLowerCase();
  const found = FIELD_TYPE_VALUES.find(v => v === normalized);
  if (found) return found;
  // fuzzy matching
  if (/заголов/i.test(normalized)) return 'заголовок';
  if (/задани/i.test(normalized)) return 'задание';
  if (/разработ|задач/i.test(normalized)) return 'задача/разработка';
  if (/вех|milestone/i.test(normalized)) return 'веха';
  if (/согласов|approval/i.test(normalized)) return 'согласование';
  return '';
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Read the first sheet as a generic table: the raw header names plus each row
 * as a header→string map. Used by flows that need user-driven column mapping
 * (e.g. importing the project composition into the volume registry) rather than
 * the fixed schedule schema. Pure.
 */
export function readSheetTable(buffer: ArrayBuffer): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (rawData.length === 0) return { headers: [], rows: [] };

  const headers = Object.keys(rawData[0]);
  const rows = rawData.map((row) => {
    const out: Record<string, string> = {};
    for (const h of headers) {
      const v = row[h];
      out[h] = v != null ? String(v).trim() : '';
    }
    return out;
  });
  return { headers, rows };
}

export function parseExcelFile(buffer: ArrayBuffer): { tasks: TaskRow[]; missingColumns: string[] } {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  if (rawData.length === 0) {
    throw new Error('Файл пуст или не содержит данных');
  }

  const rawHeaders = Object.keys(rawData[0]);
  const headerMapping: Record<string, keyof TaskRow> = {};
  const foundFields = new Set<string>();

  for (const rawHeader of rawHeaders) {
    const normalized = normalizeHeader(rawHeader);
    const mapped = COLUMN_MAP[normalized];
    if (mapped) {
      headerMapping[rawHeader] = mapped;
      for (const expected of EXPECTED_COLUMNS) {
        if (normalizeHeader(expected) === normalized ||
            COLUMN_MAP[normalizeHeader(expected)] === mapped) {
          foundFields.add(expected);
        }
      }
    }
  }

  const missingColumns = EXPECTED_COLUMNS.filter(col => !foundFields.has(col));

  const tasks: TaskRow[] = rawData.map((row, index) => {
    const task: TaskRow = {
      rowIndex: index + 2,
      sdr: '',
      name: '',
      fieldType: '',
      predecessor: '',
      successor: '',
      organization: '',
      department: '',
      station: '',
      startDate: null,
      endDate: null,
      duration: null,
      completionPercent: null,
      physicalPercentComplete: null,
      taskStatus: null,
      actualStart: null,
      actualFinish: null,
      remainingDuration: null,
      totalVolume: null,
      doneVolume: null,
      plannedProductivity: null,
      currentTotalProductivity: null,
      laborPlan: null,
      laborActual: null,
      laborRemaining: null,
      resourceName: '',
      baselineStart: null,
      baselineEnd: null,
      baselineLaborPlan: null,
    };

    for (const [rawHeader, field] of Object.entries(headerMapping)) {
      const value = row[rawHeader];
      if (field === 'rowIndex') continue;

      if (field === 'startDate' || field === 'endDate' || field === 'baselineStart' || field === 'baselineEnd') {
        task[field] = parseDate(value);
      } else if (field === 'duration' || field === 'completionPercent' || field === 'laborPlan' || field === 'laborActual' || field === 'laborRemaining' || field === 'baselineLaborPlan') {
        task[field] = parseNumber(value);
      } else if (field === 'fieldType') {
        task.fieldType = parseFieldType(value);
      } else {
        (task as unknown as Record<string, string | number>)[field] = value != null ? String(value).trim() : '';
      }
    }

    return task;
  });

  return { tasks, missingColumns };
}
