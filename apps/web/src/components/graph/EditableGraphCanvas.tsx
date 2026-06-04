'use client';

import { useRef, useState, useCallback, type PointerEvent, type WheelEvent } from 'react';
import type { ScheduleRow, CpmOutput } from '@plancore/core';
import type { NodePos, CanvasMode } from './useGraphEditor';

interface EditableGraphCanvasProps {
  rows: ScheduleRow[];
  positions: Map<string, NodePos>;
  cpm: CpmOutput;
  nodeSize: { width: number; height: number };
  mode: CanvasMode;
  selectedId: string | null;
  pendingSource: string | null;
  onNodeClick: (id: string) => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  onEdgeClick: (source: string, target: string) => void;
  onBackgroundClick: () => void;
}

interface View {
  scale: number;
  ox: number;
  oy: number;
}

/** Editable SVG canvas: drag nodes, draw arrows (connect mode), select edges. */
export function EditableGraphCanvas({
  rows,
  positions,
  cpm,
  nodeSize,
  mode,
  selectedId,
  pendingSource,
  onNodeClick,
  onNodeMove,
  onEdgeClick,
  onBackgroundClick,
}: EditableGraphCanvasProps) {
  const [view, setView] = useState<View>({ scale: 1, ox: 0, oy: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const pan = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const { width: W, height: H } = nodeSize;
  const critical = new Set(cpm.criticalPath);

  // Convert a screen point to canvas coordinates.
  const toCanvas = useCallback(
    (clientX: number, clientY: number): NodePos => {
      const rect = svgRef.current?.getBoundingClientRect();
      const px = clientX - (rect?.left ?? 0);
      const py = clientY - (rect?.top ?? 0);
      return { x: (px - view.ox) / view.scale, y: (py - view.oy) / view.scale };
    },
    [view],
  );

  const onWheel = useCallback((e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setView((v) => ({ ...v, scale: Math.min(2.5, Math.max(0.2, v.scale * factor)) }));
  }, []);

  const onBgPointerDown = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (e.target !== e.currentTarget) return;
      onBackgroundClick();
      pan.current = { active: true, sx: e.clientX, sy: e.clientY, ox: view.ox, oy: view.oy };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [view, onBackgroundClick],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (drag.current) {
        const p = toCanvas(e.clientX, e.clientY);
        onNodeMove(drag.current.id, p.x - drag.current.dx, p.y - drag.current.dy);
        return;
      }
      if (pan.current.active) {
        setView((v) => ({
          ...v,
          ox: pan.current.ox + (e.clientX - pan.current.sx),
          oy: pan.current.oy + (e.clientY - pan.current.sy),
        }));
      }
    },
    [toCanvas, onNodeMove],
  );

  const endInteraction = useCallback(() => {
    pan.current.active = false;
    drag.current = null;
  }, []);

  const startNodeDrag = useCallback(
    (e: PointerEvent, id: string) => {
      e.stopPropagation();
      onNodeClick(id);
      if (mode !== 'select') return; // no dragging while connecting
      const pos = positions.get(id);
      if (!pos) return;
      const p = toCanvas(e.clientX, e.clientY);
      drag.current = { id, dx: p.x - pos.x, dy: p.y - pos.y };
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    },
    [mode, positions, toCanvas, onNodeClick],
  );

  function anchorRight(p: NodePos) {
    return { x: p.x + W, y: p.y + H / 2 };
  }
  function anchorLeft(p: NodePos) {
    return { x: p.x, y: p.y + H / 2 };
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#fafafa]">
      <div className="absolute right-3 top-3 z-10 flex gap-1">
        <button onClick={() => setView((v) => ({ ...v, scale: Math.min(2.5, v.scale * 1.1) }))} className="rounded border border-[var(--border)] bg-white px-2 py-1 text-xs shadow-sm hover:bg-gray-50">+</button>
        <button onClick={() => setView((v) => ({ ...v, scale: Math.max(0.2, v.scale / 1.1) }))} className="rounded border border-[var(--border)] bg-white px-2 py-1 text-xs shadow-sm hover:bg-gray-50">−</button>
        <button onClick={() => setView({ scale: 1, ox: 0, oy: 0 })} className="rounded border border-[var(--border)] bg-white px-2 py-1 text-xs shadow-sm hover:bg-gray-50">Сброс</button>
      </div>

      <svg
        ref={svgRef}
        className={mode === 'connect' ? 'h-full w-full cursor-crosshair touch-none' : 'h-full w-full cursor-grab active:cursor-grabbing touch-none'}
        onWheel={onWheel}
        onPointerDown={onBgPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endInteraction}
        onPointerLeave={endInteraction}
      >
        <defs>
          <marker id="ge-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,4 L0,8 Z" fill="#9ca3af" />
          </marker>
          <marker id="ge-arrow-crit" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,4 L0,8 Z" fill="#dc2626" />
          </marker>
        </defs>

        <g transform={`translate(${view.ox}, ${view.oy}) scale(${view.scale})`}>
          {/* Edges (from predecessors) */}
          {rows.flatMap((row) =>
            row.predecessors.map((link) => {
              const sp = positions.get(link.rowId);
              const tp = positions.get(row.row_id);
              if (!sp || !tp) return null;
              const s = anchorRight(sp);
              const t = anchorLeft(tp);
              const dx = Math.max(40, Math.abs(t.x - s.x) / 2);
              const isCrit = critical.has(link.rowId) && critical.has(row.row_id);
              const label = [link.type !== 'FS' ? link.type : '', link.lag !== 0 ? `${link.lag > 0 ? '+' : ''}${link.lag}` : '']
                .filter(Boolean)
                .join(' ');
              return (
                <g key={`${link.rowId}->${row.row_id}`} className="cursor-pointer"
                   onPointerDown={(e) => { e.stopPropagation(); onEdgeClick(link.rowId, row.row_id); }}>
                  <path
                    d={`M ${s.x} ${s.y} C ${s.x + dx} ${s.y}, ${t.x - dx} ${t.y}, ${t.x} ${t.y}`}
                    fill="none"
                    stroke={isCrit ? '#dc2626' : '#9ca3af'}
                    strokeWidth={isCrit ? 2 : 1.25}
                    markerEnd={`url(#${isCrit ? 'ge-arrow-crit' : 'ge-arrow'})`}
                  />
                  {/* invisible fat hit area */}
                  <path d={`M ${s.x} ${s.y} C ${s.x + dx} ${s.y}, ${t.x - dx} ${t.y}, ${t.x} ${t.y}`} fill="none" stroke="transparent" strokeWidth={10} />
                  {label && (
                    <text x={(s.x + t.x) / 2} y={(s.y + t.y) / 2 - 4} textAnchor="middle" className="fill-gray-500" fontSize={10}>{label}</text>
                  )}
                </g>
              );
            }),
          )}

          {/* Nodes */}
          {rows.map((row) => {
            const pos = positions.get(row.row_id);
            if (!pos) return null;
            const isMilestone = row.row_type === 'веха';
            const isCrit = critical.has(row.row_id);
            const selected = row.row_id === selectedId;
            const pending = row.row_id === pendingSource;
            const stroke = pending ? '#2563eb' : selected ? '#2563eb' : isCrit ? '#dc2626' : '#d1d5db';
            const fill = isMilestone ? '#fef9c3' : isCrit ? '#fef2f2' : '#ffffff';
            return (
              <g key={row.row_id} transform={`translate(${pos.x}, ${pos.y})`} className="cursor-pointer"
                 onPointerDown={(e) => startNodeDrag(e, row.row_id)}>
                <rect width={W} height={H} rx={8} fill={fill} stroke={stroke} strokeWidth={selected || pending ? 2.5 : 1.5}
                      strokeDasharray={pending ? '4 2' : undefined} />
                <text x={10} y={18} fontSize={10} className="fill-gray-400">{row.sdr}{isMilestone ? ' ◆' : ''}</text>
                <text x={10} y={36} fontSize={12} className="fill-gray-900" fontWeight={600}>
                  {(row.name || '(без названия)').slice(0, 24)}
                </text>
                <text x={10} y={52} fontSize={10} className="fill-gray-500">
                  {isMilestone ? 'веха' : `${row.duration ?? 1} р.д.`}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
