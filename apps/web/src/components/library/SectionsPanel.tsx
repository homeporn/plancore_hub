'use client';

import type { RefSection } from '@plancore/core';

export function SectionsPanel({ sections }: { sections: RefSection[] }) {
  if (sections.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Разделы не заданы.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-[var(--muted)]">
        <tr>
          <th className="px-3 py-1.5">Код</th>
          <th className="px-3 py-1.5">Наименование</th>
          <th className="px-3 py-1.5">EN</th>
          <th className="px-3 py-1.5">Активен</th>
        </tr>
      </thead>
      <tbody>
        {sections.map((s) => (
          <tr key={s.id} className="border-t border-[var(--border)]">
            <td className="px-3 py-1.5 font-mono text-xs">{s.code}</td>
            <td className="px-3 py-1.5">{s.name}</td>
            <td className="px-3 py-1.5 text-[var(--muted)]">{s.nameEn ?? '—'}</td>
            <td className="px-3 py-1.5">{s.isActive ? '✓' : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
