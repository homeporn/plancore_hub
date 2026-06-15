import { describe, expect, it } from 'vitest';
import { guessFieldMapping, tasksFromRows } from './excelParser.js';

describe('column mapping import', () => {
  it('auto-guesses fields from MS Project-style headers (synonyms)', () => {
    const m = guessFieldMapping(['Name', 'Start', 'Finish', 'Duration', 'Resource Names']);
    expect(m.name).toBe('Name');
    expect(m.startDate).toBe('Start');
    expect(m.endDate).toBe('Finish');
    expect(m.duration).toBe('Duration');
    expect(m.resourceName).toBe('Resource Names');
  });

  it('builds tasks from an explicit field→header mapping with custom names', () => {
    const rows = [
      { Задача: 'Фундамент', Длит: 5, Старт: '01.02.2024' },
      { Задача: '', Длит: 3, Старт: '' },
    ];
    const tasks = tasksFromRows(rows, {
      name: 'Задача',
      duration: 'Длит',
      startDate: 'Старт',
    });
    expect(tasks).toHaveLength(2);
    expect(tasks[0].name).toBe('Фундамент');
    expect(tasks[0].duration).toBe(5);
    expect(tasks[0].startDate).toEqual(new Date(2024, 1, 1));
    // Unmapped fields stay blank/null.
    expect(tasks[0].organization).toBe('');
    expect(tasks[1].name).toBe('');
  });
});
