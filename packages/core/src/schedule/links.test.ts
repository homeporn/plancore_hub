import { describe, it, expect } from 'vitest';
import { formatPredecessors, parsePredecessors, mkLink } from './links.js';

const idToSdr = new Map([
  ['a', '1.1'],
  ['b', '2'],
  ['c', '3.4'],
]);
const sdrToId = new Map([...idToSdr].map(([id, sdr]) => [sdr, id]));

describe('formatPredecessors', () => {
  it('omits type/lag for a plain FS link', () => {
    expect(formatPredecessors([mkLink('a')], idToSdr)).toBe('1.1');
  });

  it('renders type and signed lag', () => {
    const links = [mkLink('b', 'SS', -2), mkLink('c', 'FS', 3)];
    expect(formatPredecessors(links, idToSdr)).toBe('2SS-2; 3.4FS+3');
  });

  it('drops links whose row is unknown', () => {
    expect(formatPredecessors([mkLink('missing')], idToSdr)).toBe('');
  });
});

describe('parsePredecessors', () => {
  it('parses a mix of bare, typed and lagged tokens', () => {
    const links = parsePredecessors('1.1; 2SS-2, 3.4FS+3', sdrToId);
    expect(links).toEqual([
      { rowId: 'a', type: 'FS', lag: 0 },
      { rowId: 'b', type: 'SS', lag: -2 },
      { rowId: 'c', type: 'FS', lag: 3 },
    ]);
  });

  it('ignores unknown SDRs, duplicates and self-references', () => {
    const links = parsePredecessors('1.1; 1.1; 9.9; 2', sdrToId, 'b');
    expect(links).toEqual([{ rowId: 'a', type: 'FS', lag: 0 }]);
  });

  it('round-trips with formatPredecessors', () => {
    const text = '1.1; 2SS-2; 3.4FF+5';
    expect(formatPredecessors(parsePredecessors(text, sdrToId), idToSdr)).toBe(text);
  });
});
