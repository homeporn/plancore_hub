import { describe, it, expect } from 'vitest';
import { recalcProgressByTime, type ProgressInput } from './progress.js';
import { DEFAULT_CALENDAR } from '../calendar/index.js';

const d = (s: string) => new Date(s + 'T00:00:00');

// A 5-working-day task: Mon 2024-01-15 → Mon 2024-01-22 (skips the weekend).
const task = (over: Partial<ProgressInput> = {}): ProgressInput => ({
  rowId: 't',
  start: d('2024-01-15'),
  finish: d('2024-01-22'),
  status: 'NOT_STARTED',
  ...over,
});

describe('recalcProgressByTime', () => {
  it('is 0% / NOT_STARTED before the start', () => {
    const [r] = recalcProgressByTime([task()], d('2024-01-10'), DEFAULT_CALENDAR);
    expect(r).toMatchObject({ percentComplete: 0, taskStatus: 'NOT_STARTED' });
  });

  it('is 100% / COMPLETED at or after the finish', () => {
    const [r] = recalcProgressByTime([task()], d('2024-01-25'), DEFAULT_CALENDAR);
    expect(r).toMatchObject({ percentComplete: 100, taskStatus: 'COMPLETED' });
  });

  it('is partial / IN_PROGRESS in the middle', () => {
    const [r] = recalcProgressByTime([task()], d('2024-01-18'), DEFAULT_CALENDAR);
    expect(r.taskStatus).toBe('IN_PROGRESS');
    expect(r.percentComplete).toBeGreaterThan(0);
    expect(r.percentComplete).toBeLessThan(100);
  });

  it('leaves paused tasks untouched (no result)', () => {
    const res = recalcProgressByTime([task({ status: 'PAUSED' })], d('2024-01-18'), DEFAULT_CALENDAR);
    expect(res).toHaveLength(0);
  });

  it('skips tasks without dates', () => {
    const res = recalcProgressByTime([task({ start: null, finish: null })], d('2024-01-18'), DEFAULT_CALENDAR);
    expect(res).toHaveLength(0);
  });
});
