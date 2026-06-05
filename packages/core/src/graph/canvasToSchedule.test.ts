import { describe, it, expect } from 'vitest';
import { canvasToSchedule, type CanvasNodeInput, type CanvasEdgeInput } from './canvasToSchedule.js';
import { buildGraph } from './build.js';

const nodes: CanvasNodeInput[] = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C', rowType: 'веха' },
];
const edges: CanvasEdgeInput[] = [
  { source: 'a', target: 'b', type: 'FS', lag: 2 },
  { source: 'b', target: 'c' },
];

describe('canvasToSchedule', () => {
  it('maps node id → row_id and auto-numbers СДР by order', () => {
    const rows = canvasToSchedule(nodes, edges);
    expect(rows.map((r) => r.row_id)).toEqual(['a', 'b', 'c']);
    expect(rows.map((r) => r.sdr)).toEqual(['1', '2', '3']);
  });

  it('turns arrows into predecessor links on the target', () => {
    const rows = canvasToSchedule(nodes, edges);
    const b = rows.find((r) => r.row_id === 'b')!;
    expect(b.predecessors).toEqual([{ rowId: 'a', type: 'FS', lag: 2 }]);
    const c = rows.find((r) => r.row_id === 'c')!;
    expect(c.predecessors).toEqual([{ rowId: 'b', type: 'FS', lag: 0 }]);
    const a = rows.find((r) => r.row_id === 'a')!;
    expect(a.predecessors).toEqual([]);
  });

  it('marks milestones with zero duration', () => {
    const rows = canvasToSchedule(nodes, edges);
    const c = rows.find((r) => r.row_id === 'c')!;
    expect(c.row_type).toBe('веха');
    expect(c.duration).toBe(0);
  });

  it('defaults non-milestone duration to 1 unless provided', () => {
    const rows = canvasToSchedule(
      [{ id: 'x', name: 'X' }, { id: 'y', name: 'Y', duration: 7 }],
      [],
    );
    expect(rows[0].duration).toBe(1);
    expect(rows[1].duration).toBe(7);
  });

  it('drops self-loops and dangling edges', () => {
    const rows = canvasToSchedule(
      [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
      [
        { source: 'a', target: 'a' }, // self-loop
        { source: 'ghost', target: 'b' }, // dangling source
        { source: 'a', target: 'missing' }, // dangling target
      ],
    );
    expect(rows.every((r) => r.predecessors.length === 0)).toBe(true);
  });

  it('de-duplicates multiple arrows between the same pair', () => {
    const rows = canvasToSchedule(
      [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
      [
        { source: 'a', target: 'b', type: 'FS' },
        { source: 'a', target: 'b', type: 'SS' },
      ],
    );
    const b = rows.find((r) => r.row_id === 'b')!;
    expect(b.predecessors).toHaveLength(1);
  });

  it('round-trips through buildGraph (same nodes and edges)', () => {
    const rows = canvasToSchedule(nodes, edges);
    const g = buildGraph(rows);
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c']);
    const rebuilt = g.edges.map((e) => `${e.source}->${e.target}:${e.type}`).sort();
    expect(rebuilt).toEqual(['a->b:FS', 'b->c:FS']);
  });
});
