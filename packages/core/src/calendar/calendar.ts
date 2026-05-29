import type { WorkCalendar } from './types.js';

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isWorkingDay(date: Date, cal: WorkCalendar): boolean {
  const ymd = toYmd(date);
  if (cal.workingExceptions.includes(ymd)) return true;
  if (cal.holidays.includes(ymd)) return false;
  return cal.workingDays.includes(date.getDay());
}

/** Add `days` working days to `start`. Returns a new Date. */
export function addWorkingDays(start: Date, days: number, cal: WorkCalendar): Date {
  if (days === 0) return new Date(start);
  const dir = days > 0 ? 1 : -1;
  let remaining = Math.abs(days);
  const d = new Date(start);
  while (remaining > 0) {
    d.setDate(d.getDate() + dir);
    if (isWorkingDay(d, cal)) remaining--;
  }
  return d;
}

/**
 * Count working days between two dates (exclusive of start, inclusive of end
 * when end > start, matching MS Project conventions).
 */
export function workingDaysBetween(start: Date, end: Date, cal: WorkCalendar): number {
  if (end <= start) return 0;
  let count = 0;
  const d = new Date(start);
  d.setDate(d.getDate() + 1);
  while (d <= end) {
    if (isWorkingDay(d, cal)) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/**
 * Given a project start date (day 0) and a working-day offset, return the
 * corresponding calendar date.
 */
export function offsetToDate(projectStart: Date, workDayOffset: number, cal: WorkCalendar): Date {
  if (workDayOffset === 0) return new Date(projectStart);
  return addWorkingDays(projectStart, workDayOffset, cal);
}

/**
 * Given a calendar date, return how many working days it is from the project
 * start (day 0).
 */
export function dateToOffset(projectStart: Date, date: Date, cal: WorkCalendar): number {
  return workingDaysBetween(projectStart, date, cal);
}
