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

const LINK_TYPES: readonly LinkType[] = ['FS', 'SS', 'FF', 'SF'];

/**
 * Render predecessor links as an editable string referencing SDR codes, e.g.
 * "1.2; 3SS-2; 5FS+3". FS links with zero lag show just the SDR.
 */
export function formatPredecessors(
  links: PredecessorLink[],
  idToSdr: Map<string, string>,
): string {
  return links
    .map((l) => {
      const sdr = idToSdr.get(l.rowId);
      if (!sdr) return null;
      const showType = l.type !== 'FS' || l.lag !== 0;
      const typePart = showType ? l.type : '';
      const lagPart = l.lag > 0 ? `+${l.lag}` : l.lag < 0 ? String(l.lag) : '';
      return `${sdr}${typePart}${lagPart}`;
    })
    .filter((s): s is string => s !== null)
    .join('; ');
}

/**
 * Parse an editable predecessor string (SDR-based) back into links. Tokens are
 * separated by ';' or ','; each is "<sdr>[FS|SS|FF|SF][±lag]". Unknown SDRs and
 * self-references are dropped. Pass `selfId` to prevent a row depending on itself.
 */
export function parsePredecessors(
  text: string,
  sdrToId: Map<string, string>,
  selfId?: string,
): PredecessorLink[] {
  const seen = new Set<string>();
  const out: PredecessorLink[] = [];
  for (const raw of text.split(/[;,]/)) {
    const part = raw.trim();
    if (!part) continue;
    const match = part.match(/^([\d.]+)\s*(FS|SS|FF|SF)?\s*([+-]?\d+)?\s*[дd]?$/i);
    if (!match || match[1] === undefined) continue;
    const id = sdrToId.get(match[1]);
    if (!id || id === selfId || seen.has(id)) continue;
    const type = (match[2]?.toUpperCase() as LinkType | undefined) ?? 'FS';
    if (!LINK_TYPES.includes(type)) continue;
    const lag = match[3] ? parseInt(match[3], 10) : 0;
    seen.add(id);
    out.push(mkLink(id, type, lag));
  }
  return out;
}
