'use client';

import type { RefOrganization } from '@plancore/core';

export function OrganizationsPanel({ organizations }: { organizations: RefOrganization[] }) {
  if (organizations.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Организации не найдены.</p>;
  }
  return (
    <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
      {organizations.map((o) => (
        <li key={o.id} className="px-3 py-2 text-sm">{o.name}</li>
      ))}
    </ul>
  );
}
