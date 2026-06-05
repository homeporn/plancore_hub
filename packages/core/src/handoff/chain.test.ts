import { describe, it, expect } from 'vitest';
import { buildHandoffChain, buildHandoffChains } from './chain.js';

describe('buildHandoffChain', () => {
  it('builds задание → веха → разработка with wired FS links', () => {
    const rows = buildHandoffChain({
      fromDepartment: 'АР',
      toDepartment: 'КР',
      volumeName: 'Том КР1',
      organization: 'ООО Проект',
      stage: 'проектирование',
    });
    expect(rows).toHaveLength(3);
    const [assignment, receipt, development] = rows;

    expect(assignment.row_type).toBe('задание');
    expect(assignment.department).toBe('АР');
    expect(assignment.organization).toBe('ООО Проект');
    expect(assignment.duration).toBe(1);

    expect(receipt.row_type).toBe('веха');
    expect(receipt.department).toBe('КР');
    expect(receipt.duration).toBe(0);
    expect(receipt.predecessors).toEqual([{ rowId: assignment.row_id, type: 'FS', lag: 0 }]);

    expect(development.row_type).toBe('задача/разработка');
    expect(development.department).toBe('КР');
    expect(development.name).toBe('Том КР1');
    expect(development.predecessors).toEqual([{ rowId: receipt.row_id, type: 'FS', lag: 0 }]);
  });

  it('omits the development row when includeDevelopment is false', () => {
    const rows = buildHandoffChain({
      fromDepartment: 'АР',
      toDepartment: 'КР',
      volumeName: 'Том КР1',
      includeDevelopment: false,
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.row_type)).toEqual(['задание', 'веха']);
  });

  it('respects a custom issue duration', () => {
    const [assignment] = buildHandoffChain({
      fromDepartment: 'АР',
      toDepartment: 'КР',
      volumeName: 'Том',
      issueDuration: 5,
    });
    expect(assignment.duration).toBe(5);
  });

  it('gives every row a unique id', () => {
    const rows = buildHandoffChain({ fromDepartment: 'А', toDepartment: 'Б', volumeName: 'Т' });
    const ids = new Set(rows.map((r) => r.row_id));
    expect(ids.size).toBe(rows.length);
  });
});

describe('buildHandoffChains (batch)', () => {
  it('flattens chains for several specs with no id collisions', () => {
    const rows = buildHandoffChains([
      { fromDepartment: 'АР', toDepartment: 'КР', volumeName: 'Том 1' },
      { fromDepartment: 'АР', toDepartment: 'ОВ', volumeName: 'Том 2', includeDevelopment: false },
    ]);
    expect(rows).toHaveLength(3 + 2);
    expect(new Set(rows.map((r) => r.row_id)).size).toBe(5);
  });
});
