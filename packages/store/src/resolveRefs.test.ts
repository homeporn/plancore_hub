import { describe, it, expect } from 'vitest';
import { createBlankRow } from '@plancore/core';
import { resolveRefs, type RefIndex } from './resolveRefs.js';

const index: RefIndex = {
  sections: [
    { id: 'sec-ar', code: 'АР', name: 'Архитектурные решения', nameEn: null, isActive: true, sortOrder: 0 },
    { id: 'sec-kr', code: 'КР', name: 'Конструктивные решения', nameEn: null, isActive: true, sortOrder: 1 },
  ],
  organizations: [
    { id: 'org-1', name: 'ООО Проект' },
    { id: 'org-2', name: 'АО Институт' },
  ],
};

describe('resolveRefs', () => {
  it('matches organization by exact (case-insensitive) name', () => {
    const row = createBlankRow({ organization: 'ооо проект' });
    expect(resolveRefs(row, index).organizationId).toBe('org-1');
  });

  it('matches section by leading code token in the name', () => {
    const row = createBlankRow({ name: 'АР станции №2 — разработка' });
    expect(resolveRefs(row, index).sectionId).toBe('sec-ar');
  });

  it('omits organization when there is no exact match', () => {
    const row = createBlankRow({ organization: 'Проект' });
    expect(resolveRefs(row, index).organizationId).toBeUndefined();
  });

  it('omits section when no leading code is present', () => {
    const row = createBlankRow({ name: 'разработка станции' });
    expect(resolveRefs(row, index).sectionId).toBeUndefined();
  });

  it('returns empty object for a blank row', () => {
    expect(resolveRefs(createBlankRow(), index)).toEqual({});
  });
});
