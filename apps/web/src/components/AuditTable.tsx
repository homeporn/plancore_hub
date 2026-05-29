'use client';

import { useMemo, useState } from 'react';
import type { AuditFinding, AuditResult, SeverityLevel } from '@plancore/core';
import { getPlaybook } from '@plancore/core';

interface AuditTableProps {
  result: AuditResult;
}

const LEVEL_META: Record<
  SeverityLevel,
  { label: string; icon: string; color: string }
> = {
  critical: { label: 'Критические', icon: '❌', color: 'var(--critical)' },
  warning: { label: 'Средние', icon: '⚠️', color: 'var(--warning)' },
  info: { label: 'Информационные', icon: 'ℹ️', color: 'var(--info)' },
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
      <div className="rounded-lg border border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
        Замечаний не найдено — график прошёл аудит. ✅
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
          return (
            <FilterChip
              key={lvl}
              active={levelFilter === lvl}
              onClick={() => setLevelFilter(lvl)}
              label={`${LEVEL_META[lvl].icon} ${LEVEL_META[lvl].label} (${count})`}
            />
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2">Уровень</th>
              <th className="px-3 py-2">СДР</th>
              <th className="px-3 py-2">Поле</th>
              <th className="px-3 py-2">Правило</th>
              <th className="px-3 py-2">Описание</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <FindingRow
                key={f.id}
                finding={f}
                expanded={expanded === f.id}
                onToggle={() =>
                  setExpanded((cur) => (cur === f.id ? null : f.id))
                }
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
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? 'border-[var(--foreground)] bg-[var(--foreground)] text-white'
          : 'border-[var(--border)] hover:bg-gray-50'
      }`}
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
  const playbook = expanded ? getPlaybook(finding.rule) : null;

  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-t border-[var(--border)] hover:bg-gray-50"
      >
        <td className="px-3 py-2 whitespace-nowrap" style={{ color: meta.color }}>
          {meta.icon}
        </td>
        <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
          {finding.taskSdr}
        </td>
        <td className="px-3 py-2 whitespace-nowrap">{finding.field}</td>
        <td className="px-3 py-2 whitespace-nowrap">{finding.rule}</td>
        <td className="px-3 py-2">{finding.description}</td>
      </tr>
      {expanded && playbook && (
        <tr className="border-t border-[var(--border)] bg-gray-50/60">
          <td colSpan={5} className="px-4 py-3 text-xs">
            <p className="mb-1">
              <strong>Задача:</strong> {finding.taskName}
            </p>
            <p className="mb-1">
              <strong>Рекомендация:</strong> {finding.recommendation}
            </p>
            <p className="mb-1">
              <strong>Почему важно:</strong> {playbook.why}
            </p>
            <p className="mb-1 whitespace-pre-line">
              <strong>Как исправить:</strong> {playbook.fixSteps}
            </p>
            <p>
              <strong>Проверка:</strong> {playbook.check}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
