import { describe, it, expect } from 'vitest';
import {
  wbsTemplateToNode,
  dependencyRowToRule,
  durationRowToModel,
} from './scaffold.js';
import type { Database } from '../supabase/client.js';

type WbsRow = Database['public']['Tables']['wbs_templates']['Row'];
type DepRow = Database['public']['Tables']['dependency_matrix']['Row'];
type DurRow = Database['public']['Tables']['duration_models']['Row'];

describe('wbsTemplateToNode', () => {
  it('maps snake_case DB columns to scaffold node', () => {
    const row: WbsRow = {
      created_at: '2026-01-01',
      id: 'x',
      is_driver: true,
      object_type: 'станция',
      parent_code: '1',
      section_code: 'A',
      sort_order: 3,
      task_code: '1.1',
      task_name: 'Раздел А',
      task_name_en: 'Section A',
      wbs_level: 1,
    };
    expect(wbsTemplateToNode(row)).toEqual({
      taskCode: '1.1',
      parentCode: '1',
      taskName: 'Раздел А',
      sectionCode: 'A',
      wbsLevel: 1,
      isDriver: true,
      sortOrder: 3,
      objectType: 'станция',
    });
  });
});

describe('dependencyRowToRule', () => {
  it('normalizes unknown link types to FS', () => {
    const row: DepRow = {
      created_at: '2026-01-01',
      description: '',
      description_en: '',
      from_section: 'A',
      id: 'd',
      lag_days: 2,
      link_type: 'weird',
      object_type: 'станция',
      to_section: 'B',
    };
    expect(dependencyRowToRule(row)).toMatchObject({ linkType: 'FS', lagDays: 2 });
  });

  it('keeps valid link types', () => {
    const row: DepRow = {
      created_at: '2026-01-01', description: '', description_en: '',
      from_section: 'A', id: 'd', lag_days: 0, link_type: 'SS',
      object_type: 'станция', to_section: 'B',
    };
    expect(dependencyRowToRule(row).linkType).toBe('SS');
  });
});

describe('durationRowToModel', () => {
  it('maps duration model columns', () => {
    const row: DurRow = {
      base_duration_days: 10, created_at: '2026-01-01', description: '',
      description_en: '', driver_section: 'A', formula: 'x*2', id: 'm',
      object_type: 'станция', section_code: 'A',
    };
    expect(durationRowToModel(row)).toEqual({
      sectionCode: 'A', driverSection: 'A', baseDurationDays: 10,
      formula: 'x*2', objectType: 'станция',
    });
  });
});
