import { describe, it, expect } from 'vitest';
import { detectSaveConflict, isVersionEditable } from './conflict.js';

describe('detectSaveConflict', () => {
  it('allows a save when revisions match and version is editable', () => {
    expect(detectSaveConflict(3, 3, true)).toEqual({ outcome: 'saved', revision: 4 });
  });

  it('reports stale when the server revision has advanced', () => {
    expect(detectSaveConflict(3, 5, true)).toEqual({ outcome: 'stale', revision: 5 });
  });

  it('reports stale when the client is somehow ahead', () => {
    expect(detectSaveConflict(6, 5, true)).toEqual({ outcome: 'stale', revision: 5 });
  });

  it('reports locked for a non-editable version regardless of revision', () => {
    expect(detectSaveConflict(3, 3, false)).toEqual({ outcome: 'locked', revision: 3 });
  });

  it('locked takes precedence over a revision match', () => {
    expect(detectSaveConflict(9, 9, false).outcome).toBe('locked');
  });
});

describe('isVersionEditable', () => {
  it('draft and rejected are editable', () => {
    expect(isVersionEditable('draft')).toBe(true);
    expect(isVersionEditable('rejected')).toBe(true);
  });

  it('in_review and approved are not editable', () => {
    expect(isVersionEditable('in_review')).toBe(false);
    expect(isVersionEditable('approved')).toBe(false);
  });
});
