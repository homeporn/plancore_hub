/**
 * Library item workflow state machine (pure).
 *
 * Mirrors the DB check constraints on `library_items`:
 *   status         ∈ draft | review | approved | archived
 *   validation     ∈ valid | warning | invalid
 *   publish_state  ∈ unpublished | published | stale
 *
 * The same rules drive both the orchestrator Edge Function (authoritative) and
 * the UI (enabling/disabling actions), so they live here, framework-agnostic.
 */

export const LIBRARY_STATUSES = ['draft', 'review', 'approved', 'archived'] as const;
export type LibraryStatusValue = (typeof LIBRARY_STATUSES)[number];

export const VALIDATION_STATES = ['valid', 'warning', 'invalid'] as const;
export type ValidationStateValue = (typeof VALIDATION_STATES)[number];

export const PUBLISH_STATES = ['unpublished', 'published', 'stale'] as const;
export type PublishStateValue = (typeof PUBLISH_STATES)[number];

/** A workflow action a user can request on a library item. */
export type LibraryAction =
  | 'submit-for-review' // draft → review
  | 'approve'           // review → approved
  | 'reject'            // review → draft
  | 'archive'           // any (except archived) → archived
  | 'restore'           // archived → draft
  | 'publish'           // approved & valid, publish_state → published
  | 'unpublish';        // published → unpublished

/** Allowed status transitions keyed by action. */
const STATUS_TRANSITIONS: Record<
  Exclude<LibraryAction, 'publish' | 'unpublish'>,
  { from: LibraryStatusValue[]; to: LibraryStatusValue }
> = {
  'submit-for-review': { from: ['draft'], to: 'review' },
  approve: { from: ['review'], to: 'approved' },
  reject: { from: ['review'], to: 'draft' },
  archive: { from: ['draft', 'review', 'approved'], to: 'archived' },
  restore: { from: ['archived'], to: 'draft' },
};

export interface LibraryItemState {
  status: LibraryStatusValue;
  validationState: ValidationStateValue;
  publishState: PublishStateValue;
}

export interface TransitionResult {
  status: LibraryStatusValue;
  publishState: PublishStateValue;
}

export class LibraryTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LibraryTransitionError';
  }
}

/** Whether `action` is currently allowed given the item's state. */
export function canTransition(state: LibraryItemState, action: LibraryAction): boolean {
  try {
    applyTransition(state, action);
    return true;
  } catch {
    return false;
  }
}

/**
 * Compute the next status/publishState for an action, or throw
 * `LibraryTransitionError` if the action is not permitted from this state.
 * Pure: does not mutate `state`.
 */
export function applyTransition(state: LibraryItemState, action: LibraryAction): TransitionResult {
  if (action === 'publish') {
    if (state.status !== 'approved') {
      throw new LibraryTransitionError('Опубликовать можно только утверждённый элемент.');
    }
    if (state.validationState === 'invalid') {
      throw new LibraryTransitionError('Нельзя опубликовать элемент с ошибками валидации.');
    }
    if (state.publishState === 'published') {
      throw new LibraryTransitionError('Элемент уже опубликован.');
    }
    return { status: state.status, publishState: 'published' };
  }

  if (action === 'unpublish') {
    if (state.publishState !== 'published') {
      throw new LibraryTransitionError('Снять с публикации можно только опубликованный элемент.');
    }
    return { status: state.status, publishState: 'unpublished' };
  }

  const rule = STATUS_TRANSITIONS[action];
  if (!rule.from.includes(state.status)) {
    throw new LibraryTransitionError(
      `Действие «${action}» недопустимо из статуса «${state.status}».`,
    );
  }

  // Leaving the approved/published state marks any publication as stale.
  let publishState = state.publishState;
  if (state.status === 'approved' && rule.to !== 'approved' && publishState === 'published') {
    publishState = 'stale';
  }

  return { status: rule.to, publishState };
}

/** All actions currently permitted on the item (for building UI controls). */
export function availableActions(state: LibraryItemState): LibraryAction[] {
  const all: LibraryAction[] = [
    'submit-for-review', 'approve', 'reject', 'archive', 'restore', 'publish', 'unpublish',
  ];
  return all.filter((a) => canTransition(state, a));
}
