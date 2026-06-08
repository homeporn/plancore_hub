'use client';

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  parseExcelFile,
  importToSchedule,
  type LinkType,
} from '@plancore/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { setScheduleHandoff } from '@/lib/scheduleHandoff';
import { useGraphEditor } from './useGraphEditor';
import { EditableGraphCanvas } from './EditableGraphCanvas';
import { DiagnosticsPanel } from './DiagnosticsPanel';

const LINK_TYPES: LinkType[] = ['FS', 'SS', 'FF', 'SF'];

/**
 * Bidirectional canvas: build a logic network by hand (nodes + arrows) or
 * import one, edit it, and hand the resulting schedule off to the editor.
 */
export function GraphView() {
  const ed = useGraphEditor();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.arrayBuffer().then((buf) => {
      try {
        const { tasks, missingColumns } = parseExcelFile(buf);
        if (missingColumns.length > 0) {
          toast.warning('Не хватает колонок', { description: missingColumns.join(', ') });
          return;
        }
        ed.loadRows(importToSchedule(tasks));
      } catch {
        toast.error('Не удалось прочитать файл Excel');
      }
    }).catch(() => toast.error('Ошибка чтения файла'));
    e.target.value = '';
  }, [ed]);

  const toEditor = useCallback(() => {
    if (ed.rows.length === 0) return;
    setScheduleHandoff(ed.rows);
    router.push('/editor');
  }, [ed.rows, router]);

  const selectedRow = ed.rows.find((r) => r.row_id === ed.selectedId) ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-2">
        <h1 className="text-sm font-semibold">Холст: логический граф</h1>

        <div className="ml-2 flex items-center gap-1 rounded-lg border border-[var(--border)] p-0.5">
          <Button variant={ed.mode === 'select' ? 'default' : 'ghost'} size="sm" onClick={() => { ed.setMode('select'); ed.setPendingSource(null); }}>
            Выбор
          </Button>
          <Button variant={ed.mode === 'connect' ? 'default' : 'ghost'} size="sm" onClick={() => ed.setMode('connect')}>
            Связи
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={() => ed.addNode(false)}>+ Задача</Button>
        <Button variant="outline" size="sm" onClick={() => ed.addNode(true)}>+ Веха</Button>

        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-[var(--muted)]">Длит.: <span className="font-medium text-[var(--foreground)]">{ed.cpm.projectDuration} р.д.</span></span>
          <span className="text-[var(--muted)]">Крит.: <span className="font-medium text-red-600">{ed.cpm.criticalPath.length}</span></span>
          {ed.diagnostics.hasCycles && <Badge variant="destructive">⚠ Циклы</Badge>}
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Импорт Excel</Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          <Button size="sm" onClick={toEditor} disabled={ed.rows.length === 0}>В редактор →</Button>
        </div>
      </header>

      {ed.mode === 'connect' && (
        <div className="shrink-0 bg-blue-50 px-4 py-1 text-xs text-blue-700">
          Режим связей: кликните задачу-предшественника, затем последователя. {ed.pendingSource && '(выбран предшественник — кликните цель)'}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {ed.rows.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-[var(--muted)]">
              <p className="text-sm">Пустой холст. Добавьте задачи кнопками сверху или импортируйте график из Excel.</p>
              <div className="flex gap-2">
                <Button onClick={() => ed.addNode(false)}>+ Задача</Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Импорт Excel</Button>
              </div>
            </div>
          ) : (
            <EditableGraphCanvas
              rows={ed.rows}
              positions={ed.positions}
              cpm={ed.cpm}
              nodeSize={ed.nodeSize}
              mode={ed.mode}
              selectedId={ed.selectedId}
              pendingSource={ed.pendingSource}
              onNodeClick={ed.handleNodeClick}
              onNodeMove={ed.moveNode}
              onEdgeClick={(s, t) => ed.setSelectedId(`${s}->${t}`)}
              onBackgroundClick={() => { ed.setSelectedId(null); ed.setPendingSource(null); }}
            />
          )}
        </div>

        <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-auto border-l border-[var(--border)] bg-white p-4 text-sm">
          {/* Selected node properties */}
          {selectedRow && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Свойства узла</h2>
              <label className="block space-y-1">
                <span className="text-xs text-[var(--muted)]">Наименование</span>
                <Input value={selectedRow.name} onChange={(e) => ed.renameNode(selectedRow.row_id, e.target.value)} />
              </label>
              <div className="text-xs text-[var(--muted)]">СДР: <span className="text-[var(--foreground)]">{selectedRow.sdr}</span></div>
              <Button variant="destructive" size="sm" onClick={() => ed.deleteNode(selectedRow.row_id)}>Удалить узел</Button>
            </div>
          )}

          {/* Selected edge properties */}
          {ed.selectedId?.includes('->') && (() => {
            const [source, target] = ed.selectedId.split('->');
            const tgt = ed.rows.find((r) => r.row_id === target);
            const link = tgt?.predecessors.find((p) => p.rowId === source);
            if (!link) return null;
            return (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold">Свойства связи</h2>
                <label className="block space-y-1">
                  <span className="text-xs text-[var(--muted)]">Тип</span>
                  <select
                    value={link.type}
                    onChange={(e) => ed.setEdgeType(source, target, e.target.value as LinkType, link.lag)}
                    className="w-full rounded-md border border-[var(--border)] px-2 py-1 text-sm"
                  >
                    {LINK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-[var(--muted)]">Лаг (р.д.)</span>
                  <Input type="number" value={link.lag}
                    onChange={(e) => ed.setEdgeType(source, target, link.type, Number(e.target.value) || 0)} />
                </label>
                <Button variant="destructive" size="sm" onClick={() => { ed.deleteEdge(source, target); ed.setSelectedId(null); }}>
                  Удалить связь
                </Button>
              </div>
            );
          })()}

          {!selectedRow && !ed.selectedId?.includes('->') && (
            <p className="text-xs text-[var(--muted)]">Выберите узел или связь, чтобы изменить свойства.</p>
          )}

          <div className="border-t border-[var(--border)] pt-3">
            <DiagnosticsPanel diagnostics={ed.diagnostics} nodes={ed.model.nodes} onFocus={ed.setSelectedId} />
          </div>
        </aside>
      </div>
    </div>
  );
}
