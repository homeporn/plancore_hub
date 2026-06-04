/**
 * ApprovalStore — read/write facade for schedule version approval (Wave F).
 *
 * Reads (current version, role, history, baseline variance) go through a cached
 * gateway; the transition write goes through the `approval` orchestrator Edge
 * Function, which validates the action, freezes a baseline on approval and
 * records the audit row. On success the local cache is invalidated.
 */

import {
  computeVariance,
  type ApprovalAction,
  type ApprovalRole,
  type ApprovalStatus,
  type ScheduleRow,
  type VarianceResult,
} from '@plancore/core';
import type { PlancoreClient } from '@plancore/data';
import {
  getCurrentScheduleVersion,
  resolveApprovalRole,
  listApprovalHistory,
  loadBaselineTasks,
  type ApprovalHistoryEntry,
  type ScheduleVersionInfo,
} from '@plancore/data';
import { AsyncCache } from './cache.js';

export class ApprovalStore {
  private readonly cache = new AsyncCache();

  constructor(private readonly client: PlancoreClient) {}

  getCurrentVersion(projectId: string): Promise<ScheduleVersionInfo | null> {
    return this.cache.get(`version:${projectId}`, () =>
      getCurrentScheduleVersion(this.client, projectId),
    );
  }

  resolveRole(
    projectId: string,
    userId: string,
    versionCreatedBy: string | null,
  ): Promise<ApprovalRole> {
    return this.cache.get(`role:${projectId}:${userId}`, () =>
      resolveApprovalRole(this.client, projectId, userId, versionCreatedBy),
    );
  }

  getHistory(scheduleVersionId: string): Promise<ApprovalHistoryEntry[]> {
    return this.cache.get(`history:${scheduleVersionId}`, () =>
      listApprovalHistory(this.client, scheduleVersionId),
    );
  }

  /** Variance of the given current rows against a frozen baseline. */
  async getVariance(baselineId: string, currentRows: ScheduleRow[]): Promise<VarianceResult[]> {
    const baseline = await this.cache.get(`baseline:${baselineId}`, () =>
      loadBaselineTasks(this.client, baselineId),
    );
    return computeVariance(currentRows, baseline);
  }

  /**
   * Run an approval action via the orchestrator Edge Function. Returns the new
   * status and (on approval) the frozen baseline id; invalidates caches so the
   * next read reflects the new state.
   */
  async runAction(
    scheduleVersionId: string,
    action: ApprovalAction,
    comment = '',
  ): Promise<{ status: ApprovalStatus; baselineId: string | null }> {
    const { data, error } = await this.client.functions.invoke('approval', {
      body: { scheduleVersionId, action, comment },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error as string);
    this.invalidate();
    return { status: data.status as ApprovalStatus, baselineId: data.baselineId ?? null };
  }

  invalidate(): void {
    this.cache.invalidatePrefix('version:');
    this.cache.invalidatePrefix('history:');
    this.cache.invalidatePrefix('baseline:');
  }
}
