import type { ScheduleRow, LinkType, RowType } from '../schedule/types.js';
import { mkLink } from '../schedule/links.js';
import { createBlankRow } from '../import/importToSchedule.js';

/** A node drawn on the canvas (minimal authoring shape). */
export interface CanvasNodeInput {
  /** Stable id; reused as the resulting row_id so edits round-trip. */
  id: string;
  name: string;
  /** Defaults to 'задача/разработка'; 'веха' for milestones. */
  rowType?: RowType;
  /** Optional explicit СДР; auto-numbered by order when omitted. */
  sdr?: string;
  duration?: number | null;
}

/** A directed dependency arrow drawn on the canvas (predecessor → successor). */
export interface CanvasEdgeInput {
  source: string; // predecessor node id
  target: string; // successor node id
  type?: LinkType;
  lag?: number;
}

/**
 * Inverse of `buildGraph`: turn a hand-drawn canvas (nodes + arrows) into a
 * canonical `ScheduleRow[]`. Node id → row_id (so round-tripping through
 * buildGraph is stable); each arrow becomes a `PredecessorLink` on its target.
 *
 * Pure and deterministic: output order follows node input order; СДР is
 * auto-numbered ("1", "2", …) unless a node supplies its own. Edges to/from
 * unknown nodes and self-loops are dropped.
 */
export function canvasToSchedule(
  nodes: CanvasNodeInput[],
  edges: CanvasEdgeInput[],
): ScheduleRow[] {
  const ids = new Set(nodes.map((n) => n.id));

  // Group valid edges by successor (target) for predecessor assembly.
  const bySuccessor = new Map<string, CanvasEdgeInput[]>();
  for (const e of edges) {
    if (e.source === e.target) continue; // drop self-loops
    if (!ids.has(e.source) || !ids.has(e.target)) continue; // drop dangling
    if (!bySuccessor.has(e.target)) bySuccessor.set(e.target, []);
    bySuccessor.get(e.target)!.push(e);
  }

  return nodes.map((n, i) => {
    const links = (bySuccessor.get(n.id) ?? [])
      // De-duplicate multiple arrows between the same pair (keep the first).
      .filter((e, idx, arr) => arr.findIndex((x) => x.source === e.source) === idx)
      .map((e) => mkLink(e.source, e.type ?? 'FS', e.lag ?? 0));

    return createBlankRow({
      row_id: n.id,
      sdr: n.sdr ?? String(i + 1),
      name: n.name,
      row_type: n.rowType ?? 'задача/разработка',
      duration: n.rowType === 'веха' ? 0 : (n.duration ?? 1),
      remainingDuration: n.rowType === 'веха' ? 0 : (n.duration ?? 1),
      predecessors: links,
    });
  });
}
