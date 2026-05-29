import type { TaskRow } from '../import/dto.js';
import type {
  AuditContext,
  AuditFinding,
  AuditResult,
  SeverityLevel,
} from './types.js';

let findingCounter = 0;

function createFinding(
  level: SeverityLevel,
  field: string,
  rule: string,
  description: string,
  task: TaskRow,
  recommendation: string
): AuditFinding {
  findingCounter++;
  return {
    id: `f-${findingCounter}`,
    level,
    field,
    rule,
    description,
    taskSdr: task.sdr || `строка ${task.rowIndex}`,
    taskName: task.name || '(без названия)',
    recommendation,
    rowIndex: task.rowIndex,
  };
}

// Helper: check if a task is a "header" type (suppress most checks)
function isHeader(task: TaskRow): boolean {
  return task.fieldType === 'заголовок';
}

// Helper: check if this is the project start milestone (row 1-2 area, or named)
function isProjectStartMilestone(task: TaskRow): boolean {
  if (task.fieldType === 'веха' && /старт проекта|начало проекта/i.test(task.name)) return true;
  return false;
}

// ─── 1. СДР Checks ───
function checkSDR(tasks: TaskRow[]): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const task of tasks) {
    if (!task.sdr) {
      findings.push(createFinding(
        'critical', 'СДР', 'Наличие СДР',
        'У задачи отсутствует код СДР',
        task,
        'Присвоить уникальный иерархический код СДР'
      ));
    }
  }

  const sdrMap = new Map<string, TaskRow[]>();
  for (const task of tasks) {
    if (task.sdr) {
      const existing = sdrMap.get(task.sdr) || [];
      existing.push(task);
      sdrMap.set(task.sdr, existing);
    }
  }

  for (const [sdr, duplicates] of sdrMap) {
    if (duplicates.length > 1) {
      for (const task of duplicates) {
        findings.push(createFinding(
          'critical', 'СДР', 'Уникальность СДР',
          `СДР «${sdr}» встречается ${duplicates.length} раз(а) в графике`,
          task,
          'Обеспечить уникальность СДР для каждой задачи'
        ));
      }
    }
  }

  for (const task of tasks) {
    if (task.sdr && !task.sdr.includes('.') && !task.sdr.includes('-') && !task.sdr.includes('/')) {
      findings.push(createFinding(
        'warning', 'СДР', 'Иерархия СДР',
        `СДР «${task.sdr}» не содержит иерархической структуры (нет разделителей)`,
        task,
        'СДР должен читаться иерархически: объект → подсистема → раздел → операция'
      ));
    }
  }

  const sdrSet = new Set(tasks.filter(t => t.sdr).map(t => t.sdr));
  for (const task of tasks) {
    if (task.sdr && task.sdr.includes('.')) {
      const parts = task.sdr.split('.');
      if (parts.length > 2) {
        const parentSdr = parts.slice(0, -1).join('.');
        if (!sdrSet.has(parentSdr)) {
          findings.push(createFinding(
            'warning', 'СДР', 'Висячий уровень',
            `Отсутствует родительский уровень «${parentSdr}» для задачи с СДР «${task.sdr}»`,
            task,
            'Убедитесь, что все промежуточные уровни иерархии СДР присутствуют в графике'
          ));
        }
      }
    }
  }

  const branchStations = new Map<string, Set<string>>();
  for (const task of tasks) {
    if (task.sdr && task.station && task.sdr.includes('.')) {
      const branch = task.sdr.split('.')[0];
      const stations = branchStations.get(branch) || new Set();
      stations.add(task.station.toLowerCase());
      branchStations.set(branch, stations);
    }
  }

  for (const [branch, stations] of branchStations) {
    const stationArr = Array.from(stations);
    const hasStation = stationArr.some(s => s.includes('станц'));
    const hasPeregon = stationArr.some(s => s.includes('перегон'));
    if (hasStation && hasPeregon) {
      const branchTask = tasks.find(t => t.sdr?.startsWith(branch + '.'));
      if (branchTask) {
        findings.push(createFinding(
          'critical', 'СДР', 'Смешение типов объектов',
          `Ветка СДР «${branch}» содержит и станции и перегоны — нарушение архитектуры графика`,
          branchTask,
          'Станции и перегоны не должны смешиваться в одной ветке СДР'
        ));
      }
    }
  }

  return findings;
}

// ─── 2. Название задачи Checks ───
function checkTaskName(tasks: TaskRow[]): AuditFinding[] {
  const findings: AuditFinding[] = [];

  const FORBIDDEN_NAMES = ['проектирование', 'разработка раздела', 'корректировка'];
  const SECTION_CODES = ['АР', 'КР', 'ПТС', 'ПТЭГ', 'ОВ', 'ВК', 'ЭОМ', 'ЭС', 'СС', 'АК', 'ПОС', 'СО', 'ПБ', 'ИОС', 'ООС', 'ГП'];

  for (const task of tasks) {
    if (!task.name) {
      findings.push(createFinding(
        'critical', 'Название', 'Наличие названия',
        'Задача не имеет названия',
        task,
        'Название должно отвечать на вопрос: что делаем и по какому объекту'
      ));
      continue;
    }

    if (isHeader(task)) continue; // Skip name quality checks for headers

    const nameLower = task.name.toLowerCase().trim();
    for (const forbidden of FORBIDDEN_NAMES) {
      if (nameLower === forbidden || nameLower === forbidden + '.') {
        findings.push(createFinding(
          'warning', 'Название', 'Запрещённые формулировки',
          `Название «${task.name}» — запрещённая абстрактная формулировка`,
          task,
          'Используйте конкретное название: «АР станции №2 — разработка стадии П»'
        ));
      }
    }

    const hasSection = SECTION_CODES.some(code => task.name.toUpperCase().includes(code));
    if (!hasSection) {
      findings.push(createFinding(
        'info', 'Название', 'Указание раздела',
        `В названии «${task.name}» не обнаружен код раздела (АР, КР, ПТС и т.д.)`,
        task,
        'Укажите раздел проектной документации в названии задачи'
      ));
    }

    const hasObject = /станци|перегон|объект/i.test(task.name);
    if (!hasObject && task.station) {
      findings.push(createFinding(
        'info', 'Название', 'Указание объекта',
        `В названии не упоминается объект, хотя задача привязана к «${task.station}»`,
        task,
        'Укажите объект (станцию/перегон) в названии задачи'
      ));
    }
  }

  const nameMap = new Map<string, TaskRow[]>();
  for (const task of tasks) {
    if (task.name && !isHeader(task)) {
      const key = task.name.toLowerCase().trim();
      const existing = nameMap.get(key) || [];
      existing.push(task);
      nameMap.set(key, existing);
    }
  }

  for (const [, duplicates] of nameMap) {
    if (duplicates.length > 1) {
      for (const task of duplicates) {
        findings.push(createFinding(
          'warning', 'Название', 'Уникальность названия',
          `Название «${task.name}» дублируется ${duplicates.length} раз(а)`,
          task,
          'Каждая задача должна иметь уникальное, информативное название'
        ));
      }
    }
  }

  return findings;
}

// ─── 3. Предшественник Checks ───
function checkPredecessor(tasks: TaskRow[]): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const task of tasks) {
    // Skip headers entirely
    if (isHeader(task)) continue;

    // Skip project start milestone
    if (isProjectStartMilestone(task)) continue;

    const isStart = /оии|начало|старт|start/i.test(task.name);

    if (!task.predecessor && !isStart) {
      // Milestones: predecessor missing is warning, not critical
      const level = task.fieldType === 'веха' ? 'warning' : 'critical';
      findings.push(createFinding(
        level, 'Предшественник', 'Наличие предшественника',
        'Задача не имеет предшественника и не является стартовой (ОИИ)',
        task,
        'Добавить логического предшественника или отметить как стартовую задачу'
      ));
    }

    if (task.predecessor && /^\d{2}\.\d{2}\.\d{4}$/.test(task.predecessor.trim())) {
      findings.push(createFinding(
        'warning', 'Предшественник', 'Привязка к дате',
        'Задача привязана к календарной дате вместо логического предшественника',
        task,
        'Заменить дату на логическую связь с предшествующей задачей'
      ));
    }

    if (task.predecessor && /SS/i.test(task.predecessor)) {
      findings.push(createFinding(
        'info', 'Предшественник', 'Тип связи SS',
        `Связь типа SS (старт-старт) обнаружена: «${task.predecessor}»`,
        task,
        'Убедитесь, что SS-связь осознанна (эскиз/итерация), по умолчанию используйте FS'
      ));
    }
  }

  return findings;
}

// ─── 4. Последователь Checks ───
function checkSuccessor(tasks: TaskRow[]): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const task of tasks) {
    if (isHeader(task)) continue;

    const isFinal = /со($|\s)|финал|конец|end|завершение|сдача/i.test(task.name);

    if (!task.successor && !isFinal) {
      // For milestones that are final — no error
      if (task.fieldType === 'веха' && !task.successor) {
        // Milestones CAN have no successor if final
        // Only warn if not obviously final
        if (!isFinal && task.name) {
          findings.push(createFinding(
            'info', 'Последователь', 'Наличие последователя',
            'Веха не имеет последователя — убедитесь, что это финальная веха',
            task,
            'Если веха не финальная, добавить последователя'
          ));
        }
      } else {
        findings.push(createFinding(
          'critical', 'Последователь', 'Наличие последователя',
          'Задача не имеет последователя и не является финальной (СО)',
          task,
          'Каждая задача должна передавать результат — добавить последователя или удалить задачу'
        ));
      }
    }
  }

  return findings;
}

// ─── 5. Организация Checks ───
function checkOrganization(tasks: TaskRow[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const ABSTRACT_ORGS = ['проектный институт', 'подрядчик', 'исполнитель', 'организация'];

  for (const task of tasks) {
    if (isHeader(task)) continue;

    if (!task.organization) {
      findings.push(createFinding(
        'warning', 'Организация', 'Наличие организации',
        'У задачи не указана организация-исполнитель',
        task,
        'Указать конкретную организацию-исполнителя'
      ));
      continue;
    }

    const orgLower = task.organization.toLowerCase().trim();
    if (ABSTRACT_ORGS.includes(orgLower)) {
      findings.push(createFinding(
        'warning', 'Организация', 'Абстрактная организация',
        `Указана абстрактная организация «${task.organization}»`,
        task,
        'Заменить на конкретную организацию, которая реально выполняет данный тип работ'
      ));
    }
  }

  return findings;
}

// ─── 6. Отдел Checks ───
function checkDepartment(tasks: TaskRow[]): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const task of tasks) {
    if (isHeader(task)) continue;

    if (!task.department) {
      findings.push(createFinding(
        'warning', 'Отдел', 'Наличие отдела',
        'У задачи не указан отдел-исполнитель',
        task,
        'Указать отдел, который получает вход и возвращает результат'
      ));
    }
  }

  const SECTION_DEPT_MAP: Record<string, string[]> = {
    'АР': ['архитектур'],
    'КР': ['конструктив', 'конструкторск'],
    'ЭОМ': ['электр'],
    'ОВ': ['вентиляц', 'отоплен', 'овик'],
    'ВК': ['водоснаб', 'канализац', 'вк'],
  };

  for (const task of tasks) {
    if (isHeader(task)) continue;
    if (task.name && task.department) {
      const nameUpper = task.name.toUpperCase();
      const deptLower = task.department.toLowerCase();

      for (const [section, keywords] of Object.entries(SECTION_DEPT_MAP)) {
        if (nameUpper.includes(section)) {
          const matches = keywords.some(kw => deptLower.includes(kw));
          if (!matches && deptLower.length > 0) {
            findings.push(createFinding(
              'info', 'Отдел', 'Соответствие разделу',
              `Задача по разделу ${section}, но отдел «${task.department}» может не соответствовать`,
              task,
              'Проверить, что отдел соответствует разделу проектной документации'
            ));
          }
        }
      }
    }
  }

  return findings;
}

// ─── 7. Станция/Объект Checks ───
function checkStation(tasks: TaskRow[]): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const task of tasks) {
    if (isHeader(task)) continue;

    if (!task.station) {
      findings.push(createFinding(
        'critical', 'Станция / объект', 'Привязка к объекту',
        'Задача не привязана ни к одному объекту (станция/перегон)',
        task,
        'Каждая задача должна быть привязана ровно к одному объекту'
      ));
      continue;
    }

    const multiPattern = /\d+[-–—]\d+|станц.*\d+.*\d+|несколько|все\s/i;
    if (multiPattern.test(task.station)) {
      findings.push(createFinding(
        'critical', 'Станция / объект', 'Один объект на задачу',
        `Задача привязана к нескольким объектам: «${task.station}»`,
        task,
        'Задача должна быть привязана ровно к одному объекту — разделить на отдельные задачи'
      ));
    }

    if (/вся линия|все станции|линия в целом/i.test(task.station)) {
      findings.push(createFinding(
        'critical', 'Станция / объект', 'Объектная привязка',
        `Задача привязана к «${task.station}» — это неуправляемо в КСП`,
        task,
        'Архитектура, КР, инженерия — всегда объектные. Разделите на отдельные задачи по объектам'
      ));
    }
  }

  return findings;
}

// ─── 8. Type-specific rules ───
function checkFieldTypeRules(tasks: TaskRow[]): AuditFinding[] {
  const findings: AuditFinding[] = [];

  // Build SDR→task lookup for predecessor type checking
  const sdrToTask = new Map<string, TaskRow>();
  for (const t of tasks) {
    if (t.sdr) sdrToTask.set(t.sdr, t);
  }

  for (const task of tasks) {
    if (!task.fieldType) continue; // no type assigned — skip type-specific checks

    switch (task.fieldType) {
      case 'заголовок': {
        // Headers must NOT have predecessors or successors
        if (task.predecessor) {
          findings.push(createFinding(
            'critical', 'Тип поля', 'Заголовок: запрет связей',
            `Заголовок «${task.name}» имеет предшественника — заголовки не должны иметь связей`,
            task,
            'Удалить предшественника у строки-заголовка'
          ));
        }
        if (task.successor) {
          findings.push(createFinding(
            'critical', 'Тип поля', 'Заголовок: запрет связей',
            `Заголовок «${task.name}» имеет последователя — заголовки не должны иметь связей`,
            task,
            'Удалить последователя у строки-заголовка'
          ));
        }
        break;
      }

      case 'задание': {
        if (!task.predecessor) {
          findings.push(createFinding(
            'critical', 'Тип поля', 'Задание: нет предшественника',
            `Задание «${task.name}» не имеет предшественника (кто выдал задание?)`,
            task,
            'Указать предшественника — веху или задачу, от которой исходит задание'
          ));
        }
        if (!task.successor) {
          findings.push(createFinding(
            'critical', 'Тип поля', 'Задание: нет последователя',
            `Задание «${task.name}» не имеет последователя (кто выполняет?)`,
            task,
            'Указать последователя — задачу/разработку, которая выполняет задание'
          ));
        }
        if (!task.organization) {
          findings.push(createFinding(
            'warning', 'Тип поля', 'Задание: нет организации',
            `Задание «${task.name}» не имеет организации-формирователя`,
            task,
            'Указать организацию, которая формирует задание'
          ));
        }
        break;
      }

      case 'задача/разработка': {
        if (!task.predecessor) {
          findings.push(createFinding(
            'critical', 'Тип поля', 'Разработка: нет предшественника',
            `Задача/разработка «${task.name}» не имеет предшественника (задания или исходных данных)`,
            task,
            'Указать предшественник — задание или исходные данные'
          ));
        }
        if (!task.successor) {
          findings.push(createFinding(
            'critical', 'Тип поля', 'Разработка: нет последователя',
            `Задача/разработка «${task.name}» не имеет последователя (вехи или согласования)`,
            task,
            'Указать последователь — веху финиша или согласование'
          ));
        }
        if (!task.organization) {
          findings.push(createFinding(
            'warning', 'Тип поля', 'Разработка: нет организации',
            `Задача/разработка «${task.name}» не имеет организации`,
            task,
            'Указать организацию-исполнителя разработки'
          ));
        }
        if (!task.station) {
          findings.push(createFinding(
            'critical', 'Тип поля', 'Разработка: нет объекта',
            `Задача/разработка «${task.name}» не привязана к объекту`,
            task,
            'Привязать задачу к конкретной станции/перегону'
          ));
        }
        break;
      }

      case 'веха': {
        // Duration must be 0
        if (task.duration != null && task.duration > 0) {
          findings.push(createFinding(
            'warning', 'Тип поля', 'Веха: длительность > 0',
            `Веха «${task.name}» имеет длительность ${task.duration} дн. — вехи должны быть нулевой длительности`,
            task,
            'Установить длительность вехи = 0'
          ));
        }
        // Also check by dates
        if (task.startDate && task.endDate && task.duration == null) {
          const days = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / 86400000);
          if (days > 0) {
            findings.push(createFinding(
              'warning', 'Тип поля', 'Веха: длительность > 0',
              `Веха «${task.name}» имеет длительность ${days} дн. по датам — вехи должны быть нулевой длительности`,
              task,
              'Установить одинаковые даты начала и окончания для вехи'
            ));
          }
        }
        // Must have predecessors (except project start) — warning, not critical
        if (!task.predecessor && !isProjectStartMilestone(task)) {
          findings.push(createFinding(
            'warning', 'Тип поля', 'Веха: нет предшественника',
            `Веха «${task.name}» не имеет предшественника`,
            task,
            'Указать предшественник — задачу/разработку, которая завершена'
          ));
        }
        break;
      }

      case 'согласование': {
        if (!task.predecessor) {
          findings.push(createFinding(
            'critical', 'Тип поля', 'Согласование: нет предшественника',
            `Согласование «${task.name}» не имеет предшественника (вехи финиша разработки)`,
            task,
            'Указать предшественник — веху финиша разработки'
          ));
        }
        if (!task.successor) {
          findings.push(createFinding(
            'warning', 'Тип поля', 'Согласование: нет последователя',
            `Согласование «${task.name}» не имеет последователя`,
            task,
            'Указать последователь — веху «утверждено» или задание следующему разделу'
          ));
        }
        if (!task.organization) {
          findings.push(createFinding(
            'warning', 'Тип поля', 'Согласование: нет организации',
            `Согласование «${task.name}» не имеет организации`,
            task,
            'Указать организацию-согласователя'
          ));
        }
        break;
      }
    }
  }

  return findings;
}

function checkExecutionState(tasks: TaskRow[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const bySdr = new Map(tasks.filter((task) => task.sdr).map((task) => [task.sdr, task]));

  for (const task of tasks) {
    if (isHeader(task)) continue;

    if (
      task.completionPercent != null &&
      task.physicalPercentComplete != null &&
      task.completionPercent >= 80 &&
      task.physicalPercentComplete <= 20
    ) {
      findings.push(createFinding(
        'warning',
        'Прогресс',
        'Несоответствие физического прогресса',
        `У задачи «${task.name}» временной прогресс ${task.completionPercent}%, а физический ${task.physicalPercentComplete}%`,
        task,
        'Проверить объемы, факт выполнения и обоснование процента завершения'
      ));
    }

    if (
      task.taskStatus === 'IN_PROGRESS' &&
      !task.resourceName &&
      !(task.currentTotalProductivity != null && task.currentTotalProductivity > 0)
    ) {
      findings.push(createFinding(
        'warning',
        'Ресурсы',
        'Активная задача без ресурса',
        `Задача «${task.name}» находится в работе, но не имеет ресурса или производительности`,
        task,
        'Указать назначенный ресурс или зафиксировать текущую производительность'
      ));
    }

    if (
      task.taskStatus === 'COMPLETED' &&
      task.successor
    ) {
      const successorSdrs = task.successor.split(/[;,]/).map((value) => value.trim()).filter(Boolean);
      const stalled = successorSdrs
        .map((sdr) => bySdr.get(sdr))
        .filter((row): row is TaskRow => !!row)
        .some((successor) => successor.taskStatus === 'NOT_STARTED' && !successor.actualStart);

      if (stalled) {
        findings.push(createFinding(
          'warning',
          'Логика исполнения',
          'Завершение без старта последователя',
          `Завершенная задача «${task.name}» имеет не стартовавшего последователя`,
          task,
          'Проверить реальную цепочку исполнения и отсутствие блокировки downstream задач'
        ));
      }
    }

    if (
      task.taskStatus === 'IN_PROGRESS' &&
      task.duration != null &&
      task.remainingDuration != null &&
      task.completionPercent != null &&
      task.completionPercent > 50 &&
      task.remainingDuration >= task.duration * 0.75
    ) {
      findings.push(createFinding(
        'warning',
        'Remaining Duration',
        'Рост remaining duration',
        `У задачи «${task.name}» remaining duration остается непропорционально высоким`,
        task,
        'Проверить фактический прогресс, объемы, производительность и корректность оставшейся длительности'
      ));
    }
  }

  return findings;
}

function checkCriticalPathInstability(tasks: TaskRow[], context?: AuditContext): AuditFinding[] {
  if (!context?.comparisonSnapshot || !context.currentCriticalPathSdrs?.length) {
    return [];
  }

  const current = Array.from(new Set(context.currentCriticalPathSdrs.filter(Boolean)));
  const previous = Array.from(new Set(context.comparisonSnapshot.criticalPathSdrs.filter(Boolean)));

  if (current.length === 0 || previous.length === 0) {
    return [];
  }

  const overlapCount = current.filter((sdr) => previous.includes(sdr)).length;
  const maxLength = Math.max(current.length, previous.length);
  const changeCount = current.length + previous.length - overlapCount * 2;
  const changeRatio = maxLength === 0 ? 0 : changeCount / maxLength;
  const lengthDelta = Math.abs(current.length - previous.length);

  if (changeCount < 2 && changeRatio < 0.5 && lengthDelta < 2) {
    return [];
  }

  const anchorTask = tasks.find((task) => current.includes(task.sdr))
    ?? tasks.find((task) => previous.includes(task.sdr))
    ?? tasks[0];
  if (!anchorTask) {
    return [];
  }

  return [
    createFinding(
      'warning',
      'Critical Path',
      'Скачкообразное изменение critical path',
      `Критический путь заметно изменился относительно снимка «${context.comparisonSnapshot.label}»: общих задач ${overlapCount} из ${maxLength}`,
      anchorTask,
      'Проверить статусные данные, remaining duration, факты и влияние последних изменений на критическую ветку'
    ),
  ];
}

// ─── Main Audit ───
export function runAudit(tasks: TaskRow[], context?: AuditContext): AuditResult {
  findingCounter = 0;

  const hasFieldTypes = tasks.some(t => t.fieldType);

  const allFindings: AuditFinding[] = [
    ...checkSDR(tasks),
    ...checkTaskName(tasks),
    ...checkPredecessor(tasks),
    ...checkSuccessor(tasks),
    ...checkOrganization(tasks),
    ...checkDepartment(tasks),
    ...checkStation(tasks),
    ...(hasFieldTypes ? checkFieldTypeRules(tasks) : []),
    ...checkExecutionState(tasks),
    ...checkCriticalPathInstability(tasks, context),
  ];

  const criticalCount = allFindings.filter(f => f.level === 'critical').length;
  const warningCount = allFindings.filter(f => f.level === 'warning').length;
  const infoCount = allFindings.filter(f => f.level === 'info').length;

  const failedRows = new Set(
    allFindings
      .filter(f => f.level === 'critical' || f.level === 'warning')
      .map(f => f.rowIndex)
  );

  return {
    totalTasks: tasks.length,
    findings: allFindings,
    criticalCount,
    warningCount,
    infoCount,
    passedCount: tasks.length - failedRows.size,
    failedCount: failedRows.size,
  };
}
