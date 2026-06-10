/**
 * Built-in schedule scenarios for the wizard.
 *
 * Ready-made WBS templates (with section durations and dependency rules) so the
 * wizard always offers something to start from, independent of the reference
 * tables in the database. Each scenario is a self-contained `ScaffoldInput`
 * consumed by `buildScheduleFromTemplate`.
 */

import type {
  ScaffoldInput,
  WbsTemplateNode,
  DependencyRule,
  DurationModel,
} from './types.js';
import type { LinkType } from '../schedule/types.js';

export interface BuiltinScenario {
  id: string;
  label: string;
  description: string;
  /** objectType used to filter the scenario's own rows; pass to ScaffoldParams. */
  objectType: string;
  input: ScaffoldInput;
}

// Compact builders to keep the scenario tables readable.
function n(
  objectType: string,
  taskCode: string,
  parentCode: string,
  taskName: string,
  sectionCode: string,
  sortOrder: number,
  isDriver = false,
): WbsTemplateNode {
  return {
    taskCode,
    parentCode,
    taskName,
    sectionCode,
    wbsLevel: taskCode.split('.').length - 1,
    isDriver,
    sortOrder,
    objectType,
  };
}

function dur(objectType: string, sectionCode: string, days: number): DurationModel {
  return { sectionCode, driverSection: sectionCode, baseDurationDays: days, formula: '', objectType };
}

function dep(
  objectType: string,
  fromSection: string,
  toSection: string,
  linkType: LinkType = 'FS',
  lagDays = 0,
): DependencyRule {
  return { fromSection, toSection, linkType, lagDays, objectType };
}

// ─────────────────────────────────────────────────────────────────────────
// Scenario 1 — Проектирование объекта
// ─────────────────────────────────────────────────────────────────────────
const DESIGN = 'Проектирование';
const designScenario: BuiltinScenario = {
  id: 'design',
  label: 'Проектирование объекта',
  description: 'ИРД → ПД → экспертиза → РД → согласование',
  objectType: DESIGN,
  input: {
    templates: [
      n(DESIGN, '1', '', 'Проектирование', 'ROOT', 1),
      n(DESIGN, '1.1', '1', 'Сбор исходных данных и ИРД', 'ИРД', 1, true),
      n(DESIGN, '1.2', '1', 'Проектная документация (ПД)', 'ПД', 2),
      n(DESIGN, '1.2.1', '1.2', 'Разработка ПД', 'ПД', 1, true),
      n(DESIGN, '1.2.2', '1.2', 'Экспертиза ПД', 'Экспертиза', 2, true),
      n(DESIGN, '1.3', '1', 'Рабочая документация (РД)', 'РД', 3),
      n(DESIGN, '1.3.1', '1.3', 'Разработка РД', 'РД', 1, true),
      n(DESIGN, '1.4', '1', 'Согласование и сдача', 'Согласование', 4, true),
    ],
    durationModels: [
      dur(DESIGN, 'ИРД', 10),
      dur(DESIGN, 'ПД', 30),
      dur(DESIGN, 'Экспертиза', 20),
      dur(DESIGN, 'РД', 40),
      dur(DESIGN, 'Согласование', 10),
    ],
    dependencies: [
      dep(DESIGN, 'ИРД', 'ПД'),
      dep(DESIGN, 'ПД', 'Экспертиза'),
      dep(DESIGN, 'Экспертиза', 'РД'),
      dep(DESIGN, 'РД', 'Согласование'),
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Scenario 2 — Строительство (СМР)
// ─────────────────────────────────────────────────────────────────────────
const SMR = 'СМР';
const constructionScenario: BuiltinScenario = {
  id: 'construction',
  label: 'Строительство (СМР)',
  description: 'Подготовка → фундаменты → каркас → сети → отделка → благоустройство',
  objectType: SMR,
  input: {
    templates: [
      n(SMR, '1', '', 'Строительно-монтажные работы', 'ROOT', 1),
      n(SMR, '1.1', '1', 'Подготовительные работы', 'ПОДГ', 1, true),
      n(SMR, '1.2', '1', 'Земляные работы и фундаменты', 'ФУНД', 2, true),
      n(SMR, '1.3', '1', 'Несущие конструкции (каркас)', 'КАРКАС', 3, true),
      n(SMR, '1.4', '1', 'Инженерные сети', 'СЕТИ', 4, true),
      n(SMR, '1.5', '1', 'Отделочные работы', 'ОТДЕЛКА', 5, true),
      n(SMR, '1.6', '1', 'Благоустройство', 'БЛАГ', 6, true),
    ],
    durationModels: [
      dur(SMR, 'ПОДГ', 5),
      dur(SMR, 'ФУНД', 15),
      dur(SMR, 'КАРКАС', 30),
      dur(SMR, 'СЕТИ', 25),
      dur(SMR, 'ОТДЕЛКА', 20),
      dur(SMR, 'БЛАГ', 10),
    ],
    dependencies: [
      dep(SMR, 'ПОДГ', 'ФУНД'),
      dep(SMR, 'ФУНД', 'КАРКАС'),
      dep(SMR, 'КАРКАС', 'СЕТИ', 'SS', 5),
      dep(SMR, 'КАРКАС', 'ОТДЕЛКА'),
      dep(SMR, 'ОТДЕЛКА', 'БЛАГ'),
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Scenario 3 — Полный цикл объекта
// ─────────────────────────────────────────────────────────────────────────
const FULL = 'Полный цикл';
const fullCycleScenario: BuiltinScenario = {
  id: 'full',
  label: 'Полный цикл объекта',
  description: 'Предпроект → проектирование → СМР → ПНР → ввод',
  objectType: FULL,
  input: {
    templates: [
      n(FULL, '1', '', 'Объект', 'ROOT', 1),
      n(FULL, '1.1', '1', 'Предпроектная подготовка', 'ПРЕДПРОЕКТ', 1, true),
      n(FULL, '1.2', '1', 'Проектирование', 'ПРОЕКТ', 2, true),
      n(FULL, '1.3', '1', 'Строительство (СМР)', 'СМР', 3, true),
      n(FULL, '1.4', '1', 'Пусконаладочные работы', 'ПНР', 4, true),
      n(FULL, '1.5', '1', 'Ввод в эксплуатацию', 'ВВОД', 5, true),
    ],
    durationModels: [
      dur(FULL, 'ПРЕДПРОЕКТ', 15),
      dur(FULL, 'ПРОЕКТ', 60),
      dur(FULL, 'СМР', 180),
      dur(FULL, 'ПНР', 30),
      dur(FULL, 'ВВОД', 15),
    ],
    dependencies: [
      dep(FULL, 'ПРЕДПРОЕКТ', 'ПРОЕКТ'),
      dep(FULL, 'ПРОЕКТ', 'СМР'),
      dep(FULL, 'СМР', 'ПНР'),
      dep(FULL, 'ПНР', 'ВВОД'),
    ],
  },
};

export const BUILTIN_SCENARIOS: BuiltinScenario[] = [
  designScenario,
  constructionScenario,
  fullCycleScenario,
];

/** Lightweight list for pickers (no template payload). */
export function listBuiltinScenarios(): Omit<BuiltinScenario, 'input'>[] {
  return BUILTIN_SCENARIOS.map(({ id, label, description, objectType }) => ({
    id,
    label,
    description,
    objectType,
  }));
}

export function getBuiltinScenario(id: string): BuiltinScenario | undefined {
  return BUILTIN_SCENARIOS.find((s) => s.id === id);
}
