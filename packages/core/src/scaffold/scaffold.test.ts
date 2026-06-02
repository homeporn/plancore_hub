import { describe, it, expect } from 'vitest';
import { buildScheduleFromTemplate } from './scaffold.js';
import type { ScaffoldInput, ScaffoldParams } from './types.js';

const OBJ = 'станция';

// Two sections (А, Б), each a container with one leaf, plus a top header.
const input: ScaffoldInput = {
  templates: [
    { taskCode: '1', parentCode: '', taskName: 'Проект', sectionCode: 'ROOT', wbsLevel: 0, isDriver: false, sortOrder: 0, objectType: OBJ },
    { taskCode: '1.1', parentCode: '1', taskName: 'Раздел А', sectionCode: 'A', wbsLevel: 1, isDriver: false, sortOrder: 0, objectType: OBJ },
    { taskCode: '1.1.1', parentCode: '1.1', taskName: 'Задача А1', sectionCode: 'A', wbsLevel: 2, isDriver: true, sortOrder: 0, objectType: OBJ },
    { taskCode: '1.2', parentCode: '1', taskName: 'Раздел Б', sectionCode: 'B', wbsLevel: 1, isDriver: false, sortOrder: 1, objectType: OBJ },
    { taskCode: '1.2.1', parentCode: '1.2', taskName: 'Задача Б1', sectionCode: 'B', wbsLevel: 2, isDriver: true, sortOrder: 0, objectType: OBJ },
    // A different object type — must be ignored.
    { taskCode: '9', parentCode: '', taskName: 'Чужой', sectionCode: 'X', wbsLevel: 0, isDriver: false, sortOrder: 0, objectType: 'другое' },
  ],
  dependencies: [
    { fromSection: 'A', toSection: 'B', linkType: 'FS', lagDays: 2, objectType: OBJ },
  ],
  durationModels: [
    { sectionCode: 'A', driverSection: 'A', baseDurationDays: 10, formula: '', objectType: OBJ },
  ],
};

const params: ScaffoldParams = { objectType: OBJ, objectName: 'Ст-1', organization: 'Орг' };

describe('buildScheduleFromTemplate', () => {
  it('filters by object type', () => {
    const rows = buildScheduleFromTemplate(input, params);
    expect(rows).toHaveLength(5);
    expect(rows.some((r) => r.sdr === '9')).toBe(false);
  });

  it('marks containers as headers and leaves as tasks', () => {
    const rows = buildScheduleFromTemplate(input, params);
    const byCode = new Map(rows.map((r) => [r.sdr, r]));
    expect(byCode.get('1')!.row_type).toBe('заголовок');
    expect(byCode.get('1.1')!.row_type).toBe('заголовок');
    expect(byCode.get('1.1.1')!.row_type).toBe('задача/разработка');
    expect(byCode.get('1.2.1')!.row_type).toBe('задача/разработка');
  });

  it('headers carry no duration; leaves do', () => {
    const rows = buildScheduleFromTemplate(input, params);
    const byCode = new Map(rows.map((r) => [r.sdr, r]));
    expect(byCode.get('1')!.duration).toBeNull();
    expect(byCode.get('1.1.1')!.duration).toBe(10); // from duration model
  });

  it('applies section duration override before model', () => {
    const rows = buildScheduleFromTemplate(input, { ...params, sectionDurations: { A: 3 } });
    const a1 = rows.find((r) => r.sdr === '1.1.1')!;
    expect(a1.duration).toBe(3);
  });

  it('falls back to default duration when no model/override', () => {
    const rows = buildScheduleFromTemplate(input, { ...params, defaultDuration: 7 });
    const b1 = rows.find((r) => r.sdr === '1.2.1')!;
    expect(b1.duration).toBe(7); // section B has no model
  });

  it('links driver leaves per dependency rule', () => {
    const rows = buildScheduleFromTemplate(input, params);
    const byCode = new Map(rows.map((r) => [r.sdr, r]));
    const a1 = byCode.get('1.1.1')!;
    const b1 = byCode.get('1.2.1')!;
    expect(b1.predecessors).toHaveLength(1);
    expect(b1.predecessors[0]).toMatchObject({ rowId: a1.row_id, type: 'FS', lag: 2 });
    expect(a1.predecessors).toHaveLength(0);
  });

  it('applies object name and organization to rows', () => {
    const rows = buildScheduleFromTemplate(input, params);
    expect(rows.every((r) => r.organization === 'Орг')).toBe(true);
    expect(rows.every((r) => r.object === 'Ст-1')).toBe(true);
  });

  it('returns empty for unknown object type', () => {
    expect(buildScheduleFromTemplate(input, { objectType: 'нет-такого' })).toEqual([]);
  });

  it('is deterministic in row order and content (ids aside)', () => {
    const a = buildScheduleFromTemplate(input, params).map((r) => [r.sdr, r.row_type, r.duration]);
    const b = buildScheduleFromTemplate(input, params).map((r) => [r.sdr, r.row_type, r.duration]);
    expect(a).toEqual(b);
  });
});
