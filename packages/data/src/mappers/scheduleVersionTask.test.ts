import { describe, expect, it } from 'vitest';
import { createBlankRow } from '@plancore/core';
import type { Database } from '../supabase/client.js';
import {
  scheduleRowToVersionTaskInsert,
  versionTaskToScheduleRow,
} from './scheduleVersionTask.js';

type VersionTaskRow =
  Database['public']['Tables']['project_schedule_version_tasks']['Row'];

describe('scheduleVersionTask mapper', () => {
  it('maps a DB row into a canonical ScheduleRow', () => {
    const dbRow: VersionTaskRow = {
      id: 'db-id',
      schedule_version_id: 'ver-1',
      task_row_id: 'row-1',
      sort_order: 0,
      wbs_code: '1.1',
      name: 'Проектирование',
      row_type: 'задача/разработка',
      stage: 'проектирование',
      object_name: 'Объект А',
      organization: 'Орг',
      department: 'АР',
      responsible: 'Иванов',
      predecessors_json: [{ rowId: 'row-0', type: 'FS', lag: 2 }],
      planned_start: '2026-01-10',
      planned_finish: '2026-01-20',
      planned_duration: 10,
      percent_complete: 50,
      physical_percent_complete: null,
      task_status: 'IN_PROGRESS',
      actual_start: null,
      actual_finish: null,
      remaining_duration: 5,
      total_volume: null,
      done_volume: null,
      planned_productivity: null,
      current_total_productivity: null,
      work: 80,
      actual_work: 40,
      remaining_work: 40,
      baseline_start: null,
      baseline_finish: null,
      forecast_start: null,
      forecast_finish: null,
      schedule_variance_days: null,
      is_delayed: false,
      comment: 'примечание',
    };

    const row = versionTaskToScheduleRow(dbRow);
    expect(row.row_id).toBe('row-1');
    expect(row.sdr).toBe('1.1');
    expect(row.taskStatus).toBe('IN_PROGRESS');
    expect(row.predecessors).toEqual([{ rowId: 'row-0', type: 'FS', lag: 2 }]);
    expect(row.startDate?.toISOString().slice(0, 10)).toBe('2026-01-10');
    expect(row.duration).toBe(10);
  });

  it('produces an insert payload preserving identity and dates', () => {
    const row = createBlankRow({
      row_id: 'row-9',
      sdr: '2.3',
      name: 'СМР',
      row_type: 'задача/разработка',
      startDate: new Date('2026-03-01T00:00:00Z'),
      endDate: new Date('2026-03-15T00:00:00Z'),
      duration: 14,
      predecessors: [{ rowId: 'row-8', type: 'SS', lag: -1 }],
    });

    const insert = scheduleRowToVersionTaskInsert(row, 'ver-2', 7);
    expect(insert.schedule_version_id).toBe('ver-2');
    expect(insert.task_row_id).toBe('row-9');
    expect(insert.sort_order).toBe(7);
    expect(insert.wbs_code).toBe('2.3');
    expect(insert.planned_start).toBe('2026-03-01');
    expect(insert.planned_finish).toBe('2026-03-15');
    expect(insert.predecessors_json).toEqual([
      { rowId: 'row-8', type: 'SS', lag: -1 },
    ]);
  });
});
