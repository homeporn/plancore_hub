/**
 * Auto-correction engine.
 *
 * `analyzeFixes(rows)` returns concrete, previewable proposals. `applyFixes`
 * applies a chosen subset immutably and idempotently: re-running it yields no
 * further changes because each detector only fires on rows that still violate
 * its condition.
 */

import type { ScheduleRow } from '../schedule/types.js';
import type { FixId, FixProposal, ApplyFixesResult } from './types.js';

/** A registered fix: how to detect it on a row, and how to apply it. */
interface FixDef {
  fixId: FixId;
  rule: string;
  field: string;
  /** Build a proposal if `row` violates this fix's condition, else null. */
  detect: (row: ScheduleRow, rows: ScheduleRow[]) => FixProposal | null;
  /** Return a new row with the fix applied. Must be idempotent. */
  apply: (row: ScheduleRow) => ScheduleRow;
}

/** Collapse internal whitespace and normalize separators in an СДР code. */
function normalizeSdr(sdr: string): string {
  return sdr
    .trim()
    .replace(/\s+/g, '')
    .replace(/[，、]/g, '.') // exotic separators → dot
    .replace(/\.{2,}/g, '.') // collapse repeated dots
    .replace(/^\.|\.$/g, ''); // trim leading/trailing dots
}

const FIXES: FixDef[] = [
  {
    fixId: 'milestone-zero-duration',
    rule: 'Веха: длительность > 0',
    field: 'duration',
    detect: (row) => {
      if (row.row_type !== 'веха') return null;
      const hasDuration = (row.duration ?? 0) !== 0 || (row.remainingDuration ?? 0) !== 0;
      if (!hasDuration) return null;
      return makeProposal('milestone-zero-duration', 'Веха: длительность > 0', 'duration', row, {
        label: 'Обнулить длительность вехи',
        before: String(row.duration ?? 0),
        after: '0',
      });
    },
    apply: (row) => ({ ...row, duration: 0, remainingDuration: 0 }),
  },
  {
    fixId: 'normalize-sdr',
    rule: 'Иерархия СДР',
    field: 'sdr',
    detect: (row) => {
      if (!row.sdr) return null;
      const next = normalizeSdr(row.sdr);
      if (next === row.sdr) return null;
      return makeProposal('normalize-sdr', 'Иерархия СДР', 'sdr', row, {
        label: 'Нормализовать код СДР',
        before: row.sdr,
        after: next,
      });
    },
    apply: (row) => ({ ...row, sdr: normalizeSdr(row.sdr) }),
  },
  {
    fixId: 'header-clear-links',
    rule: 'Заголовок: запрет связей',
    field: 'predecessors',
    detect: (row) => {
      if (row.row_type !== 'заголовок' || row.predecessors.length === 0) return null;
      return makeProposal('header-clear-links', 'Заголовок: запрет связей', 'predecessors', row, {
        label: 'Снять связи с заголовка',
        before: `${row.predecessors.length} связ.`,
        after: '0 связей',
      });
    },
    apply: (row) => ({ ...row, predecessors: [] }),
  },
  {
    fixId: 'self-link-removal',
    rule: 'Наличие предшественника',
    field: 'predecessors',
    detect: (row) => {
      if (!row.predecessors.some((p) => p.rowId === row.row_id)) return null;
      return makeProposal('self-link-removal', 'Наличие предшественника', 'predecessors', row, {
        label: 'Удалить самоссылку в связях',
        before: 'есть самоссылка',
        after: 'без самоссылки',
      });
    },
    apply: (row) => ({
      ...row,
      predecessors: row.predecessors.filter((p) => p.rowId !== row.row_id),
    }),
  },
];

function makeProposal(
  fixId: FixId,
  rule: string,
  field: string,
  row: ScheduleRow,
  parts: { label: string; before: string; after: string },
): FixProposal {
  return {
    fixId,
    rule,
    rowId: row.row_id,
    sdr: row.sdr,
    field,
    label: parts.label,
    before: parts.before,
    after: parts.after,
  };
}

const FIX_BY_ID = new Map<FixId, FixDef>(FIXES.map((f) => [f.fixId, f]));

/**
 * Inspect rows and return every applicable fix proposal. Pure — no mutation.
 * Optionally restrict to a subset of fix kinds.
 */
export function analyzeFixes(rows: ScheduleRow[], only?: FixId[]): FixProposal[] {
  const active = only ? FIXES.filter((f) => only.includes(f.fixId)) : FIXES;
  const proposals: FixProposal[] = [];
  for (const row of rows) {
    for (const fix of active) {
      const proposal = fix.detect(row, rows);
      if (proposal) proposals.push(proposal);
    }
  }
  return proposals;
}

/**
 * Apply the given proposals immutably. Only the targeted (rowId, fixId) pairs
 * are changed; all other rows are returned unchanged (same references).
 * Idempotent: applying the same proposals twice changes nothing the second time
 * (the condition no longer holds).
 */
export function applyFixes(rows: ScheduleRow[], proposals: FixProposal[]): ApplyFixesResult {
  if (proposals.length === 0) return { rows, applied: [] };

  // Index requested fixes by row for quick lookup.
  const byRow = new Map<string, Set<FixId>>();
  for (const p of proposals) {
    if (!byRow.has(p.rowId)) byRow.set(p.rowId, new Set());
    byRow.get(p.rowId)!.add(p.fixId);
  }

  const applied: FixProposal[] = [];
  const nextRows = rows.map((row) => {
    const wanted = byRow.get(row.row_id);
    if (!wanted) return row;

    let current = row;
    for (const fix of FIXES) {
      if (!wanted.has(fix.fixId)) continue;
      // Re-detect on the current state so the operation is idempotent and safe.
      const proposal = fix.detect(current, rows);
      if (!proposal) continue;
      current = fix.apply(current);
      applied.push(proposal);
    }
    return current;
  });

  return { rows: nextRows, applied };
}

export { FIX_BY_ID };
