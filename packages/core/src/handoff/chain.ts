/**
 * Build the schedule rows for an inter-department assignment handoff.
 *
 * From a single "issue assignment" spec, produce the canonical chain:
 *
 *   [задание]    Выдать задание → Отдел 2     (sender dept, duration > 0)
 *      │ FS
 *   [веха]       Задание получено             (receiver dept, duration 0)
 *      │ FS
 *   [разработка] Том X                         (receiver dept, optional)
 *
 * The receipt is a milestone (веха), not a second "задание": acceptance is an
 * event, not an act of issuing work. The development row carries the volume.
 * Links are wired via predecessors so the result drops straight into a schedule.
 */

import type { ScheduleRow } from '../schedule/types.js';
import { createBlankRow } from '../import/importToSchedule.js';

export interface HandoffSpec {
  /** Issuing department (owner of the assignment row). */
  fromDepartment: string;
  /** Receiving department (owner of the receipt + development rows). */
  toDepartment: string;
  /** Issuing organization, recorded on the assignment (audit requires it). */
  organization?: string;
  /** Name of the volume / book being requested (also the development row name). */
  volumeName: string;
  /** Working days to issue the assignment. Defaults to 1. */
  issueDuration?: number;
  /** Whether to also create the development (разработка) row. Default true. */
  includeDevelopment?: boolean;
  /** Stage to stamp on the created rows (e.g. 'проектирование'). */
  stage?: ScheduleRow['stage'];
}

/** Build the chain of rows (with wired FS links) for one handoff spec. */
export function buildHandoffChain(spec: HandoffSpec): ScheduleRow[] {
  const {
    fromDepartment,
    toDepartment,
    organization = '',
    volumeName,
    issueDuration = 1,
    includeDevelopment = true,
    stage = '',
  } = spec;

  const assignment = createBlankRow({
    name: `Выдать задание: ${volumeName} → ${toDepartment}`,
    row_type: 'задание',
    stage,
    department: fromDepartment,
    organization,
    duration: issueDuration,
  });

  const receipt = createBlankRow({
    name: `Задание получено: ${volumeName}`,
    row_type: 'веха',
    stage,
    department: toDepartment,
    duration: 0,
    predecessors: [{ rowId: assignment.row_id, type: 'FS', lag: 0 }],
  });

  const rows = [assignment, receipt];

  if (includeDevelopment) {
    const development = createBlankRow({
      name: volumeName,
      row_type: 'задача/разработка',
      stage,
      department: toDepartment,
      organization,
      predecessors: [{ rowId: receipt.row_id, type: 'FS', lag: 0 }],
    });
    rows.push(development);
  }

  return rows;
}

/** Build chains for a batch of specs (the batch "add assignments" dialog). */
export function buildHandoffChains(specs: HandoffSpec[]): ScheduleRow[] {
  return specs.flatMap(buildHandoffChain);
}
