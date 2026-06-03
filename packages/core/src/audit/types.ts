export type SeverityLevel = 'critical' | 'warning' | 'info';

export interface AuditComparisonSnapshot {
  label: string;
  criticalPathSdrs: string[];
}

export interface AuditContext {
  currentCriticalPathSdrs?: string[];
  comparisonSnapshot?: AuditComparisonSnapshot | null;
}

export interface AuditFinding {
  id: string;
  level: SeverityLevel;
  field: string;
  rule: string;
  description: string;
  taskSdr: string;
  taskName: string;
  recommendation: string;
  rowIndex: number;
}

export interface AuditResult {
  totalTasks: number;
  findings: AuditFinding[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passedCount: number;
  failedCount: number;
}

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  critical: 'Критическая',
  warning: 'Средняя',
  info: 'Информационная',
};

export const SEVERITY_ICONS: Record<SeverityLevel, string> = {
  critical: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};
