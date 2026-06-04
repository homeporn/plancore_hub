/**
 * Auto-correction of schedule rows.
 *
 * Each fix is a deterministic, local transformation of a single `ScheduleRow`,
 * associated with the audit rule it addresses (see `../audit/playbook.ts`). The
 * engine detects applicable rows itself from the canonical model, so it does
 * not depend on a prior audit run — `AuditFinding`s are only optional context.
 */

import type { ScheduleRow } from '../schedule/types.js';

/** Identifier for a fix kind. */
export type FixId =
  | 'milestone-zero-duration'
  | 'normalize-sdr'
  | 'header-clear-links'
  | 'self-link-removal';

/** A single concrete fix proposal targeting one row. */
export interface FixProposal {
  fixId: FixId;
  /** The audit rule this fix relates to (playbook key). */
  rule: string;
  rowId: string;
  sdr: string;
  /** Field shown to the user as affected (informational). */
  field: string;
  /** Human-readable summary of the change. */
  label: string;
  /** Previous value rendered for preview. */
  before: string;
  /** Resulting value rendered for preview. */
  after: string;
}

/** Result of applying fixes: new rows plus the proposals that were applied. */
export interface ApplyFixesResult {
  rows: ScheduleRow[];
  applied: FixProposal[];
}
