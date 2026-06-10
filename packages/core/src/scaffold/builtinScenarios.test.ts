import { describe, it, expect } from 'vitest';
import { BUILTIN_SCENARIOS, listBuiltinScenarios, getBuiltinScenario } from './builtinScenarios.js';
import { buildScheduleFromTemplate } from './scaffold.js';

describe('builtin scenarios', () => {
  it('lists scenarios without the heavy payload', () => {
    const list = listBuiltinScenarios();
    expect(list.length).toBe(BUILTIN_SCENARIOS.length);
    expect(list.every((s) => s.id && s.label && s.objectType)).toBe(true);
  });

  it('each scenario builds a non-empty schedule with links', () => {
    for (const s of BUILTIN_SCENARIOS) {
      const rows = buildScheduleFromTemplate(s.input, { objectType: s.objectType });
      expect(rows.length).toBeGreaterThan(0);
      // At least one dependency wired across the scenario.
      const links = rows.reduce((sum, r) => sum + r.predecessors.length, 0);
      expect(links).toBeGreaterThan(0);
      // Leaf tasks carry a positive duration.
      const leaves = rows.filter((r) => r.row_type === 'задача/разработка');
      expect(leaves.length).toBeGreaterThan(0);
      expect(leaves.every((r) => (r.duration ?? 0) > 0)).toBe(true);
    }
  });

  it('getBuiltinScenario resolves by id', () => {
    expect(getBuiltinScenario('design')?.objectType).toBe('Проектирование');
    expect(getBuiltinScenario('nope')).toBeUndefined();
  });
});
