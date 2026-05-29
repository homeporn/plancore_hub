import { describe, expect, it } from 'vitest';
import { runCpm } from './engine.js';
import type { ScheduleRow } from '../schedule/types.js';
import { createBlankRow } from '../import/importToSchedule.js';

function mkTask(
  params: Partial<ScheduleRow> & Pick<ScheduleRow, 'row_id' | 'name'>,
): ScheduleRow {
  return createBlankRow({
    row_type: 'задание',
    sdr: params.sdr ?? params.row_id,
    duration: params.duration ?? 1,
    remainingDuration: params.remainingDuration ?? params.duration ?? 1,
    ...params,
  });
}

describe('runCpm циклическая логика', () => {
  it('помечает простой цикл и возвращает результаты для всех задач', () => {
    const rows: ScheduleRow[] = [
      mkTask({ row_id: 'A', name: 'A', predecessors: [{ rowId: 'B', type: 'FS', lag: 0 }] }),
      mkTask({ row_id: 'B', name: 'B', predecessors: [{ rowId: 'A', type: 'FS', lag: 0 }] }),
    ];

    const out = runCpm(rows);

    expect(out.hasCycles).toBe(true);
    expect(out.results.size).toBe(2);
    expect(out.projectDuration).toBeGreaterThan(0);
    expect(out.results.get('A')).toBeDefined();
    expect(out.results.get('B')).toBeDefined();
  });

  it('помечает самоссылку как цикл', () => {
    const rows: ScheduleRow[] = [
      mkTask({ row_id: 'A', name: 'A', predecessors: [{ rowId: 'A', type: 'FS', lag: 0 }] }),
    ];

    const out = runCpm(rows);

    expect(out.hasCycles).toBe(true);
    expect(out.results.size).toBe(1);
    expect(out.projectDuration).toBe(1);
  });

  it('в смешанном графе сохраняет расчёт для ациклической ветки и помечает цикл', () => {
    const rows: ScheduleRow[] = [
      mkTask({ row_id: 'A', name: 'A', predecessors: [{ rowId: 'B', type: 'FS', lag: 0 }] }),
      mkTask({ row_id: 'B', name: 'B', predecessors: [{ rowId: 'A', type: 'FS', lag: 0 }] }),
      mkTask({ row_id: 'C', name: 'C', predecessors: [] }),
      mkTask({ row_id: 'D', name: 'D', predecessors: [{ rowId: 'C', type: 'FS', lag: 0 }] }),
    ];

    const out = runCpm(rows);
    const c = out.results.get('C');
    const d = out.results.get('D');

    expect(out.hasCycles).toBe(true);
    expect(c?.early_start).toBe(0);
    expect(c?.early_finish).toBe(1);
    expect(d?.early_start).toBe(1);
    expect(d?.early_finish).toBe(2);
  });
});

describe('runCpm execution-aware durations', () => {
  it('uses remaining duration for in-progress tasks during CPM', () => {
    const rows: ScheduleRow[] = [
      mkTask({
        row_id: 'A',
        name: 'A',
        taskStatus: 'IN_PROGRESS',
        duration: 10,
        remainingDuration: 4,
      }),
      mkTask({
        row_id: 'B',
        name: 'B',
        predecessors: [{ rowId: 'A', type: 'FS', lag: 0 }],
        duration: 5,
      }),
    ];

    const out = runCpm(rows);

    expect(out.projectDuration).toBe(9);
    expect(out.results.get('B')?.early_start).toBe(4);
  });

  it('treats completed task as zero future duration contribution', () => {
    const rows: ScheduleRow[] = [
      mkTask({
        row_id: 'A',
        name: 'A',
        taskStatus: 'COMPLETED',
        duration: 10,
        remainingDuration: 0,
        actualStart: new Date('2026-03-01T00:00:00.000Z'),
        actualFinish: new Date('2026-03-10T00:00:00.000Z'),
      }),
      mkTask({
        row_id: 'B',
        name: 'B',
        predecessors: [{ rowId: 'A', type: 'FS', lag: 0 }],
        duration: 5,
      }),
    ];

    const out = runCpm(rows);

    expect(out.projectDuration).toBe(5);
    expect(out.results.get('B')?.early_start).toBe(0);
  });
});
