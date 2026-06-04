// Library workflow state machine — Deno copy of packages/core/src/library/workflow.ts.
//
// Edge Functions run on Deno and cannot import the pnpm workspace package, so
// this authoritative server-side copy is kept byte-for-byte equivalent to the
// shared core logic. If you change one, change the other (a unit test in core
// guards the rules; keep them in sync).

export type LibraryStatusValue = 'draft' | 'review' | 'approved' | 'archived';
export type ValidationStateValue = 'valid' | 'warning' | 'invalid';
export type PublishStateValue = 'unpublished' | 'published' | 'stale';

export type LibraryAction =
  | 'submit-for-review'
  | 'approve'
  | 'reject'
  | 'archive'
  | 'restore'
  | 'publish'
  | 'unpublish';

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
  if (!rule || !rule.from.includes(state.status)) {
    throw new LibraryTransitionError(
      `Действие «${action}» недопустимо из статуса «${state.status}».`,
    );
  }

  let publishState = state.publishState;
  if (state.status === 'approved' && rule.to !== 'approved' && publishState === 'published') {
    publishState = 'stale';
  }

  return { status: rule.to, publishState };
}
