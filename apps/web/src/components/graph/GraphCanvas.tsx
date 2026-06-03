'use client';

import { useRef, useState, useCallback, type WheelEvent, type PointerEvent } from 'react';
import type { GraphLayout, PositionedNode, GraphEdge } from '@plancore/core';

interface GraphCanvasProps {
  layout: GraphLayout;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

interface Point {
  x: number;
  y: number;
}

/** Cubic bezier path from a node's right edge to another node's left edge. */
function edgePath(source: PositionedNode, target: PositionedNode): string {
  const sx = source.x + source.width;
  const sy = source.y + source.height / 2;
  const tx = target.x;
  const ty = target.y + target.height / 2;
  const dx = Math.max(40, Math.abs(tx - sx) / 2);
  return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
}

function edgeLabel(edge: GraphEdge): string | null {
  const parts: string[] = [];
  if (edge.type !== 'FS') parts.push(edge.type);
  if (edge.lag !== 0) parts.push(`${edge.lag > 0 ? '+' : ''}${edge.lag}`);
  return parts.length > 0 ? parts.join(' ') : null;
}

export function GraphCanvas({ layout, selectedId, onSelect }: GraphCanvasProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const panState = useRef<{ active: boolean; startX: number; startY: number; ox: number; oy: number }>({
    active: false, startX: 0, startY: 0, ox: 0, oy: 0,
  });

  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]));

  const onWheel = useCallback((e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setScale((s) => Math.min(2.5, Math.max(0.2, s * factor)));
  }, []);

  const onPointerDown = useCallback((e: PointerEvent<SVGSVGElement>) => {
    if (e.target === e.currentTarget) onSelect(null);
    panState.current = { active: true, startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, [offset, onSelect]);

  const onPointerMove = useCallback((e: PointerEvent<SVGSVGElement>) => {
    if (!panState.current.active) return;
    setOffset({
      x: panState.current.ox + (e.clientX - panState.current.startX),
      y: panState.current.oy + (e.clientY - panState.current.startY),
    });
  }, []);

  const endPan = useCallback(() => { panState.current.active = false; }, []);

  const reset = useCallback(() => { setScale(1); setOffset({ x: 0, y: 0 }); }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#fafafa]">
      <div className="absolute right-3 top-3 z-10 flex gap-1">
        <button onClick={() => setScale((s) => Math.min(2.5, s * 1.1))} className="rounded border border-[var(--border)] bg-white px-2 py-1 text-xs shadow-sm hover:bg-gray-50">+</button>
        <button onClick={() => setScale((s) => Math.max(0.2, s / 1.1))} className="rounded border border-[var(--border)] bg-white px-2 py-1 text-xs shadow-sm hover:bg-gray-50">−</button>
        <button onClick={reset} className="rounded border border-[var(--border)] bg-white px-2 py-1 text-xs shadow-sm hover:bg-gray-50">Сброс</button>
      </div>

      <svg
        className="h-full w-full cursor-grab active:cursor-grabbing touch-none"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,4 L0,8 Z" fill="#9ca3af" />
          </marker>
          <marker id="arrow-crit" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,4 L0,8 Z" fill="#dc2626" />
          </marker>
        </defs>

        <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
          {/* Edges */}
          {layout.edges.map((edge) => {
            const s = nodeById.get(edge.source);
            const t = nodeById.get(edge.target);
            if (!s || !t) return null;
            const mx = (s.x + s.width + t.x) / 2;
            const my = (s.y + t.y) / 2 + s.height / 2;
            const label = edgeLabel(edge);
            return (
              <g key={edge.id}>
                <path
                  d={edgePath(s, t)}
                  fill="none"
                  stroke={edge.isCritical ? '#dc2626' : '#9ca3af'}
                  strokeWidth={edge.isCritical ? 2 : 1.25}
                  markerEnd={`url(#${edge.isCritical ? 'arrow-crit' : 'arrow'})`}
                />
                {label && (
                  <text x={mx} y={my - 4} textAnchor="middle" className="fill-gray-500" fontSize={10}>
                    {label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {layout.nodes.map((n) => (
            <GraphNodeBox key={n.id} node={n} selected={n.id === selectedId} onSelect={onSelect} />
          ))}
        </g>
      </svg>
    </div>
  );
}

function GraphNodeBox({ node, selected, onSelect }: { node: PositionedNode; selected: boolean; onSelect: (id: string) => void }) {
  const border = selected ? '#2563eb' : node.isCritical ? '#dc2626' : '#d1d5db';
  const fill = node.isMilestone ? '#fef9c3' : node.isCritical ? '#fef2f2' : '#ffffff';
  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onPointerDown={(e) => { e.stopPropagation(); onSelect(node.id); }}
      className="cursor-pointer"
    >
      <rect
        width={node.width}
        height={node.height}
        rx={8}
        fill={fill}
        stroke={border}
        strokeWidth={selected ? 2.5 : 1.5}
      />
      <text x={10} y={18} fontSize={10} className="fill-gray-400">{node.sdr}{node.isMilestone ? ' ◆' : ''}</text>
      <text x={10} y={36} fontSize={12} className="fill-gray-900" fontWeight={600}>
        {truncate(node.name || '(без названия)', 24)}
      </text>
      <text x={10} y={52} fontSize={10} className={node.isCritical ? 'fill-red-600' : 'fill-gray-500'}>
        {node.totalFloat != null ? `резерв ${node.totalFloat} р.д.` : ''}
      </text>
    </g>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
