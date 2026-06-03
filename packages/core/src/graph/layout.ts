import type { GraphModel, GraphLayout, PositionedNode, LayoutOptions } from './types.js';

const DEFAULTS: Required<LayoutOptions> = {
  nodeWidth: 180,
  nodeHeight: 64,
  hGap: 90,
  vGap: 28,
  padding: 40,
};

/**
 * Assign each node a layer (column) via longest-path layering, then stack nodes
 * vertically within each layer. Nodes participating in cycles still get a layer
 * (their incoming back-edges are ignored for ranking) so the graph always
 * renders. Returns absolute pixel coordinates plus the overall canvas size.
 */
export function layoutGraph(model: GraphModel, options: LayoutOptions = {}): GraphLayout {
  const opts = { ...DEFAULTS, ...options };
  const { nodes, edges } = model;

  if (nodes.length === 0) {
    return { nodes: [], edges, width: opts.padding * 2, height: opts.padding * 2 };
  }

  // Adjacency for longest-path layering (predecessor → successors).
  const succ = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  const present = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    succ.set(n.id, []);
    indeg.set(n.id, 0);
  }
  for (const e of edges) {
    if (!present.has(e.source) || !present.has(e.target)) continue;
    succ.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }

  // Kahn ordering; remaining (cyclic) nodes are appended afterwards.
  const layer = new Map<string, number>();
  const queue: string[] = [];
  const remainingDeg = new Map(indeg);
  for (const n of nodes) {
    if ((remainingDeg.get(n.id) ?? 0) === 0) {
      queue.push(n.id);
      layer.set(n.id, 0);
    }
  }
  const visited: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    visited.push(id);
    const base = layer.get(id) ?? 0;
    for (const s of succ.get(id) ?? []) {
      layer.set(s, Math.max(layer.get(s) ?? 0, base + 1));
      const d = (remainingDeg.get(s) ?? 1) - 1;
      remainingDeg.set(s, d);
      if (d === 0) queue.push(s);
    }
  }
  // Cyclic / unreached nodes: place after their already-ranked predecessors.
  for (const n of nodes) {
    if (!layer.has(n.id)) layer.set(n.id, 0);
  }

  // Group nodes by layer, preserving input order for stability.
  const byLayer = new Map<number, string[]>();
  let maxLayer = 0;
  for (const n of nodes) {
    const l = layer.get(n.id)!;
    maxLayer = Math.max(maxLayer, l);
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(n.id);
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const positioned: PositionedNode[] = [];
  let maxHeight = 0;

  for (let l = 0; l <= maxLayer; l++) {
    const ids = byLayer.get(l) ?? [];
    const colHeight = ids.length * opts.nodeHeight + Math.max(0, ids.length - 1) * opts.vGap;
    maxHeight = Math.max(maxHeight, colHeight);
    const x = opts.padding + l * (opts.nodeWidth + opts.hGap);
    ids.forEach((id, order) => {
      const n = nodeById.get(id)!;
      positioned.push({
        ...n,
        layer: l,
        order,
        x,
        y: opts.padding + order * (opts.nodeHeight + opts.vGap),
        width: opts.nodeWidth,
        height: opts.nodeHeight,
      });
    });
  }

  const width = opts.padding * 2 + (maxLayer + 1) * opts.nodeWidth + maxLayer * opts.hGap;
  const height = opts.padding * 2 + maxHeight;

  return { nodes: positioned, edges, width, height };
}
