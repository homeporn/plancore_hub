import type {
  RefSection,
  RefSubsection,
  RefOrganization,
  LibraryItem,
  LibraryItemVersion,
} from '@plancore/core';
import type { Database } from '../supabase/client.js';

type SectionRow = Database['public']['Tables']['ref_sections']['Row'];
type SubsectionRow = Database['public']['Tables']['ref_subsections']['Row'];
type OrgRefRow = Pick<
  Database['public']['Tables']['organizations']['Row'],
  'id' | 'name'
>;
type LibItemRow = Database['public']['Tables']['library_items']['Row'];
type LibVersionRow = Database['public']['Tables']['library_item_versions']['Row'];

export function sectionRowToRef(row: SectionRow): RefSection {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    nameEn: row.name_en,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function subsectionRowToRef(row: SubsectionRow): RefSubsection {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    nameEn: row.name_en,
    sectionId: row.section_id,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function organizationRowToRef(row: OrgRefRow): RefOrganization {
  return { id: row.id, name: row.name };
}

export function libraryItemRowToDomain(row: LibItemRow): LibraryItem {
  return {
    id: row.id,
    itemCode: row.item_code,
    name: row.name,
    section: row.section,
    version: row.version,
    status: row.status,
    publishState: row.publish_state,
    validationState: row.validation_state,
    ownerRole: row.owner_role,
    reviewerRole: row.reviewer_role,
    payload: row.payload,
    scope: row.scope,
    summary: row.summary,
    tags: row.tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function libraryVersionRowToDomain(row: LibVersionRow): LibraryItemVersion {
  return {
    id: row.id,
    libraryItemId: row.library_item_id,
    version: row.version,
    status: row.status,
    publishState: row.publish_state,
    validationState: row.validation_state,
    snapshot: row.snapshot,
    note: row.note,
    createdAt: row.created_at,
  };
}
