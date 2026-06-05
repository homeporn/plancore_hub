import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { readSheetTable } from './excelParser.js';

function makeWorkbook(records: Record<string, unknown>[]): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet(records);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Состав');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

describe('readSheetTable', () => {
  it('returns headers and rows as trimmed strings', () => {
    const buf = makeWorkbook([
      { Код: 'АР-1', Наименование: ' Архитектурные решения ', Марка: 'АР' },
      { Код: 'КР-1', Наименование: 'Конструкции', Марка: 'КР' },
    ]);
    const { headers, rows } = readSheetTable(buf);
    expect(headers).toEqual(['Код', 'Наименование', 'Марка']);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ Код: 'АР-1', Наименование: 'Архитектурные решения', Марка: 'АР' });
  });

  it('returns empty arrays for an empty sheet', () => {
    const buf = makeWorkbook([]);
    expect(readSheetTable(buf)).toEqual({ headers: [], rows: [] });
  });
});
