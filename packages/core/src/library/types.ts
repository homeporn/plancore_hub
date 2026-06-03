/**
 * Library & reference-data domain types.
 *
 * Framework-agnostic mirrors of the Supabase reference tables (`ref_*`) and the
 * versioned `library_items` workflow. The data layer maps DB rows into these
 * shapes; UI and the store consume them without touching Supabase types.
 */

/** A reference entry shared by the simple code/name dictionaries. */
export interface RefEntry {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

/** A documentation section (РД/ПД), e.g. АР, КР (mirror of `ref_sections`). */
export interface RefSection extends RefEntry {
  nameEn: string | null;
}

/** A subsection nested under a section (mirror of `ref_subsections`). */
export interface RefSubsection extends RefEntry {
  sectionId: string;
  nameEn: string | null;
}

/** An organization the user can reference (mirror of `organizations`). */
export interface RefOrganization {
  id: string;
  name: string;
}

/** Workflow status fields shared by library items and their versions. */
export type LibraryStatus = string;
export type PublishState = string;
export type ValidationState = string;

/**
 * A versioned library item (methodology, rule set, dictionary payload).
 * `payload`/`scope`/`summary`/`tags` are free-form jsonb in the DB; kept as
 * `unknown`/records here and refined per `section` at the call site.
 */
export interface LibraryItem {
  id: string;
  itemCode: string;
  name: string;
  section: string;
  version: string;
  status: LibraryStatus;
  publishState: PublishState;
  validationState: ValidationState;
  ownerRole: string;
  reviewerRole: string;
  payload: unknown;
  scope: unknown;
  summary: unknown;
  tags: unknown;
  createdAt: string;
  updatedAt: string;
}

/** One historical snapshot of a library item (mirror of `library_item_versions`). */
export interface LibraryItemVersion {
  id: string;
  libraryItemId: string;
  version: string;
  status: LibraryStatus;
  publishState: PublishState;
  validationState: ValidationState;
  snapshot: unknown;
  note: string | null;
  createdAt: string;
}

/** Filter for listing library items. */
export interface LibraryItemFilter {
  section?: string;
  status?: LibraryStatus;
  publishState?: PublishState;
}
