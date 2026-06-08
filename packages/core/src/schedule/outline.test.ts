import { describe, it, expect } from 'vitest';
import {
  sdrDepth,
  clampLevels,
  outlineNumbers,
  hasChildrenFlags,
  hiddenByCollapse,
} from './outline.js';

describe('sdrDepth', () => {
  it('counts dot segments', () => {
    expect(sdrDepth('1')).toBe(0);
    expect(sdrDepth('1.2')).toBe(1);
    expect(sdrDepth('1.2.3')).toBe(2);
    expect(sdrDepth('')).toBe(0);
  });
});

describe('clampLevels', () => {
  it('prevents jumps deeper than one level', () => {
    expect(clampLevels([0, 2, 3])).toEqual([0, 1, 2]);
  });
  it('allows going shallower freely and never goes negative', () => {
    expect(clampLevels([0, 1, 0, -5])).toEqual([0, 1, 0, 0]);
  });
});

describe('outlineNumbers', () => {
  it('numbers a nested outline', () => {
    expect(outlineNumbers([0, 1, 1, 0, 1])).toEqual(['1', '1.1', '1.2', '2', '2.1']);
  });
  it('resets deeper counters when going shallower', () => {
    expect(outlineNumbers([0, 1, 2, 1, 0])).toEqual(['1', '1.1', '1.1.1', '1.2', '2']);
  });
});

describe('hasChildrenFlags', () => {
  it('marks rows that have a deeper next row', () => {
    expect(hasChildrenFlags([0, 1, 1, 0])).toEqual([true, false, false, false]);
  });
});

describe('hiddenByCollapse', () => {
  it('hides descendants until a same-or-shallower row', () => {
    const levels = [0, 1, 2, 1, 0];
    expect([...hiddenByCollapse(levels, new Set([0]))]).toEqual([1, 2, 3]);
    expect([...hiddenByCollapse(levels, new Set([1]))]).toEqual([2]);
  });
});
