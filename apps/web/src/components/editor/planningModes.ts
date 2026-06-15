/**
 * Planning modes — gate editor features by the kind of schedule being built.
 * Currently only inter-department assignments (задания) and the volume registry
 * (тома) are gated; everything else is available in every mode.
 */

export type PlanningModeId = 'full' | 'design' | 'smr' | 'survey' | 'recon' | 'linear';

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
  { id: 'survey', label: 'Инженерные изыскания', caps: { handoff: false, volumes: true } },
  { id: 'recon', label: 'Реконструкция/капремонт', caps: { handoff: false, volumes: true } },
  { id: 'linear', label: 'Линейный объект', caps: { handoff: false, volumes: false } },
];

export const DEFAULT_PLANNING_MODE: PlanningModeId = 'full';

export function planningCaps(id: PlanningModeId): PlanningModeCaps {
  return (PLANNING_MODES.find((m) => m.id === id) ?? PLANNING_MODES[0]).caps;
}

/** Built-in wizard scenario id → planning mode. */
export function scenarioToMode(scenarioId: string): PlanningModeId {
  switch (scenarioId) {
    case 'design': return 'design';
    case 'construction': return 'smr';
    case 'survey': return 'survey';
    case 'reconstruction': return 'recon';
    case 'linear': return 'linear';
    case 'full':
    default: return 'full';
  }
}
