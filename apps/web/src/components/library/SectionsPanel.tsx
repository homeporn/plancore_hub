'use client';

import { Check } from 'lucide-react';
import type { RefSection } from '@plancore/core';

export function SectionsPanel({ sections }: { sections: RefSection[] }) {
  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground">Разделы не заданы.</p>;
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Код</th>
            <th className="px-3 py-2 font-medium">Наименование</th>
            <th className="px-3 py-2 font-medium">EN</th>
            <th className="px-3 py-2 font-medium">Активен</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{s.code}</td>
              <td className="px-3 py-2">{s.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{s.nameEn ?? '—'}</td>
              <td className="px-3 py-2">
                {s.isActive ? <Check className="h-4 w-4 text-green-600" /> : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
