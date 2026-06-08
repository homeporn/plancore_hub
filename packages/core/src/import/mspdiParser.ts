import type { LinkType, RowType, ScheduleRow } from '../schedule/types.js';
import { createBlankRow } from './importToSchedule.js';
import { mkLink } from '../schedule/links.js';

/**
 * MS Project XML (MSPDI) importer — pure TS, no DOM/deps. Parses the `<Task>`
 * list of a Project XML export ("Save As → XML" in MS Project) into canonical
 * `ScheduleRow[]`, preserving WBS hierarchy (OutlineNumber), dependencies and
 * milestones.
 */

// MSPDI predecessor link Type codes.
const TYPE_MAP: Record<string, LinkType> = { '0': 'FF', '1': 'FS', '2': 'SF', '3': 'SS' };

// Assumed hours per working day (MS Project standard calendar).
const HOURS_PER_DAY = 8;

function decode(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** First direct child tag value within a block (exact tag name). */
function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1].trim()) : null;
}

function numTag(block: string, name: string): number | null {
  const v = tag(block, name);
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** ISO8601 duration (e.g. "PT40H0M0S", "P2DT4H") → working days. */
export function parseMspdiDuration(d: string | null): number | null {
  if (!d) return null;
  const m = d.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!m) return null;
  const days = Number(m[1] ?? 0);
  const hours = Number(m[2] ?? 0);
  const mins = Number(m[3] ?? 0);
  const totalHours = days * HOURS_PER_DAY + hours + mins / 60;
  return Math.round((totalHours / HOURS_PER_DAY) * 100) / 100;
}

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

interface RawLink {
  ownerUid: string;
  predUid: string;
  type: LinkType;
  lag: number;
}

/** Parse an MSPDI/Project XML string into ScheduleRow[]. */
export function parseMsProjectXml(xml: string): ScheduleRow[] {
  const taskBlocks = [...xml.matchAll(/<Task>([\s\S]*?)<\/Task>/g)].map((m) => m[1]);
  const uidToId = new Map<string, string>();
  const rawLinks: RawLink[] = [];
  const rows: ScheduleRow[] = [];

  for (const block of taskBlocks) {
    const uid = tag(block, 'UID');
    if (uid === null) continue;
    // Skip the project summary row (OutlineLevel 0).
    if (numTag(block, 'OutlineLevel') === 0) continue;

    const isMilestone = tag(block, 'Milestone') === '1';
    const isSummary = tag(block, 'Summary') === '1';
    const durDays = parseMspdiDuration(tag(block, 'Duration'));

    const rowType: RowType = isMilestone
      ? 'веха'
      : isSummary
        ? 'заголовок'
        : 'задача/разработка';

    const row = createBlankRow({
      sdr: tag(block, 'OutlineNumber') ?? '',
      name: tag(block, 'Name') ?? '',
      row_type: rowType,
      duration: isMilestone ? 0 : (durDays ?? 1),
      startDate: parseDate(tag(block, 'Start')),
      endDate: parseDate(tag(block, 'Finish')),
      percentComplete: numTag(block, 'PercentComplete') ?? 0,
    });
    uidToId.set(uid, row.row_id);
    rows.push(row);

    const linkBlocks = [...block.matchAll(/<PredecessorLink>([\s\S]*?)<\/PredecessorLink>/g)].map(
      (m) => m[1],
    );
    for (const lb of linkBlocks) {
      const predUid = tag(lb, 'PredecessorUID');
      if (predUid === null) continue;
      const type = TYPE_MAP[tag(lb, 'Type') ?? '1'] ?? 'FS';
      // MSPDI LinkLag is an integer in tenths of a minute.
      const lagRaw = numTag(lb, 'LinkLag') ?? 0;
      const lag = Math.round(lagRaw / 10 / 60 / HOURS_PER_DAY);
      rawLinks.push({ ownerUid: uid, predUid, type, lag });
    }
  }

  for (const l of rawLinks) {
    const ownerId = uidToId.get(l.ownerUid);
    const predId = uidToId.get(l.predUid);
    if (!ownerId || !predId || ownerId === predId) continue;
    const row = rows.find((r) => r.row_id === ownerId);
    if (row) row.predecessors.push(mkLink(predId, l.type, l.lag));
  }

  return rows;
}
