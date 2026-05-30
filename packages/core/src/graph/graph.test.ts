import { describe, it, expect } from 'vitest';
import type { ScheduleRow } from '../schedule/types.js';
import { mkLink } from '../schedule/links.js';
import { runCpm } from '../cpm/engine.js';
import { buildGraph } from './build.js';
import { layoutGraph } from './layout.js';
import { diagnoseGraph } from './diagnostics.js';

function row(id: string, partial: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    row_id: id,
    sdr: id,
    name: `Task ${id}`,
    row_type: 'задача/разработка',
    stage: '',
    object: '',
    organization: '',
    department: '',
    responsible: '',
    predecessors: [],
    startDate: null,
    endDate: null,
    duration: 2,
    percentComplete: 0,
    taskStatus: 'NOT_STARTED',
    actualStart: null,
    actualFinish: null,
    remainingDuration: null,
    work: null,
    actualWork: null,
    remainingWork: null,
    baselineStart: null,
    baselineFinish: null,
    normHours: null,
    comment: '',
    ...partial,
  };
}

// A → B → C linear chain
const chain: ScheduleRow[] = [
  row('A'),
  row('B', { predecessors: [mkLink('A')] }),
  row('C', { predecessors: [mkLink('B')] }),
];

describe('buildGraph', () => {
  it('creates one node per non-header task', () => {
    const rows = [...chain, row('H', { row_type: 'заголовок' })];
    const g = buildGraph(rows);
    expect(g.nodes).toHaveLength(3);
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C']);
  });

  it('creates edges for valid predecessor links', () => {
    const g = buildGraph(chain);
    expect(g.edges).toHaveLength(2);
    expect(g.edges.map((e) => `${e.source}->${e.target}`).sort()).toEqual(['A->B', 'B->C']);
  });

  it('skips edges to missing rows', () => {
    const rows = [row('A', { predecessors: [mkLink('ghost')] })];
    const g = buildGraph(rows);
    expect(g.edges).toHaveLength(0);
  });

  it('marks critical nodes and edges from CPM output', () => {
    const cpm = runCpm(chain);
    const g = buildGraph(chain, cpm);
    // Linear chain → every task is critical
    expect(g.nodes.every((n) => n.isCritical)).toBe(true);
    expect(g.edges.every((e) => e.isCritical)).toBe(true);
  });
});

describe('layoutGraph', () => {
  it('assigns increasing layers along a chain', () => {
    const g = buildGraph(chain);
    const layout = layoutGraph(g);
    const byId = new Map(layout.nodes.map((n) => [n.id, n]));
    expect(byId.get('A')!.layer).toBe(0);
    expect(byId.get('B')!.layer).toBe(1);
    expect(byId.get('C')!.layer).toBe(2);
  });

  it('gives later layers larger x', () => {
    const layout = layoutGraph(buildGraph(chain));
    const byId = new Map(layout.nodes.map((n) => [n.id, n]));
    expect(byId.get('A')!.x).toBeLessThan(byId.get('B')!.x);
    expect(byId.get('B')!.x).toBeLessThan(byId.get('C')!.x);
  });

  it('stacks parallel nodes in the same layer', () => {
    // A → B, A → C : B and C share layer 1
    const rows = [row('A'), row('B', { predecessors: [mkLink('A')] }), row('C', { predecessors: [mkLink('A')] })];
    const layout = layoutGraph(buildGraph(rows));
    const byId = new Map(layout.nodes.map((n) => [n.id, n]));
    expect(byId.get('B')!.layer).toBe(1);
    expect(byId.get('C')!.layer).toBe(1);
    expect(byId.get('B')!.y).not.toBe(byId.get('C')!.y);
  });

  it('handles empty graph', () => {
    const layout = layoutGraph({ nodes: [], edges: [] });
    expect(layout.nodes).toHaveLength(0);
    expect(layout.width).toBeGreaterThan(0);
  });

  it('still lays out a cyclic graph without throwing', () => {
    const rows = [
      row('A', { predecessors: [mkLink('C')] }),
      row('B', { predecessors: [mkLink('A')] }),
      row('C', { predecessors: [mkLink('B')] }),
    ];
    const layout = layoutGraph(buildGraph(rows));
    expect(layout.nodes).toHaveLength(3);
  });
});

describe('diagnoseGraph', () => {
  it('reports a clean chain as healthy (apart from endpoints)', () => {
    const d = diagnoseGraph(chain);
    expect(d.hasCycles).toBe(false);
    expect(d.cycles).toHaveLength(0);
    expect(d.danglingStart).toEqual(['A']); // chain head legitimately has no preds
    expect(d.danglingEnd).toEqual(['C']);   // chain tail legitimately has no succs
    expect(d.missingRefs).toHaveLength(0);
  });

  it('detects a cycle', () => {
    const rows = [
      row('A', { predecessors: [mkLink('C')] }),
      row('B', { predecessors: [mkLink('A')] }),
      row('C', { predecessors: [mkLink('B')] }),
    ];
    const d = diagnoseGraph(rows);
    expect(d.hasCycles).toBe(true);
    expect(d.cycles).toHaveLength(1);
    expect([...d.cycles[0]].sort()).toEqual(['A', 'B', 'C']);
  });

  it('detects a self-loop', () => {
    const rows = [row('A', { predecessors: [mkLink('A')] })];
    const d = diagnoseGraph(rows);
    expect(d.hasCycles).toBe(true);
    expect(d.cycles[0]).toEqual(['A']);
  });

  it('detects missing predecessor references', () => {
    const rows = [row('A', { predecessors: [mkLink('ghost')] })];
    const d = diagnoseGraph(rows);
    expect(d.missingRefs).toEqual([{ rowId: 'A', missingId: 'ghost' }]);
  });

  it('does not flag milestones as dangling', () => {
    const rows = [
      row('A'),
      row('M', { row_type: 'веха', predecessors: [mkLink('A')] }),
    ];
    const d = diagnoseGraph(rows);
    expect(d.danglingEnd).not.toContain('M');
  });
});
