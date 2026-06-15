/**
 * Planning modes — gate editor features by the kind of schedule being built.
 * E.g. inter-department assignments (задания) and the volume registry only make
 * sense for design / full-cycle plans, not a standalone construction (СМР) plan.
 */

export type PlanningModeId = 'full' | 'design' | 'smr';

export interface PlanningModeCaps {
  /** Inter-department handoff assignments (кнопка «Задания»). */
  handoff: boolean;
  /** Volume registry import (кнопка «Тома»). */
  volumes: boolean;
}

export interface PlanningMode {
  id: PlanningModeId;
  label: string;
  caps: PlanningModeCaps;
}

export const PLANNING_MODES: PlanningMode[] = [
  { id: 'full', label: 'Полный цикл', caps: { handoff: true, volumes: true } },
  { id: 'design', label: 'Проектирование', caps: { handoff: true, volumes: true } },
  { id: 'smr', label: 'СМР (строительство)', caps: { handoff: false, volumes: false } },
];

export const DEFAULT_PLANNING_MODE: PlanningModeId = 'full';

export function planningCaps(id: PlanningModeId): PlanningModeCaps {
  return (PLANNING_MODES.find((m) => m.id === id) ?? PLANNING_MODES[0]).caps;
}
