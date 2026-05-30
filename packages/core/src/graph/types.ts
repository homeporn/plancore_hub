import type { LinkType, RowType } from '../schedule/types.js';

/** A node in the logic network graph (one per schedule task). */
export interface GraphNode {
  id: string;          // row_id
  sdr: string;
  name: string;
  rowType: RowType;
  isMilestone: boolean;
  isCritical: boolean;
  totalFloat: number | null;
  earlyStart: number | null;
  earlyFinish: number | null;
}

/** A directed dependency edge (predecessor → successor). */
export interface GraphEdge {
  id: string;          // `${source}->${target}:${type}`
  source: string;      // predecessor row_id
  target: string;      // successor row_id
  type: LinkType;
  lag: number;
  /** True when both endpoints lie on the critical path. */
  isCritical: boolean;
}

/** Logical graph model, independent of any rendering layer. */
export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** A node with computed layout coordinates. */
export interface PositionedNode extends GraphNode {
  layer: number;   // horizontal rank (0 = no predecessors)
  order: number;   // vertical position within the layer
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphLayout {
  nodes: PositionedNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

export interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  hGap?: number;   // gap between layers (columns)
  vGap?: number;   // gap between nodes within a layer
  padding?: number;
}

/** Structural problems found in the dependency network. */
export interface GraphDiagnostics {
  hasCycles: boolean;
  /** Each detected cycle as an ordered list of row_ids. */
  cycles: string[][];
  /** Non-header tasks with no predecessors (besides the legitimate start). */
  danglingStart: string[];
  /** Non-milestone tasks with no successors (besides the legitimate finish). */
  danglingEnd: string[];
  /** Predecessor links pointing at row_ids that do not exist. */
  missingRefs: { rowId: string; missingId: string }[];
}
