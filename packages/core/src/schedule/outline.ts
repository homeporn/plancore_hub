/**
 * WBS (СДР) outline helpers — pure. Rows are a flat, ordered list with a depth
 * level each; these compute the hierarchical numbering and the parent/child
 * relationships used for indenting and collapsing.
 */

/** Depth of an SDR code by its dot segments ("1" → 0, "1.2" → 1, "1.2.3" → 2). */
export function sdrDepth(sdr: string): number {
  if (!sdr) return 0;
  return sdr.split('.').length - 1;
}

/**
 * Clamp a sequence of levels so each row is at most one deeper than the row
 * above it (and never negative). Keeps the outline well-formed after edits.
 */
export function clampLevels(levels: number[]): number[] {
  const out: number[] = [];
  let prev = -1;
  for (const raw of levels) {
    const max = prev + 1;
    const lvl = Math.min(Math.max(0, raw), Math.max(0, max));
    out.push(lvl);
    prev = lvl;
  }
  return out;
}

/**
 * Compute hierarchical outline numbers ("1", "1.1", "1.2", "2", "2.1", …) for a
 * list of (clamped) levels in row order.
 */
export function outlineNumbers(levels: number[]): string[] {
  const counters: number[] = [];
  return clampLevels(levels).map((level) => {
    if (counters.length > level + 1) counters.length = level + 1;
    while (counters.length < level) counters.push(1);
    counters[level] = (counters[level] ?? 0) + 1;
    return counters.slice(0, level + 1).join('.');
  });
}

/**
 * For each row index, whether it has at least one child (a following row that is
 * deeper, before any row at the same-or-shallower level).
 */
export function hasChildrenFlags(levels: number[]): boolean[] {
  return levels.map((lvl, i) => {
    const next = levels[i + 1];
    return next !== undefined && next > lvl;
  });
}

/**
 * Given collapsed row indices, return which rows are hidden (descendants of a
 * collapsed ancestor). A row is a descendant until the next row at the
 * collapsed row's level or shallower.
 */
export function hiddenByCollapse(levels: number[], collapsed: Set<number>): Set<number> {
  const hidden = new Set<number>();
  for (const start of collapsed) {
    const baseLevel = levels[start];
    if (baseLevel === undefined) continue;
    for (let i = start + 1; i < levels.length; i++) {
      if ((levels[i] ?? 0) <= baseLevel) break;
      hidden.add(i);
    }
  }
  return hidden;
}
