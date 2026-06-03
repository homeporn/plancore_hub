import type {
  ScheduleRow,
  RefSection,
  RefOrganization,
} from '@plancore/core';

/** Reference ids resolved from a row's free-text fields (hybrid linkage). */
export interface RowRefs {
  organizationId?: string;
  sectionId?: string;
}

/** Reference data needed to resolve a row's text fields to ids. */
export interface RefIndex {
  sections: RefSection[];
  organizations: RefOrganization[];
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Resolve a schedule row's free-text `organization` and section (derived from
 * `sdr`/`stage`/name conventions) into reference ids, when an unambiguous match
 * exists. Pure: the row keeps its text; resolved ids are returned separately.
 *
 * Matching is intentionally conservative — exact (case-insensitive) match on
 * name or code only, so we never guess. Unmatched fields are simply omitted.
 */
export function resolveRefs(row: ScheduleRow, index: RefIndex): RowRefs {
  const refs: RowRefs = {};

  if (row.organization) {
    const target = normalize(row.organization);
    const org = index.organizations.find((o) => normalize(o.name) === target);
    if (org) refs.organizationId = org.id;
  }

  // Section is matched by a leading code token in the task name, e.g. "АР …".
  const sectionToken = extractSectionToken(row.name);
  if (sectionToken) {
    const target = normalize(sectionToken);
    const section = index.sections.find(
      (s) => normalize(s.code) === target || normalize(s.name) === target,
    );
    if (section) refs.sectionId = section.id;
  }

  return refs;
}

/** Pull a likely section code (letters) from the start of a task name. */
function extractSectionToken(name: string): string | null {
  // Token of 2–4 uppercase letters at the start, followed by space/punct/end.
  // (JS \b is ASCII-only and won't break after Cyrillic, so match explicitly.)
  const match = name.trim().match(/^([А-ЯA-Z]{2,4})(?=\s|[—\-:.]|$)/);
  return match ? match[1] : null;
}
