/**
 * Inter-department assignment handoff workflow (pure).
 *
 * A "задание" is issued by one department and received by another, after which
 * the receiving department develops a volume (том). This models the *exchange
 * state* of that assignment so the schedule can show where handoffs are stuck.
 *
 * Two routes (both supported):
 *   - plain:      issued → received → accepted
 *   - with rework: … received → rejected → reworking → received → accepted
 *
 * Same shape as the approval/library state machines, so it drives both the
 * orchestrator (authoritative) and the UI (enabling actions).
 */

export const HANDOFF_STATUSES = [
  'issued',
  'received',
  'accepted',
  'rejected',
  'reworking',
] as const;
export type HandoffStatus = (typeof HANDOFF_STATUSES)[number];

/** Sides of an exchange (mapped from the issuing / receiving departments). */
export type HandoffRole = 'sender' | 'receiver' | 'viewer';

export type HandoffAction =
  | 'receive'   // issued | reworking → received (receiver confirms delivery)
  | 'accept'    // received → accepted (receiver accepts the assignment)
  | 'reject'    // received → rejected (receiver returns with remarks)
  | 'rework'    // rejected → reworking (sender reworks the assignment)
  | 'resubmit'; // reworking → received (sender re-delivers)

interface Rule {
  from: HandoffStatus[];
  to: HandoffStatus;
  roles: HandoffRole[];
}

const RULES: Record<HandoffAction, Rule> = {
  receive:  { from: ['issued', 'reworking'], to: 'received',  roles: ['receiver'] },
  accept:   { from: ['received'],            to: 'accepted',  roles: ['receiver'] },
  reject:   { from: ['received'],            to: 'rejected',  roles: ['receiver'] },
  rework:   { from: ['rejected'],            to: 'reworking', roles: ['sender'] },
  resubmit: { from: ['reworking'],           to: 'received',  roles: ['sender'] },
};

export interface HandoffState {
  status: HandoffStatus;
}

export interface HandoffTransition {
  status: HandoffStatus;
  /** True once the receiving department may start developing the volume. */
  unblocksDevelopment: boolean;
}

export class HandoffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HandoffError';
  }
}

/** Whether `role` may perform `action` given the current status. */
export function canHandoff(
  state: HandoffState,
  action: HandoffAction,
  role: HandoffRole,
): boolean {
  const rule = RULES[action];
  return rule.from.includes(state.status) && rule.roles.includes(role);
}

/**
 * Compute the next status for an action, validating both the status transition
 * and the actor's role. Throws `HandoffError` if not permitted. Pure.
 */
export function applyHandoff(
  state: HandoffState,
  action: HandoffAction,
  role: HandoffRole,
): HandoffTransition {
  const rule = RULES[action];
  if (!rule.from.includes(state.status)) {
    throw new HandoffError(`Действие «${action}» недопустимо из статуса «${state.status}».`);
  }
  if (!rule.roles.includes(role)) {
    throw new HandoffError(`Роль «${role}» не может выполнить действие «${action}».`);
  }
  return {
    status: rule.to,
    unblocksDevelopment: action === 'accept',
  };
}

/** Actions available to `role` from the current state (for building UI). */
export function availableHandoffActions(
  state: HandoffState,
  role: HandoffRole,
): HandoffAction[] {
  return (Object.keys(RULES) as HandoffAction[]).filter((a) => canHandoff(state, a, role));
}

export const HANDOFF_STATUS_LABELS: Record<HandoffStatus, string> = {
  issued: 'Выдано',
  received: 'Получено',
  accepted: 'Принято',
  rejected: 'Отклонено',
  reworking: 'На доработке',
};
