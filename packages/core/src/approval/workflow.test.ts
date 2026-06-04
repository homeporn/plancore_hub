import { describe, it, expect } from 'vitest';
import {
  applyApproval,
  canApprove,
  availableApprovalActions,
  ApprovalError,
  type ApprovalState,
} from './workflow.js';

const draft: ApprovalState = { status: 'draft' };
const review: ApprovalState = { status: 'in_review' };
const approved: ApprovalState = { status: 'approved' };
const rejected: ApprovalState = { status: 'rejected' };

describe('applyApproval — transitions', () => {
  it('author submits draft → in_review', () => {
    expect(applyApproval(draft, 'submit', 'author').status).toBe('in_review');
  });
  it('author can resubmit a rejected version', () => {
    expect(applyApproval(rejected, 'submit', 'author').status).toBe('in_review');
  });
  it('approver approves in_review → approved and freezes baseline', () => {
    const t = applyApproval(review, 'approve', 'approver');
    expect(t.status).toBe('approved');
    expect(t.freezeBaseline).toBe(true);
  });
  it('approver rejects in_review → draft', () => {
    expect(applyApproval(review, 'reject', 'approver').status).toBe('draft');
  });
  it('author recalls in_review → draft', () => {
    expect(applyApproval(review, 'recall', 'author').status).toBe('draft');
  });
  it('supersede flags a new version from approved', () => {
    const t = applyApproval(approved, 'supersede', 'author');
    expect(t.status).toBe('draft');
    expect(t.createsNewVersion).toBe(true);
  });
});

describe('applyApproval — role and status guards', () => {
  it('author cannot approve', () => {
    expect(() => applyApproval(review, 'approve', 'author')).toThrow(ApprovalError);
  });
  it('viewer cannot submit', () => {
    expect(() => applyApproval(draft, 'submit', 'viewer')).toThrow(ApprovalError);
  });
  it('cannot approve a draft (wrong status)', () => {
    expect(() => applyApproval(draft, 'approve', 'approver')).toThrow(ApprovalError);
  });
  it('only approve freezes a baseline', () => {
    expect(applyApproval(review, 'reject', 'approver').freezeBaseline).toBe(false);
  });
});

describe('canApprove / availableApprovalActions', () => {
  it('canApprove mirrors applyApproval', () => {
    expect(canApprove(review, 'approve', 'approver')).toBe(true);
    expect(canApprove(review, 'approve', 'author')).toBe(false);
  });
  it('approver in review sees approve, reject and recall', () => {
    expect(availableApprovalActions(review, 'approver').sort()).toEqual(['approve', 'recall', 'reject']);
  });
  it('author in review sees recall only', () => {
    expect(availableApprovalActions(review, 'author')).toEqual(['recall']);
  });
  it('viewer never has actions', () => {
    expect(availableApprovalActions(draft, 'viewer')).toEqual([]);
    expect(availableApprovalActions(approved, 'viewer')).toEqual([]);
  });
  it('author on draft can submit', () => {
    expect(availableApprovalActions(draft, 'author')).toEqual(['submit']);
  });
});
