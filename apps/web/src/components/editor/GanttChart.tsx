'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { workingDaysBetween, DEFAULT_CALENDAR, type ScheduleRow } from '@plancore/core';

const DAY_W = 22;
const ROW_H = 28;
const HEADER_H = 28;
const LABEL_W_DEFAULT = 200;

interface Dates {
  start: Date;
  end: Date;
}

interface Props {
  rows: ScheduleRow[];
  /** Effective start/end per row id (explicit or CPM-derived). */
  dates: Map<string, Dates>;
  criticalIds?: Set<string>;
  selectedId?: string | null;
  readOnly?: boolean;
  onSelect: (rowId: string) => void;
  /** New duration (working days) after dragging a bar's right edge. */
  onResize: (rowId: string, durationDays: number) => void;
  /** Create an FS dependency predecessor → successor. */
  onLink: (predId: string, succId: string) => void;
  /** Show the task-name label column inside the chart (hidden when shown next to the grid). */
  showLabels?: boolean;
}

const DAY_MS = 86_400_000;
const diffDays = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY_MS);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;

type Drag =
  | { kind: 'resize'; rowId: string; x: number }
  | { kind: 'link'; rowId: string; x: number; y: number }
  | null;

/** Editable Gantt: drag a bar's right edge to change duration; drag the link
 *  handle onto another bar to create a dependency. Click a bar to select it. */
export function GanttChart({
  rows,
  dates,
  criticalIds,
  selectedId,
  readOnly = false,
  onSelect,
  onResize,
  onLink,
  showLabels = true,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const LABEL_W = showLabels ? LABEL_W_DEFAULT : 0;

  const range = useMemo(() => {
    let min: Date | null = null;
    let max: Date | null = null;
    for (const r of rows) {
      const d = dates.get(r.row_id);
      if (!d) continue;
      if (!min || d.start < min) min = d.start;
      if (!max || d.end > max) max = d.end;
    }
    if (!min || !max) return null;
    // Pad a few days on each side.
    return { min: addDays(min, -2), max: addDays(max, 5) };
  }, [rows, dates]);

  const xOf = useCallback(
    (d: Date) => (range ? LABEL_W + diffDays(range.min, d) * DAY_W : LABEL_W),
    [range, LABEL_W],
  );

  const localX = useCallback((clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    return clientX - (rect?.left ?? 0);
  }, []);
  const localY = useCallback((clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    return clientY - (rect?.top ?? 0);
  }, []);

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      setDrag((cur) => {
        if (!cur || !range) return null;
        if (cur.kind === 'resize') {
          const d = dates.get(cur.rowId);
          if (d) {
            const dayIdx = Math.round((localX(clientX) - LABEL_W) / DAY_W);
            const newEnd = addDays(range.min, Math.max(diffDays(range.min, d.start), dayIdx));
            const duration = Math.max(1, workingDaysBetween(d.start, newEnd, DEFAULT_CALENDAR));
            onResize(cur.rowId, duration);
          }
        } else {
          const idx = Math.floor((localY(clientY) - HEADER_H) / ROW_H);
          const target = rows[idx];
          if (target && target.row_id !== cur.rowId) onLink(cur.rowId, target.row_id);
        }
        return null;
      });
    },
    [range, dates, rows, localX, localY, onResize, onLink, LABEL_W],
  );

  // Window-level drag tracking.
  const onMouseDownDrag = useCallback(
    (d: Exclude<Drag, null>) => {
      if (readOnly) return;
      setDrag(d);
      const move = (e: MouseEvent) => {
        setDrag((cur) => (cur ? { ...cur, x: localX(e.clientX), y: localY(e.clientY) } : cur));
      };
      const up = (e: MouseEvent) => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        endDrag(e.clientX, e.clientY);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    },
    [readOnly, localX, localY, endDrag],
  );

  if (!range) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Нет дат для отображения. Задайте длительности или пересчитайте даты.
      </div>
    );
  }

  const totalDays = diffDays(range.min, range.max) + 1;
  const width = LABEL_W + totalDays * DAY_W;
  const height = HEADER_H + rows.length * ROW_H;

  // Week gridlines + labels.
  const ticks: { x: number; label: string }[] = [];
  for (let i = 0; i <= totalDays; i += 7) {
    const d = addDays(range.min, i);
    ticks.push({ x: xOf(d), label: fmt(d) });
  }

  const rowIndex = new Map(rows.map((r, i) => [r.row_id, i]));

  return (
    <div className="h-full w-full overflow-auto">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="select-none"
        style={{ cursor: drag?.kind === 'link' ? 'crosshair' : undefined }}
      >
        {/* Week gridlines */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.x} y1={HEADER_H} x2={t.x} y2={height} stroke="var(--border)" />
            <text x={t.x + 2} y={18} fontSize={10} fill="var(--muted-foreground)">{t.label}</text>
          </g>
        ))}
        <line x1={LABEL_W} y1={0} x2={LABEL_W} y2={height} stroke="var(--border-strong)" />
        <line x1={0} y1={HEADER_H} x2={width} y2={HEADER_H} stroke="var(--border)" />

        {/* Dependency arrows */}
        {rows.map((r) => {
          const succ = dates.get(r.row_id);
          const si = rowIndex.get(r.row_id);
          if (!succ || si === undefined) return null;
          return r.predecessors.map((p) => {
            const pred = dates.get(p.rowId);
            const pi = rowIndex.get(p.rowId);
            if (!pred || pi === undefined) return null;
            const x1 = xOf(pred.end) + DAY_W;
            const y1 = HEADER_H + pi * ROW_H + ROW_H / 2;
            const x2 = xOf(succ.start);
            const y2 = HEADER_H + si * ROW_H + ROW_H / 2;
            return (
              <polyline
                key={`${p.rowId}-${r.row_id}`}
                points={`${x1},${y1} ${x1 + 8},${y1} ${x1 + 8},${y2} ${x2},${y2}`}
                fill="none"
                stroke="var(--muted-foreground)"
                strokeWidth={1}
                markerEnd="url(#gantt-arrow)"
              />
            );
          });
        })}
        <defs>
          <marker id="gantt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--muted-foreground)" />
          </marker>
        </defs>

        {/* Rows */}
        {rows.map((r, i) => {
          const y = HEADER_H + i * ROW_H;
          const d = dates.get(r.row_id);
          const selected = r.row_id === selectedId;
          const critical = criticalIds?.has(r.row_id);
          const barX = d ? xOf(d.start) : LABEL_W;
          // Live preview of the resize.
          const barEnd =
            drag?.kind === 'resize' && drag.rowId === r.row_id
              ? Math.max(barX + DAY_W, drag.x)
              : d ? xOf(d.end) + DAY_W : barX;
          const barW = Math.max(DAY_W, barEnd - barX);
          const pct = Math.max(0, Math.min(100, r.percentComplete ?? 0));

          return (
            <g key={r.row_id}>
              {selected && <rect x={0} y={y} width={width} height={ROW_H} fill="var(--accent)" opacity={0.5} />}
              {/* Name label */}
              {showLabels && (
                <text x={8 + Math.min(r.sdr.split('.').length - 1, 4) * 10} y={y + ROW_H / 2 + 4} fontSize={11} fill="var(--foreground)">
                  {(r.sdr ? r.sdr + '  ' : '') + (r.name.length > 24 ? r.name.slice(0, 23) + '…' : r.name)}
                </text>
              )}

              {d && (
                <g onClick={() => onSelect(r.row_id)} style={{ cursor: 'pointer' }}>
                  {r.row_type === 'веха' ? (
                    <rect
                      x={barX} y={y + ROW_H / 2 - 6} width={12} height={12}
                      transform={`rotate(45 ${barX + 6} ${y + ROW_H / 2})`}
                      fill={critical ? '#dc2626' : '#1e3a8a'}
                    />
                  ) : (
                    <>
                      <rect x={barX} y={y + 5} width={barW} height={ROW_H - 10} rx={3}
                        fill={critical ? '#fca5a5' : '#bfdbfe'} stroke={critical ? '#dc2626' : '#2563eb'} />
                      <rect x={barX} y={y + 5} width={(barW * pct) / 100} height={ROW_H - 10} rx={3}
                        fill={critical ? '#dc2626' : '#2563eb'} />
                    </>
                  )}

                  {!readOnly && r.row_type !== 'веха' && (
                    <>
                      {/* Resize handle (right edge) */}
                      <rect
                        x={barX + barW - 5} y={y + 5} width={6} height={ROW_H - 10}
                        fill="transparent" style={{ cursor: 'ew-resize' }}
                        onMouseDown={(e) => { e.stopPropagation(); onMouseDownDrag({ kind: 'resize', rowId: r.row_id, x: barX + barW }); }}
                      />
                      {/* Link handle */}
                      <circle
                        cx={barX + barW + 6} cy={y + ROW_H / 2} r={4}
                        fill="var(--muted-foreground)" style={{ cursor: 'crosshair' }}
                        onMouseDown={(e) => { e.stopPropagation(); onMouseDownDrag({ kind: 'link', rowId: r.row_id, x: barX + barW + 6, y: y + ROW_H / 2 }); }}
                      />
                    </>
                  )}
                </g>
              )}
            </g>
          );
        })}

        {/* Link drag rubber-band */}
        {drag?.kind === 'link' && (
          <line
            x1={xOf(dates.get(drag.rowId)?.end ?? range.min) + DAY_W + 6}
            y1={HEADER_H + (rowIndex.get(drag.rowId) ?? 0) * ROW_H + ROW_H / 2}
            x2={drag.x}
            y2={drag.y}
            stroke="var(--brand, #2563eb)"
            strokeDasharray="4 3"
          />
        )}
      </svg>
    </div>
  );
}
