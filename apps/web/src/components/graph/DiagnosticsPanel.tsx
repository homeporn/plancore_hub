'use client';

import type { GraphDiagnostics, GraphNode } from '@plancore/core';

interface DiagnosticsPanelProps {
  diagnostics: GraphDiagnostics;
  nodes: GraphNode[];
  onFocus: (id: string) => void;
}

export function DiagnosticsPanel({ diagnostics, nodes, onFocus }: DiagnosticsPanelProps) {
  const label = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    return n ? `${n.sdr} ${n.name}`.trim() : id;
  };

  const { cycles, danglingStart, danglingEnd, missingRefs } = diagnostics;
  const clean =
    cycles.length === 0 && danglingStart.length === 0 && danglingEnd.length === 0 && missingRefs.length === 0;

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-auto border-l border-[var(--border)] bg-white p-4 text-sm">
      <h2 className="text-sm font-semibold">Диагностика связей</h2>

      {clean && <p className="text-xs text-green-600">✓ Структурных проблем не обнаружено.</p>}

      {cycles.length > 0 && (
        <Section title={`Циклы (${cycles.length})`} tone="critical">
          {cycles.map((cycle, i) => (
            <div key={i} className="rounded bg-red-50 p-2">
              <div className="mb-1 text-xs font-medium text-red-700">Цикл {i + 1}</div>
              <div className="flex flex-wrap gap-1">
                {cycle.map((id) => (
                  <button key={id} onClick={() => onFocus(id)} className="rounded bg-white px-1.5 py-0.5 text-xs text-red-700 ring-1 ring-red-200 hover:bg-red-100">
                    {label(id)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Section>
      )}

      {missingRefs.length > 0 && (
        <Section title={`Несуществующие связи (${missingRefs.length})`} tone="critical">
          {missingRefs.map((m, i) => (
            <button key={i} onClick={() => onFocus(m.rowId)} className="block w-full rounded px-1.5 py-1 text-left text-xs text-red-700 hover:bg-red-50">
              {label(m.rowId)} → отсутствует «{m.missingId}»
            </button>
          ))}
        </Section>
      )}

      {danglingStart.length > 0 && (
        <Section title={`Без предшественников (${danglingStart.length})`} tone="warning">
          {danglingStart.map((id) => (
            <button key={id} onClick={() => onFocus(id)} className="block w-full rounded px-1.5 py-1 text-left text-xs text-amber-700 hover:bg-amber-50">
              {label(id)}
            </button>
          ))}
        </Section>
      )}

      {danglingEnd.length > 0 && (
        <Section title={`Без последователей (${danglingEnd.length})`} tone="warning">
          {danglingEnd.map((id) => (
            <button key={id} onClick={() => onFocus(id)} className="block w-full rounded px-1.5 py-1 text-left text-xs text-amber-700 hover:bg-amber-50">
              {label(id)}
            </button>
          ))}
        </Section>
      )}
    </aside>
  );
}

function Section({ title, tone, children }: { title: string; tone: 'critical' | 'warning'; children: React.ReactNode }) {
  const dot = tone === 'critical' ? 'bg-red-500' : 'bg-amber-500';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
        {title}
      </div>
      {children}
    </div>
  );
}
