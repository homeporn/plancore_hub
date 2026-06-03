import type { RefSection, RefSubsection, RefOrganization } from '@plancore/core';
import type { PlancoreClient } from '../supabase/client.js';
import {
  sectionRowToRef,
  subsectionRowToRef,
  organizationRowToRef,
} from '../mappers/library.js';

/** Active documentation sections (РД/ПД), ordered for display. */
export async function listSections(client: PlancoreClient): Promise<RefSection[]> {
  const { data, error } = await client
    .from('ref_sections')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(sectionRowToRef);
}

/** Subsections, optionally filtered to one section. */
export async function listSubsections(
  client: PlancoreClient,
  sectionId?: string,
): Promise<RefSubsection[]> {
  let query = client.from('ref_subsections').select('*').order('sort_order', { ascending: true });
  if (sectionId) query = query.eq('section_id', sectionId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(subsectionRowToRef);
}

/** Organizations visible to the current user (RLS-scoped). */
export async function listOrganizations(client: PlancoreClient): Promise<RefOrganization[]> {
  const { data, error } = await client.from('organizations').select('id, name').order('name');
  if (error) throw error;
  return (data ?? []).map(organizationRowToRef);
}
