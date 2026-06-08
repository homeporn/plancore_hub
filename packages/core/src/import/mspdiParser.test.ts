import { describe, it, expect } from 'vitest';
import { parseMsProjectXml, parseMspdiDuration } from './mspdiParser.js';

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Tasks>
    <Task>
      <UID>0</UID><Name>Проект</Name><OutlineLevel>0</OutlineLevel><Summary>1</Summary>
    </Task>
    <Task>
      <UID>1</UID><Name>Раздел A</Name><OutlineLevel>1</OutlineLevel>
      <OutlineNumber>1</OutlineNumber><Summary>1</Summary>
      <Duration>PT16H0M0S</Duration><Start>2024-01-15T08:00:00</Start><Finish>2024-01-16T17:00:00</Finish>
    </Task>
    <Task>
      <UID>2</UID><Name>Задача A.1</Name><OutlineLevel>2</OutlineLevel>
      <OutlineNumber>1.1</OutlineNumber><Milestone>0</Milestone>
      <Duration>PT24H0M0S</Duration><PercentComplete>50</PercentComplete>
      <Start>2024-01-15T08:00:00</Start><Finish>2024-01-17T17:00:00</Finish>
    </Task>
    <Task>
      <UID>3</UID><Name>Веха</Name><OutlineLevel>2</OutlineLevel>
      <OutlineNumber>1.2</OutlineNumber><Milestone>1</Milestone><Duration>PT0H0M0S</Duration>
      <PredecessorLink><PredecessorUID>2</PredecessorUID><Type>1</Type><LinkLag>4800</LinkLag></PredecessorLink>
    </Task>
  </Tasks>
</Project>`;

describe('parseMspdiDuration', () => {
  it('converts ISO durations to working days (8h/day)', () => {
    expect(parseMspdiDuration('PT8H0M0S')).toBe(1);
    expect(parseMspdiDuration('PT24H0M0S')).toBe(3);
    expect(parseMspdiDuration('P2DT0H0M0S')).toBe(2);
    expect(parseMspdiDuration(null)).toBe(null);
  });
});

describe('parseMsProjectXml', () => {
  const rows = parseMsProjectXml(XML);

  it('skips the project summary (OutlineLevel 0) and imports the rest', () => {
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.sdr)).toEqual(['1', '1.1', '1.2']);
  });

  it('maps summary / task / milestone row types', () => {
    expect(rows[0].row_type).toBe('заголовок');
    expect(rows[1].row_type).toBe('задача/разработка');
    expect(rows[2].row_type).toBe('веха');
    expect(rows[2].duration).toBe(0);
  });

  it('parses fields and dates', () => {
    expect(rows[1].name).toBe('Задача A.1');
    expect(rows[1].percentComplete).toBe(50);
    expect(rows[1].startDate?.getFullYear()).toBe(2024);
  });

  it('resolves predecessor links with type and lag (1 day = LinkLag 4800)', () => {
    const ms = rows[2];
    expect(ms.predecessors).toHaveLength(1);
    expect(ms.predecessors[0].rowId).toBe(rows[1].row_id);
    expect(ms.predecessors[0].type).toBe('FS');
    expect(ms.predecessors[0].lag).toBe(1);
  });
});
