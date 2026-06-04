import { Badge, type BadgeProps } from '@plancore/ui';
import { APPROVAL_STATUS_LABELS, type ApprovalStatus } from '@plancore/core';

const TONE: Record<ApprovalStatus, BadgeProps['tone']> = {
  draft: 'neutral',
  in_review: 'warning',
  approved: 'success',
  rejected: 'critical',
};

/** Coloured badge for a schedule version's approval status. */
export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  return <Badge tone={TONE[status]}>{APPROVAL_STATUS_LABELS[status]}</Badge>;
}
