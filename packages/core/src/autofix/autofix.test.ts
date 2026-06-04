import { describe, it, expect } from 'vitest';
import { analyzeFixes, applyFixes } from './autofix.js';
import { createBlankRow } from '../import/importToSchedule.js';
import { mkLink } from '../schedule/links.js';
import type { ScheduleRow } from '../schedule/types.js';

function rows(...rs: Partial<ScheduleRow>[]): ScheduleRow[] {
  return rs.map((r) => createBlankRow(r));
}

describe('analyzeFixes', () => {
  it('detects a milestone with non-zero duration', () => {
    const [m] = rows({ sdr: '1', row_type: 'веха', duration: 5, remainingDuration: 5 });
    const proposals = analyzeFixes([m]);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({ fixId: 'milestone-zero-duration', before: '5', after: '0' });
  });

  it('detects an СДР needing normalization', () => {
    const [r] = rows({ sdr: ' 1 . 2 ..3 ' });
    const proposals = analyzeFixes([r]);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({ fixId: 'normalize-sdr', after: '1.2.3' });
  });

  it('detects links on a header row', () => {
    const a = createBlankRow({ sdr: '1' });
    const h = createBlankRow({ sdr: '2', row_type: 'заголовок', predecessors: [mkLink(a.row_id)] });
    const proposals = analyzeFixes([a, h]);
    expect(proposals.map((p) => p.fixId)).toContain('header-clear-links');
  });

  it('detects a self-referencing predecessor', () => {
    const r = createBlankRow({ sdr: '1' });
    r.predecessors = [mkLink(r.row_id)];
    const proposals = analyzeFixes([r]);
    expect(proposals.map((p) => p.fixId)).toContain('self-link-removal');
  });

  it('reports nothing for clean rows', () => {
    const r = rows({ sdr: '1.1', row_type: 'задача/разработка', duration: 3 });
    expect(analyzeFixes(r)).toEqual([]);
  });

  it('can be restricted to a subset of fix kinds', () => {
    const [m] = rows({ sdr: ' 1 ', row_type: 'веха', duration: 4 });
    const only = analyzeFixes([m], ['normalize-sdr']);
    expect(only.map((p) => p.fixId)).toEqual(['normalize-sdr']);
  });
});

describe('applyFixes', () => {
  it('zeroes a milestone duration', () => {
    const input = rows({ sdr: '1', row_type: 'веха', duration: 5, remainingDuration: 5 });
    const { rows: out, applied } = applyFixes(input, analyzeFixes(input));
    expect(out[0].duration).toBe(0);
    expect(out[0].remainingDuration).toBe(0);
    expect(applied).toHaveLength(1);
  });

  it('normalizes СДР', () => {
    const input = rows({ sdr: ' 1 . 2 ..3 ' });
    const { rows: out } = applyFixes(input, analyzeFixes(input));
    expect(out[0].sdr).toBe('1.2.3');
  });

  it('clears header links and removes self-links', () => {
    const a = createBlankRow({ sdr: '1' });
    const h = createBlankRow({ sdr: '2', row_type: 'заголовок', predecessors: [mkLink(a.row_id)] });
    const self = createBlankRow({ sdr: '3' });
    self.predecessors = [mkLink(self.row_id)];
    const input = [a, h, self];
    const { rows: out } = applyFixes(input, analyzeFixes(input));
    expect(out[1].predecessors).toHaveLength(0);
    expect(out[2].predecessors).toHaveLength(0);
  });

  it('does not mutate the input array or rows', () => {
    const input = rows({ sdr: '1', row_type: 'веха', duration: 5 });
    const snapshot = input[0].duration;
    applyFixes(input, analyzeFixes(input));
    expect(input[0].duration).toBe(snapshot); // original untouched
  });

  it('leaves unrelated rows referentially unchanged', () => {
    const clean = createBlankRow({ sdr: '1', duration: 3 });
    const milestone = createBlankRow({ sdr: '2', row_type: 'веха', duration: 5 });
    const input = [clean, milestone];
    const { rows: out } = applyFixes(input, analyzeFixes(input));
    expect(out[0]).toBe(clean); // same reference
    expect(out[1]).not.toBe(milestone);
  });

  it('is idempotent', () => {
    const input = rows(
      { sdr: ' 1 ', row_type: 'веха', duration: 5 },
      { sdr: ' 2 .1 ' },
    );
    const first = applyFixes(input, analyzeFixes(input));
    const second = applyFixes(first.rows, analyzeFixes(first.rows));
    expect(second.applied).toHaveLength(0);
    expect(second.rows.map((r) => [r.sdr, r.duration])).toEqual(
      first.rows.map((r) => [r.sdr, r.duration]),
    );
  });

  it('returns input unchanged for empty proposal list', () => {
    const input = rows({ sdr: '1' });
    const res = applyFixes(input, []);
    expect(res.rows).toBe(input);
    expect(res.applied).toEqual([]);
  });
});
