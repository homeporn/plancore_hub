import type { ScheduleRow } from '../schedule/types.js';
import type { CpmOutput } from '../cpm/engine.js';
import type { GraphModel, GraphNode, GraphEdge } from './types.js';

/**
 * Build a logic-network graph model from schedule rows and (optionally) a CPM
 * result. Header rows are excluded — they are organisational, not logical.
 * Edges are created only between rows that both exist in the graph.
 */
export function buildGraph(rows: ScheduleRow[], cpm?: CpmOutput): GraphModel {
  const tasks = rows.filter((r) => r.row_type !== 'заголовок');
  const ids = new Set(tasks.map((r) => r.row_id));
  const criticalSet = new Set(cpm?.criticalPath ?? []);

  const nodes: GraphNode[] = tasks.map((r) => {
    const res = cpm?.results.get(r.row_id);
    return {
      id: r.row_id,
      sdr: r.sdr,
      name: r.name,
      rowType: r.row_type,
      isMilestone: r.row_type === 'веха',
      isCritical: criticalSet.has(r.row_id),
      totalFloat: res ? res.total_float : null,
      earlyStart: res ? res.early_start : null,
      earlyFinish: res ? res.early_finish : null,
    };
  });

  const edges: GraphEdge[] = [];
  for (const r of tasks) {
    for (const link of r.predecessors) {
      if (!ids.has(link.rowId)) continue; // skip dangling refs (reported by diagnostics)
      edges.push({
        id: `${link.rowId}->${r.row_id}:${link.type}`,
        source: link.rowId,
        target: r.row_id,
        type: link.type,
        lag: link.lag,
        isCritical: criticalSet.has(link.rowId) && criticalSet.has(r.row_id),
      });
    }
  }

  return { nodes, edges };
}
