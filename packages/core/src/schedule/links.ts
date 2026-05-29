import type { LinkType, PredecessorLink } from './types.js';

/** Extract just the row IDs from a list of predecessor links. */
export function predIds(links: PredecessorLink[]): string[] {
  return links.map((l) => l.rowId);
}

/** Check whether a given row ID is present in the predecessor list. */
export function hasPred(links: PredecessorLink[], rowId: string): boolean {
  return links.some((l) => l.rowId === rowId);
}

/** Create a predecessor link, defaulting to a Finish→Start link with no lag. */
export function mkLink(
  rowId: string,
  type: LinkType = 'FS',
  lag = 0,
): PredecessorLink {
  return { rowId, type, lag };
}
