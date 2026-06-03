import { describe, it, expect } from 'vitest';
import { isWorkingDay, addWorkingDays, workingDaysBetween, offsetToDate, dateToOffset } from './calendar.js';
import type { WorkCalendar } from './types.js';

const stdCal: WorkCalendar = {
  workingDays: [1, 2, 3, 4, 5], // Mon–Fri
  holidays: [],
  workingExceptions: [],
};

// 2024-01-01 = Monday
const MON = new Date('2024-01-01');
const FRI = new Date('2024-01-05');
const SAT = new Date('2024-01-06');
const SUN = new Date('2024-01-07');

describe('isWorkingDay', () => {
  it('Monday is working', () => expect(isWorkingDay(MON, stdCal)).toBe(true));
  it('Friday is working', () => expect(isWorkingDay(FRI, stdCal)).toBe(true));
  it('Saturday is not working', () => expect(isWorkingDay(SAT, stdCal)).toBe(false));
  it('Sunday is not working', () => expect(isWorkingDay(SUN, stdCal)).toBe(false));

  it('holiday overrides weekday', () => {
    const cal: WorkCalendar = { ...stdCal, holidays: ['2024-01-01'] };
    expect(isWorkingDay(MON, cal)).toBe(false);
  });

  it('exception makes weekend working', () => {
    const cal: WorkCalendar = { ...stdCal, workingExceptions: ['2024-01-06'] };
    expect(isWorkingDay(SAT, cal)).toBe(true);
  });
});

describe('addWorkingDays', () => {
  it('adds 5 working days Mon → next Mon', () => {
    const result = addWorkingDays(MON, 5, stdCal);
    expect(result.toISOString().slice(0, 10)).toBe('2024-01-08'); // next Mon
  });

  it('adds 0 days returns same date', () => {
    const result = addWorkingDays(FRI, 0, stdCal);
    expect(result.toISOString().slice(0, 10)).toBe('2024-01-05');
  });

  it('skips weekends', () => {
    // Fri + 1 wd = Mon
    const result = addWorkingDays(FRI, 1, stdCal);
    expect(result.toISOString().slice(0, 10)).toBe('2024-01-08');
  });
});

describe('workingDaysBetween', () => {
  it('Mon to Fri = 4 working days (exclusive start)', () => {
    expect(workingDaysBetween(MON, FRI, stdCal)).toBe(4);
  });

  it('Mon to next Mon = 5', () => {
    const nextMon = new Date('2024-01-08');
    expect(workingDaysBetween(MON, nextMon, stdCal)).toBe(5);
  });

  it('same day = 0', () => {
    expect(workingDaysBetween(MON, MON, stdCal)).toBe(0);
  });
});

describe('offsetToDate / dateToOffset round-trip', () => {
  it('offset 5 from Mon = next Mon', () => {
    const d = offsetToDate(MON, 5, stdCal);
    expect(d.toISOString().slice(0, 10)).toBe('2024-01-08');
  });

  it('round-trip: dateToOffset(offsetToDate(n)) === n', () => {
    for (const n of [0, 1, 5, 10, 20]) {
      const d = offsetToDate(MON, n, stdCal);
      expect(dateToOffset(MON, d, stdCal)).toBe(n);
    }
  });
});
