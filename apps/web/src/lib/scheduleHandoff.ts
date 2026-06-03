'use client';

import type { ScheduleRow } from '@plancore/core';

/**
 * Lightweight one-shot handoff of generated schedule rows between routes (e.g.
 * wizard → editor) until a shared project context exists (Wave B). Rows are
 * stored in sessionStorage as JSON; Date fields are revived on read.
 */
const KEY = 'plancore:schedule-handoff';

const DATE_FIELDS: (keyof ScheduleRow)[] = [
  'startDate', 'endDate', 'actualStart', 'actualFinish', 'baselineStart', 'baselineFinish',
];

export function setScheduleHandoff(rows: ScheduleRow[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* storage unavailable — caller falls back to a blank editor */
  }
}

/** Consume the handoff (returns rows once, then clears it). */
export function takeScheduleHandoff(): ScheduleRow[] | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
    if (raw) sessionStorage.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ScheduleRow[];
    for (const row of parsed) {
      for (const field of DATE_FIELDS) {
        const value = row[field] as unknown;
        if (typeof value === 'string') {
          (row[field] as unknown) = new Date(value);
        }
      }
    }
    return parsed;
  } catch {
    return null;
  }
}
