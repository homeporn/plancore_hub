/**
 * Optimistic concurrency guard for schedule saves (pure).
 *
 * The editor holds the revision it loaded. On save it sends that expected
 * revision; the server compares it against the version's current revision. If
 * they diverge, someone else saved in the meantime and this save is stale —
 * the client must reload rather than overwrite (no silent last-write-wins).
 */

export type SaveOutcome = 'saved' | 'stale' | 'locked';

export interface SaveResult {
  outcome: SaveOutcome;
  /** The authoritative revision after the attempt (server's current revision). */
  revision: number;
}

/**
 * Decide whether a save may proceed given the revision the client expects and
 * the version's current server-side revision.
 *
 * - `locked`: the version is not editable (approved / in review).
 * - `stale`:  another save advanced the revision since the client loaded.
 * - `saved`:  revisions match — the save is safe to apply.
 *
 * Pure: the caller (RPC/repository) performs the actual write when `saved`.
 */
export function detectSaveConflict(
  expectedRevision: number,
  serverRevision: number,
  editable: boolean,
): SaveResult {
  if (!editable) {
    return { outcome: 'locked', revision: serverRevision };
  }
  if (expectedRevision !== serverRevision) {
    return { outcome: 'stale', revision: serverRevision };
  }
  return { outcome: 'saved', revision: serverRevision + 1 };
}

/** Approval statuses in which a schedule version accepts edits (draft in-place). */
export function isVersionEditable(approvalStatus: string): boolean {
  return approvalStatus === 'draft' || approvalStatus === 'rejected';
}
