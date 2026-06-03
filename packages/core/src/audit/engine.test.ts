import { describe, expect, it } from 'vitest';

import { runAudit } from './engine.js';
import type { TaskRow } from '../import/dto.js';

function makeTask(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    rowIndex: 1,
    sdr: '1.1',
    name: 'Task',
    fieldType: 'задача/разработка',
    predecessor: '',
    successor: '',
    organization: 'Org',
    department: 'Dept',
    station: 'Station',
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    endDate: new Date('2026-03-10T00:00:00.000Z'),
    duration: 9,
    completionPercent: 80,
    physicalPercentComplete: 20,
    taskStatus: 'IN_PROGRESS',
    actualStart: new Date('2026-03-01T00:00:00.000Z'),
    actualFinish: null,
    remainingDuration: 8,
    totalVolume: 100,
    doneVolume: 20,
    plannedProductivity: 10,
    currentTotalProductivity: null,
    laborPlan: 100,
    laborActual: null,
    laborRemaining: null,
    resourceName: '',
    baselineStart: null,
    baselineEnd: null,
    baselineLaborPlan: null,
    ...overrides,
  };
}

describe('execution-state audit rules', () => {
  it('flags mismatch between time and physical progress', () => {
    const result = runAudit([makeTask()]);
    expect(result.findings.some((f) => f.rule === 'Несоответствие физического прогресса')).toBe(true);
  });

  it('flags in-progress task without productivity/resource context', () => {
    const result = runAudit([
      makeTask({
        currentTotalProductivity: null,
        resourceName: '',
      }),
    ]);
    expect(result.findings.some((f) => f.rule === 'Активная задача без ресурса')).toBe(true);
  });

  it('flags completed task with stalled downstream', () => {
    const result = runAudit([
      makeTask({
        rowIndex: 1,
        taskStatus: 'COMPLETED',
        actualFinish: new Date('2026-03-05T00:00:00.000Z'),
        successor: '1.2',
      }),
      makeTask({
        rowIndex: 2,
        sdr: '1.2',
        predecessor: '1.1',
        taskStatus: 'NOT_STARTED',
        actualStart: null,
        completionPercent: 0,
        physicalPercentComplete: 0,
      }),
    ]);
    expect(result.findings.some((f) => f.rule === 'Завершение без старта последователя')).toBe(true);
  });

  it('flags growing remaining duration', () => {
    const result = runAudit([
      makeTask({
        completionPercent: 60,
        remainingDuration: 8,
        duration: 9,
      }),
    ]);
    expect(result.findings.some((f) => f.rule === 'Рост remaining duration')).toBe(true);
  });

  it('flags abrupt critical path change against comparison snapshot', () => {
    const result = runAudit(
      [
        makeTask({ sdr: '1.1', name: 'A' }),
        makeTask({ rowIndex: 2, sdr: '1.2', name: 'B' }),
        makeTask({ rowIndex: 3, sdr: '1.3', name: 'C' }),
      ],
      {
        currentCriticalPathSdrs: ['1.1', '1.2', '1.3'],
        comparisonSnapshot: {
          label: 'Baseline',
          criticalPathSdrs: ['1.4', '1.5', '1.6'],
        },
      },
    );

    expect(result.findings.some((f) => f.rule === 'Скачкообразное изменение critical path')).toBe(true);
  });
});
