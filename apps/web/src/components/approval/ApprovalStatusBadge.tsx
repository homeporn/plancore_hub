import { Badge, type BadgeProps } from '@/components/ui/badge';
import { APPROVAL_STATUS_LABELS, type ApprovalStatus } from '@plancore/core';

const VARIANT: Record<ApprovalStatus, BadgeProps['variant']> = {
  draft: 'secondary',
  in_review: 'warning',
  approved: 'success',
  rejected: 'destructive',
};

/** Coloured badge for a schedule version's approval status. */
export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  return <Badge variant={VARIANT[status]}>{APPROVAL_STATUS_LABELS[status]}</Badge>;
}
