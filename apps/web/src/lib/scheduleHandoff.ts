'use client';

import type { ScheduleRow } from '@plancore/core';

/**
 * Schedule state shared between routes via sessionStorage.
 *
 * Two channels:
 * - one-shot handoff (wizard → editor): consumed on read;
 * - working copy (editor ⇄ graph): continuously written by whichever mode is
 *   open, read on mount, so switching modes never loses unsaved edits.
 *
 * Date fields are revived on read.
 */
const KEY = 'plancore:schedule-handoff';
const WORK_KEY = 'plancore:schedule-working-copy';

const DATE_FIELDS: (keyof ScheduleRow)[] = [
  'startDate', 'endDate', 'actualStart', 'actualFinish', 'baselineStart', 'baselineFinish',
];

function reviveDates(rows: ScheduleRow[]): ScheduleRow[] {
  for (const row of rows) {
    for (const field of DATE_FIELDS) {
      const value = row[field] as unknown;
      if (typeof value === 'string') {
        (row[field] as unknown) = new Date(value);
      }
    }
  }
  return rows;
}

function readRows(key: string): ScheduleRow[] | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return reviveDates(JSON.parse(raw) as ScheduleRow[]);
  } catch {
    return null;
  }
}

export function setScheduleHandoff(rows: ScheduleRow[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* storage unavailable — caller falls back to a blank editor */
  }
}

/** Consume the handoff (returns rows once, then clears it). */
export function takeScheduleHandoff(): ScheduleRow[] | null {
  const rows = readRows(KEY);
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return rows;
}

/**
 * Persist the current working rows (editor or graph). Keyed by project id so a
 * stale copy from another project is never applied; `null` = no project.
 */
export function setWorkingCopy(projectId: string | null, rows: ScheduleRow[]): void {
  try {
    sessionStorage.setItem(WORK_KEY, JSON.stringify({ projectId, rows }));
  } catch {
    /* ignore */
  }
}

/** Read the working copy if it belongs to the given project (non-consuming). */
export function getWorkingCopy(projectId: string | null): ScheduleRow[] | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(WORK_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { projectId: string | null; rows: ScheduleRow[] };
    if (parsed.projectId !== projectId) return null;
    return reviveDates(parsed.rows);
  } catch {
    return null;
  }
}
