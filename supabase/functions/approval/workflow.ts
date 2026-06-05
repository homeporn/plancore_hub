// Schedule version approval state machine — Deno copy of
// packages/core/src/approval/workflow.ts. Kept in sync by hand so the Edge
// Function (authoritative) and the app validate transitions identically.

export type ApprovalStatus = 'draft' | 'in_review' | 'approved' | 'rejected';
export type ApprovalRole = 'author' | 'approver' | 'viewer';
export type ApprovalAction = 'submit' | 'approve' | 'reject' | 'recall' | 'supersede';

interface Rule {
  from: ApprovalStatus[];
  to: ApprovalStatus;
  roles: ApprovalRole[];
}

const RULES: Record<ApprovalAction, Rule> = {
  submit: { from: ['draft', 'rejected'], to: 'in_review', roles: ['author', 'approver'] },
  approve: { from: ['in_review'], to: 'approved', roles: ['approver'] },
  reject: { from: ['in_review'], to: 'draft', roles: ['approver'] },
  recall: { from: ['in_review'], to: 'draft', roles: ['author', 'approver'] },
  supersede: { from: ['approved'], to: 'draft', roles: ['author', 'approver'] },
};

export interface ApprovalTransition {
  status: ApprovalStatus;
  freezeBaseline: boolean;
  createsNewVersion: boolean;
}

export class ApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApprovalError';
  }
}

export function canApprove(
  status: ApprovalStatus,
  action: ApprovalAction,
  role: ApprovalRole,
): boolean {
  const rule = RULES[action];
  return rule.from.includes(status) && rule.roles.includes(role);
}

export function applyApproval(
  status: ApprovalStatus,
  action: ApprovalAction,
  role: ApprovalRole,
): ApprovalTransition {
  const rule = RULES[action];
  if (!rule.from.includes(status)) {
    throw new ApprovalError(`Действие «${action}» недопустимо из статуса «${status}».`);
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
