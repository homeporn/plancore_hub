/**
 * LibraryStore — the single read facade over reference data and library items.
 *
 * Wraps a `PlancoreClient` with an `AsyncCache` so the rest of the app fetches
 * dictionaries and methodologies through one cached gateway instead of calling
 * Supabase directly. Write/publish operations (via the orchestrator Edge
 * Function) will be added in a later step and will invalidate the relevant
 * cache keys here.
 */

import type {
  RefSection,
  RefSubsection,
  RefOrganization,
  LibraryItem,
  LibraryItemVersion,
  LibraryItemFilter,
  ScheduleRow,
} from '@plancore/core';
import type { PlancoreClient } from '@plancore/data';
import {
  listSections,
  listSubsections,
  listOrganizations,
  listLibraryItems,
  getLibraryItem,
  listItemVersions,
} from '@plancore/data';
import { AsyncCache } from './cache.js';
import { resolveRefs, type RowRefs, type RefIndex } from './resolveRefs.js';

export class LibraryStore {
  private readonly cache = new AsyncCache();

  constructor(private readonly client: PlancoreClient) {}

  // ── Reference dictionaries ──────────────────────────────

  getSections(): Promise<RefSection[]> {
    return this.cache.get('sections', () => listSections(this.client));
  }

  getSubsections(sectionId?: string): Promise<RefSubsection[]> {
    const key = sectionId ? `subsections:${sectionId}` : 'subsections:all';
    return this.cache.get(key, () => listSubsections(this.client, sectionId));
  }

  getOrganizations(): Promise<RefOrganization[]> {
    return this.cache.get('organizations', () => listOrganizations(this.client));
  }

  // ── Library items ───────────────────────────────────────

  listItems(filter: LibraryItemFilter = {}): Promise<LibraryItem[]> {
    const key = `items:${filter.section ?? ''}:${filter.status ?? ''}:${filter.publishState ?? ''}`;
    return this.cache.get(key, () => listLibraryItems(this.client, filter));
  }

  getItem(itemCode: string): Promise<LibraryItem | null> {
    return this.cache.get(`item:${itemCode}`, () => getLibraryItem(this.client, itemCode));
  }

  getItemVersions(libraryItemId: string): Promise<LibraryItemVersion[]> {
    return this.cache.get(`versions:${libraryItemId}`, () =>
      listItemVersions(this.client, libraryItemId),
    );
  }

  // ── Hybrid linkage ──────────────────────────────────────

  /** Build the index needed by `resolveRefs` (cached underneath). */
  private async refIndex(): Promise<RefIndex> {
    const [sections, organizations] = await Promise.all([
      this.getSections(),
      this.getOrganizations(),
    ]);
    return { sections, organizations };
  }

  /** Resolve one row's free-text fields to reference ids (hybrid linkage). */
  async resolveRowRefs(row: ScheduleRow): Promise<RowRefs> {
    return resolveRefs(row, await this.refIndex());
  }

  /** Resolve many rows in one pass, sharing the reference index. */
  async resolveAllRefs(rows: ScheduleRow[]): Promise<Map<string, RowRefs>> {
    const index = await this.refIndex();
    const out = new Map<string, RowRefs>();
    for (const row of rows) out.set(row.row_id, resolveRefs(row, index));
    return out;
  }

  // ── Cache control (used by write ops later) ─────────────

  invalidateLibrary(): void {
    this.cache.invalidatePrefix('items:');
    this.cache.invalidatePrefix('item:');
    this.cache.invalidatePrefix('versions:');
  }

  invalidateRefs(): void {
    this.cache.invalidate('sections');
    this.cache.invalidate('organizations');
    this.cache.invalidatePrefix('subsections:');
  }
}
