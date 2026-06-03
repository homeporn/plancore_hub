import type { ScheduleRow } from '../schedule/types.js';
import type { GraphDiagnostics } from './types.js';

/**
 * Diagnose structural problems in the dependency network: cycles (via Tarjan's
 * SCC), dangling start/end tasks, and predecessor references to missing rows.
 * Header rows are ignored.
 */
export function diagnoseGraph(rows: ScheduleRow[]): GraphDiagnostics {
  const tasks = rows.filter((r) => r.row_type !== 'заголовок');
  const ids = new Set(tasks.map((r) => r.row_id));

  // Build adjacency (predecessor → successor) over existing rows only.
  const adj = new Map<string, string[]>();
  const hasIncoming = new Map<string, boolean>();
  const hasOutgoing = new Map<string, boolean>();
  for (const r of tasks) {
    adj.set(r.row_id, []);
    hasIncoming.set(r.row_id, false);
    hasOutgoing.set(r.row_id, false);
  }

  const missingRefs: { rowId: string; missingId: string }[] = [];
  for (const r of tasks) {
    for (const link of r.predecessors) {
      if (!ids.has(link.rowId)) {
        missingRefs.push({ rowId: r.row_id, missingId: link.rowId });
        continue;
      }
      adj.get(link.rowId)!.push(r.row_id);
      hasOutgoing.set(link.rowId, true);
      hasIncoming.set(r.row_id, true);
    }
  }

  const cycles = findCycles(tasks.map((r) => r.row_id), adj);

  const danglingStart: string[] = [];
  const danglingEnd: string[] = [];
  for (const r of tasks) {
    if (!hasIncoming.get(r.row_id) && r.row_type !== 'веха') danglingStart.push(r.row_id);
    if (!hasOutgoing.get(r.row_id) && r.row_type !== 'веха') danglingEnd.push(r.row_id);
  }

  return {
    hasCycles: cycles.length > 0,
    cycles,
    danglingStart,
    danglingEnd,
    missingRefs,
  };
}

/** Tarjan's strongly-connected-components; returns SCCs of size > 1 (cycles). */
function findCycles(nodeIds: string[], adj: Map<string, string[]>): string[][] {
  let index = 0;
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  // Iterative Tarjan to avoid stack overflow on large graphs.
  for (const start of nodeIds) {
    if (idx.has(start)) continue;
    const work: { node: string; i: number }[] = [{ node: start, i: 0 }];
    while (work.length > 0) {
      const frame = work[work.length - 1];
      const v = frame.node;
      if (frame.i === 0) {
        idx.set(v, index);
        low.set(v, index);
        index++;
        stack.push(v);
        onStack.add(v);
      }
      const neighbors = adj.get(v) ?? [];
      if (frame.i < neighbors.length) {
        const w = neighbors[frame.i];
        frame.i++;
        if (!idx.has(w)) {
          work.push({ node: w, i: 0 });
        } else if (onStack.has(w)) {
          low.set(v, Math.min(low.get(v)!, idx.get(w)!));
        }
      } else {
        if (low.get(v) === idx.get(v)) {
          const comp: string[] = [];
          let w: string;
          do {
            w = stack.pop()!;
            onStack.delete(w);
            comp.push(w);
          } while (w !== v);
          if (comp.length > 1) sccs.push(comp.reverse());
        }
        work.pop();
        if (work.length > 0) {
          const parent = work[work.length - 1].node;
          low.set(parent, Math.min(low.get(parent)!, low.get(v)!));
        }
      }
    }
  }

  // Self-loops (a row listing itself as predecessor) are cycles too.
  for (const v of nodeIds) {
    if ((adj.get(v) ?? []).includes(v)) sccs.push([v]);
  }

  return sccs;
}
