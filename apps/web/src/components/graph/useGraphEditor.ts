'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  runCpm,
  buildGraph,
  layoutGraph,
  diagnoseGraph,
  canvasToSchedule,
  DEFAULT_CALENDAR,
  mkLink,
  type ScheduleRow,
  type LinkType,
} from '@plancore/core';

export interface NodePos {
  x: number;
  y: number;
}

/** Interaction mode of the canvas. */
export type CanvasMode = 'select' | 'connect';

const NODE_W = 180;
const NODE_H = 64;

/**
 * State and operations for the editable logic-graph canvas. The source of
 * truth is `ScheduleRow[]` (so it round-trips with the editor); node positions
 * are kept alongside. CPM / diagnostics are derived reactively.
 */
export function useGraphEditor() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [positions, setPositions] = useState<Map<string, NodePos>>(new Map());
  const [mode, setMode] = useState<CanvasMode>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingSource, setPendingSource] = useState<string | null>(null);

  // Derived analysis.
  const cpm = useMemo(() => runCpm(rows, DEFAULT_CALENDAR), [rows]);
  const model = useMemo(() => buildGraph(rows, cpm), [rows, cpm]);
  const diagnostics = useMemo(() => diagnoseGraph(rows), [rows]);

  /** Load rows (e.g. from Excel) and lay them out as starting positions. */
  const loadRows = useCallback((next: ScheduleRow[]) => {
    const m = buildGraph(next);
    const layout = layoutGraph(m, { nodeWidth: NODE_W, nodeHeight: NODE_H });
    const pos = new Map<string, NodePos>();
    for (const n of layout.nodes) pos.set(n.id, { x: n.x, y: n.y });
    setRows(next);
    setPositions(pos);
    setSelectedId(null);
    setPendingSource(null);
  }, []);

  const moveNode = useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => {
      const next = new Map(prev);
      next.set(id, { x, y });
      return next;
    });
  }, []);

  const addNode = useCallback((isMilestone = false) => {
    const id = crypto.randomUUID();
    setRows((prev) => {
      const sdr = String(prev.length + 1);
      const row: ScheduleRow = {
        ...canvasToSchedule([{ id, name: isMilestone ? 'Новая веха' : 'Новая задача', rowType: isMilestone ? 'веха' : 'задача/разработка', sdr }], [])[0],
      };
      return [...prev, row];
    });
    // Place new nodes in a visible spot; user drags from there.
    setPositions((prev) => {
      const next = new Map(prev);
      next.set(id, { x: 60 + (prev.size % 5) * 40, y: 60 + (prev.size % 5) * 40 });
      return next;
    });
    setSelectedId(id);
  }, []);

  const deleteNode = useCallback((id: string) => {
    setRows((prev) =>
      prev
        .filter((r) => r.row_id !== id)
        .map((r) => ({ ...r, predecessors: r.predecessors.filter((p) => p.rowId !== id) })),
    );
    setPositions((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setSelectedId((s) => (s === id ? null : s));
  }, []);

  const renameNode = useCallback((id: string, name: string) => {
    setRows((prev) => prev.map((r) => (r.row_id === id ? { ...r, name } : r)));
  }, []);

  /** Add a dependency arrow source → target (FS by default). No-op on cycdoubles. */
  const addEdge = useCallback((source: string, target: string) => {
    if (source === target) return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.row_id !== target) return r;
        if (r.predecessors.some((p) => p.rowId === source)) return r;
        return { ...r, predecessors: [...r.predecessors, mkLink(source, 'FS', 0)] };
      }),
    );
  }, []);

  const deleteEdge = useCallback((source: string, target: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.row_id === target
          ? { ...r, predecessors: r.predecessors.filter((p) => p.rowId !== source) }
          : r,
      ),
    );
  }, []);

  const setEdgeType = useCallback(
    (source: string, target: string, type: LinkType, lag: number) => {
      setRows((prev) =>
        prev.map((r) =>
          r.row_id === target
            ? {
                ...r,
                predecessors: r.predecessors.map((p) =>
                  p.rowId === source ? { ...p, type, lag } : p,
                ),
              }
            : r,
        ),
      );
    },
    [],
  );

  /** Click handling for connect mode: first click picks source, second adds edge. */
  const handleNodeClick = useCallback(
    (id: string) => {
      if (mode === 'select') {
        setSelectedId(id);
        return;
      }
      // connect mode
      if (pendingSource === null) {
        setPendingSource(id);
      } else {
        addEdge(pendingSource, id);
        setPendingSource(null);
      }
    },
    [mode, pendingSource, addEdge],
  );

  return {
    rows,
    positions,
    mode,
    selectedId,
    pendingSource,
    cpm,
    model,
    diagnostics,
    nodeSize: { width: NODE_W, height: NODE_H },
    setMode,
    setSelectedId,
    setPendingSource,
    loadRows,
    moveNode,
    addNode,
    deleteNode,
    renameNode,
    addEdge,
    deleteEdge,
    setEdgeType,
    handleNodeClick,
  };
}
