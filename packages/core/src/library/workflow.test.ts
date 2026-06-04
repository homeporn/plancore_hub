import { describe, it, expect } from 'vitest';
import {
  applyTransition,
  canTransition,
  availableActions,
  LibraryTransitionError,
  type LibraryItemState,
} from './workflow.js';

const draft: LibraryItemState = { status: 'draft', validationState: 'valid', publishState: 'unpublished' };
const review: LibraryItemState = { status: 'review', validationState: 'valid', publishState: 'unpublished' };
const approved: LibraryItemState = { status: 'approved', validationState: 'valid', publishState: 'unpublished' };
const published: LibraryItemState = { status: 'approved', validationState: 'valid', publishState: 'published' };

describe('applyTransition — status flow', () => {
  it('draft → review on submit', () => {
    expect(applyTransition(draft, 'submit-for-review').status).toBe('review');
  });
  it('review → approved on approve', () => {
    expect(applyTransition(review, 'approve').status).toBe('approved');
  });
  it('review → draft on reject', () => {
    expect(applyTransition(review, 'reject').status).toBe('draft');
  });
  it('approved → archived on archive', () => {
    expect(applyTransition(approved, 'archive').status).toBe('archived');
  });
  it('archived → draft on restore', () => {
    const archived: LibraryItemState = { ...approved, status: 'archived' };
    expect(applyTransition(archived, 'restore').status).toBe('draft');
  });
  it('rejects an illegal transition', () => {
    expect(() => applyTransition(draft, 'approve')).toThrow(LibraryTransitionError);
  });
});

describe('applyTransition — publish flow', () => {
  it('publishes an approved, valid item', () => {
    expect(applyTransition(approved, 'publish').publishState).toBe('published');
  });
  it('refuses to publish a non-approved item', () => {
    expect(() => applyTransition(review, 'publish')).toThrow(LibraryTransitionError);
  });
  it('refuses to publish an invalid item', () => {
    const invalid: LibraryItemState = { ...approved, validationState: 'invalid' };
    expect(() => applyTransition(invalid, 'publish')).toThrow(LibraryTransitionError);
  });
  it('unpublishes a published item', () => {
    expect(applyTransition(published, 'unpublish').publishState).toBe('unpublished');
  });
  it('refuses to unpublish an unpublished item', () => {
    expect(() => applyTransition(approved, 'unpublish')).toThrow(LibraryTransitionError);
  });
  it('marks publication stale when leaving approved while published', () => {
    const result = applyTransition(published, 'archive');
    expect(result.status).toBe('archived');
    expect(result.publishState).toBe('stale');
  });
});

describe('canTransition / availableActions', () => {
  it('canTransition mirrors applyTransition', () => {
    expect(canTransition(draft, 'submit-for-review')).toBe(true);
    expect(canTransition(draft, 'approve')).toBe(false);
  });
  it('lists exactly the permitted actions for a draft', () => {
    expect(availableActions(draft).sort()).toEqual(['archive', 'submit-for-review']);
  });
  it('lists publish + unpublish appropriately for a published item', () => {
    const actions = availableActions(published);
    expect(actions).toContain('unpublish');
    expect(actions).toContain('archive');
    expect(actions).not.toContain('publish');
  });
});
