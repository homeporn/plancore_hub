import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcelFile } from './excelParser.js';
import { importToSchedule } from './importToSchedule.js';
import { runAudit } from '../audit/engine.js';
import { runCpm } from '../cpm/engine.js';

/** Build an .xlsx ArrayBuffer from an array of header→value records. */
function buildXlsx(records: Record<string, string>[]): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet(records);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'График');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

const HEADERS = {
  sdr: 'СДР',
  name: 'Название задачи',
  type: 'Тип поля',
  pred: 'Предшественник',
  succ: 'Последователь',
  org: 'Организация',
  dept: 'Отдел',
  station: 'Станция / объект',
} as const;

describe('Excel import → audit → CPM pipeline', () => {
  it('parses a valid file, finds the duplicate-SDR issue, and maps to schedule', () => {
    const buffer = buildXlsx([
      {
        [HEADERS.sdr]: '1',
        [HEADERS.name]: 'Старт проекта',
        [HEADERS.type]: 'веха',
        [HEADERS.pred]: '',
        [HEADERS.succ]: '1.1',
        [HEADERS.org]: 'Заказчик',
        [HEADERS.dept]: 'УП',
        [HEADERS.station]: 'Объект А',
      },
      {
        [HEADERS.sdr]: '1.1',
        [HEADERS.name]: 'Проектирование АР',
        [HEADERS.type]: 'задача/разработка',
        [HEADERS.pred]: '1',
        [HEADERS.succ]: '1.2',
        [HEADERS.org]: 'Проектировщик',
        [HEADERS.dept]: 'АР',
        [HEADERS.station]: 'Объект А',
      },
      {
        [HEADERS.sdr]: '1.1',
        [HEADERS.name]: 'Дубль СДР',
        [HEADERS.type]: 'задача/разработка',
        [HEADERS.pred]: '1',
        [HEADERS.succ]: '',
        [HEADERS.org]: 'Подрядчик',
        [HEADERS.dept]: 'КР',
        [HEADERS.station]: 'Объект А',
      },
    ]);

    const { tasks, missingColumns } = parseExcelFile(buffer);
    expect(missingColumns).toEqual([]);
    expect(tasks).toHaveLength(3);

    const result = runAudit(tasks);
    expect(result.totalTasks).toBe(3);
    expect(
      result.findings.some((f) => f.rule.includes('Уникальность')),
    ).toBe(true);

    const schedule = importToSchedule(tasks);
    expect(schedule).toHaveLength(3);
    // Predecessor "1" of row 1.1 must resolve to the milestone's row_id.
    const milestoneId = schedule[0]!.row_id;
    expect(schedule[1]!.predecessors[0]?.rowId).toBe(milestoneId);

    const cpm = runCpm(schedule);
    expect(cpm.hasCycles).toBe(false);
    expect(cpm.results.size).toBe(3);
  });

  it('reports missing required columns', () => {
    const buffer = buildXlsx([{ [HEADERS.sdr]: '1', [HEADERS.name]: 'X' }]);
    const { missingColumns } = parseExcelFile(buffer);
    expect(missingColumns.length).toBeGreaterThan(0);
  });
});
