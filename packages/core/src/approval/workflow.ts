/**
 * Schedule version approval workflow (pure).
 *
 * Single-step route: the author submits a draft for review; an approver (ГИП)
 * approves or rejects. Approval freezes a baseline. Same shape as the library
 * workflow state machine, so it drives both the orchestrator Edge Function
 * (authoritative) and the UI (enabling actions).
 */

export const APPROVAL_STATUSES = ['draft', 'in_review', 'approved', 'rejected'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/** Roles that participate in approval (mapped from project_team / org roles). */
export type ApprovalRole = 'author' | 'approver' | 'viewer';

/** A workflow action a user can request on a schedule version. */
export type ApprovalAction =
  | 'submit'    // draft → in_review (author)
  | 'approve'   // in_review → approved (approver), freezes baseline
  | 'reject'    // in_review → draft (approver)
  | 'recall'    // in_review → draft (author withdraws)
  | 'supersede'; // approved → (new draft version); allowed to author/approver

interface Rule {
  from: ApprovalStatus[];
  to: ApprovalStatus;
  roles: ApprovalRole[];
}

const RULES: Record<ApprovalAction, Rule> = {
  submit:    { from: ['draft', 'rejected'], to: 'in_review', roles: ['author', 'approver'] },
  approve:   { from: ['in_review'],         to: 'approved',  roles: ['approver'] },
  reject:    { from: ['in_review'],         to: 'draft',     roles: ['approver'] },
  recall:    { from: ['in_review'],         to: 'draft',     roles: ['author', 'approver'] },
  supersede: { from: ['approved'],          to: 'draft',     roles: ['author', 'approver'] },
};

export interface ApprovalState {
  status: ApprovalStatus;
}

export interface ApprovalTransition {
  status: ApprovalStatus;
  /** True when this transition should freeze a baseline snapshot (on approve). */
  freezeBaseline: boolean;
  /** True when this transition should spawn a new draft version (supersede). */
  createsNewVersion: boolean;
}

export class ApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApprovalError';
  }
}

/** Whether `role` may perform `action` given the current status. */
export function canApprove(
  state: ApprovalState,
  action: ApprovalAction,
  role: ApprovalRole,
): boolean {
  const rule = RULES[action];
  return rule.from.includes(state.status) && rule.roles.includes(role);
}

/**
 * Compute the next status for an action, validating both the status transition
 * and the actor's role. Throws `ApprovalError` if not permitted. Pure.
 */
export function applyApproval(
  state: ApprovalState,
  action: ApprovalAction,
  role: ApprovalRole,
): ApprovalTransition {
  const rule = RULES[action];
  if (!rule.from.includes(state.status)) {
    throw new ApprovalError(
      `Действие «${action}» недопустимо из статуса «${state.status}».`,
    );
  }
  if (!rule.roles.includes(role)) {
    throw new ApprovalError(`Роль «${role}» не может выполнить действие «${action}».`);
  }
  return {
    status: rule.to,
    freezeBaseline: action === 'approve',
    createsNewVersion: action === 'supersede',
  };
}

/** Actions available to `role` from the current state (for building UI). */
export function availableApprovalActions(
  state: ApprovalState,
  role: ApprovalRole,
): ApprovalAction[] {
  return (Object.keys(RULES) as ApprovalAction[]).filter((a) => canApprove(state, a, role));
}

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  draft: 'Черновик',
  in_review: 'На согласовании',
  approved: 'Утверждён',
  rejected: 'Отклонён',
};
