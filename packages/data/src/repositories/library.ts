import type {
  LibraryItem,
  LibraryItemVersion,
  LibraryItemFilter,
} from '@plancore/core';
import type { PlancoreClient } from '../supabase/client.js';
import {
  libraryItemRowToDomain,
  libraryVersionRowToDomain,
} from '../mappers/library.js';

/** List library items, optionally filtered by section / status / publish state. */
export async function listLibraryItems(
  client: PlancoreClient,
  filter: LibraryItemFilter = {},
): Promise<LibraryItem[]> {
  let query = client.from('library_items').select('*').order('item_code', { ascending: true });
  if (filter.section) query = query.eq('section', filter.section);
  if (filter.status) query = query.eq('status', filter.status);
  if (filter.publishState) query = query.eq('publish_state', filter.publishState);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(libraryItemRowToDomain);
}

/** Fetch a single library item by its unique `item_code`. */
export async function getLibraryItem(
  client: PlancoreClient,
  itemCode: string,
): Promise<LibraryItem | null> {
  const { data, error } = await client
    .from('library_items')
    .select('*')
    .eq('item_code', itemCode)
    .maybeSingle();
  if (error) throw error;
  return data ? libraryItemRowToDomain(data) : null;
}

/** List historical snapshots for a library item, newest first. */
export async function listItemVersions(
  client: PlancoreClient,
  libraryItemId: string,
): Promise<LibraryItemVersion[]> {
  const { data, error } = await client
    .from('library_item_versions')
    .select('*')
    .eq('library_item_id', libraryItemId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(libraryVersionRowToDomain);
}
