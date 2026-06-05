'use client';

import { useMemo, useState } from 'react';
import { XCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AuditFinding, AuditResult, SeverityLevel } from '@plancore/core';
import { getPlaybook } from '@plancore/core';
import { cn } from '@/lib/utils';

interface AuditTableProps {
  result: AuditResult;
}

const LEVEL_META: Record<SeverityLevel, { label: string; icon: LucideIcon; className: string }> = {
  critical: { label: 'Критические', icon: XCircle, className: 'text-destructive' },
  warning: { label: 'Средние', icon: AlertTriangle, className: 'text-amber-600' },
  info: { label: 'Информационные', icon: Info, className: 'text-blue-600' },
};

export function AuditTable({ result }: AuditTableProps) {
  const [levelFilter, setLevelFilter] = useState<SeverityLevel | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const findings = useMemo(
    () =>
      levelFilter === 'all'
        ? result.findings
        : result.findings.filter((f) => f.level === levelFilter),
    [result.findings, levelFilter],
  );

  if (result.findings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border p-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
        <p className="text-sm text-muted-foreground">
          Замечаний не найдено — график прошёл аудит.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={levelFilter === 'all'}
          onClick={() => setLevelFilter('all')}
          label={`Все (${result.findings.length})`}
        />
        {(Object.keys(LEVEL_META) as SeverityLevel[]).map((lvl) => {
          const count = result.findings.filter((f) => f.level === lvl).length;
          const Icon = LEVEL_META[lvl].icon;
          return (
            <FilterChip
              key={lvl}
              active={levelFilter === lvl}
              onClick={() => setLevelFilter(lvl)}
              label={
                <span className="flex items-center gap-1">
                  <Icon className={cn('h-3.5 w-3.5', LEVEL_META[lvl].className)} />
                  {LEVEL_META[lvl].label} ({count})
                </span>
              }
            />
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Уровень</th>
              <th className="px-3 py-2 font-medium">СДР</th>
              <th className="px-3 py-2 font-medium">Поле</th>
              <th className="px-3 py-2 font-medium">Правило</th>
              <th className="px-3 py-2 font-medium">Описание</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <FindingRow
                key={f.id}
                finding={f}
                expanded={expanded === f.id}
                onToggle={() => setExpanded((cur) => (cur === f.id ? null : f.id))}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'hover:bg-accent',
      )}
    >
      {label}
    </button>
  );
}

function FindingRow({
  finding,
  expanded,
  onToggle,
}: {
  finding: AuditFinding;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = LEVEL_META[finding.level];
  const Icon = meta.icon;
  const playbook = expanded ? getPlaybook(finding.rule) : null;

  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer border-t hover:bg-muted/60">
        <td className="px-3 py-2 whitespace-nowrap">
          <Icon className={cn('h-4 w-4', meta.className)} />
        </td>
        <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{finding.taskSdr}</td>
        <td className="px-3 py-2 whitespace-nowrap">{finding.field}</td>
        <td className="px-3 py-2 whitespace-nowrap">{finding.rule}</td>
        <td className="px-3 py-2">{finding.description}</td>
      </tr>
      {expanded && playbook && (
        <tr className="border-t bg-muted/40">
          <td colSpan={5} className="px-4 py-3 text-xs">
            <p className="mb-1"><strong>Задача:</strong> {finding.taskName}</p>
            <p className="mb-1"><strong>Рекомендация:</strong> {finding.recommendation}</p>
            <p className="mb-1"><strong>Почему важно:</strong> {playbook.why}</p>
            <p className="mb-1 whitespace-pre-line"><strong>Как исправить:</strong> {playbook.fixSteps}</p>
            <p><strong>Проверка:</strong> {playbook.check}</p>
          </td>
        </tr>
      )}
    </>
  );
}
