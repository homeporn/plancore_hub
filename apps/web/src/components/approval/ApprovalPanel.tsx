'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  availableApprovalActions,
  type ApprovalAction,
  type ApprovalRole,
  type ScheduleRow,
} from '@plancore/core';
import { ApprovalStore } from '@plancore/store';
import type { ScheduleVersionInfo, ApprovalHistoryEntry } from '@plancore/data';
import { Alert, Button } from '@plancore/ui';
import { getBrowserClient } from '@/lib/supabase/browser';
import { useAuth } from '@/lib/useAuth';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';

const ACTION_LABELS: Record<ApprovalAction, string> = {
  submit: 'Отправить на согласование',
  approve: 'Утвердить',
  reject: 'Отклонить',
  recall: 'Отозвать',
  supersede: 'Новая версия',
};

interface Props {
  projectId: string;
  /** Current editor rows, used to compare against the frozen baseline. */
  rows?: ScheduleRow[];
}

/** Approval workflow panel for a project's current schedule version (Wave F). */
export function ApprovalPanel({ projectId, rows = [] }: Props) {
  const store = useMemo(() => new ApprovalStore(getBrowserClient()), []);
  const { user } = useAuth();

  const [version, setVersion] = useState<ScheduleVersionInfo | null>(null);
  const [role, setRole] = useState<ApprovalRole>('viewer');
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [varianceCount, setVarianceCount] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<ApprovalAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const v = await store.getCurrentVersion(projectId);
      setVersion(v);
      if (!v) return;
      const [r, h] = await Promise.all([
        user ? store.resolveRole(projectId, user.id, v.createdBy) : Promise.resolve<ApprovalRole>('viewer'),
        store.getHistory(v.id),
      ]);
      setRole(r);
      setHistory(h);
      if (v.baselineId && rows.length > 0) {
        const variance = await store.getVariance(v.baselineId, rows);
        const deviated = variance.filter(
          (x) => (x.start_variance ?? 0) !== 0 || (x.finish_variance ?? 0) !== 0 || (x.duration_variance ?? 0) !== 0,
        ).length;
        setVarianceCount(deviated);
      } else {
        setVarianceCount(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить состояние согласования');
    } finally {
      setLoading(false);
    }
  }, [store, projectId, user, rows]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(action: ApprovalAction) {
    if (!version) return;
    setBusy(action);
    setError(null);
    try {
      store.invalidate();
      await store.runAction(version.id, action, comment);
      setComment('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось выполнить действие');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-xs text-[var(--muted)]">Загрузка…</p>;
  if (!version) {
    return <p className="text-xs text-[var(--muted)]">Нет текущей версии графика для согласования.</p>;
  }

  const actions = availableApprovalActions({ status: version.approvalStatus }, role);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Версия {version.versionNumber}</span>
        {version.versionLabel && <span className="text-xs text-[var(--muted)]">{version.versionLabel}</span>}
        <ApprovalStatusBadge status={version.approvalStatus} />
      </div>

      {varianceCount !== null && (
        <Alert tone={varianceCount > 0 ? 'warning' : 'success'}>
          {varianceCount > 0
            ? `Отклонений от базового плана: ${varianceCount}`
            : 'Нет отклонений от базового плана.'}
        </Alert>
      )}

      {actions.length > 0 ? (
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Комментарий (необязательно)"
            rows={2}
            className="w-full rounded-md border border-[var(--border)] px-2 py-1 text-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            {actions.map((a) => (
              <Button
                key={a}
                size="sm"
                variant={a === 'approve' ? 'primary' : a === 'reject' ? 'danger' : 'outline'}
                disabled={busy !== null}
                onClick={() => void run(a)}
              >
                {busy === a ? '…' : ACTION_LABELS[a]}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          {role === 'viewer' ? 'У вас нет прав на согласование.' : 'Действия недоступны в текущем статусе.'}
        </p>
      )}

      {error && <Alert tone="critical">{error}</Alert>}

      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase text-[var(--muted)]">История</h4>
        {history.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">Решений пока нет.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">{ACTION_LABELS[h.action]}</span>
                <span className="text-[var(--muted)]">
                  {h.fromStatus} → {h.toStatus}
                </span>
                <span className="text-[var(--muted)]">· {h.actorRole}</span>
                <span className="text-[var(--muted)]">· {new Date(h.decidedAt).toLocaleString('ru')}</span>
                {h.comment && <span className="text-[var(--muted)]">— {h.comment}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
