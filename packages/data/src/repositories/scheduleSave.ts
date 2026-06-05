import type { ScheduleRow, SaveResult, SaveOutcome } from '@plancore/core';
import type { PlancoreClient, Database } from '../supabase/client.js';
import { scheduleRowToVersionTaskInsert } from '../mappers/scheduleVersionTask.js';

/**
 * Save the rows of a draft schedule version via the atomic `save_schedule_draft`
 * RPC. The server checks membership, editability and the expected revision, then
 * replaces the version's tasks. Returns the conflict-aware outcome from the core
 * guard ('saved' | 'stale' | 'locked') plus the authoritative revision.
 */
export async function saveScheduleDraft(
  client: PlancoreClient,
  versionId: string,
  expectedRevision: number,
  rows: ScheduleRow[],
): Promise<SaveResult> {
  const tasks = rows.map((row, i) => scheduleRowToVersionTaskInsert(row, versionId, i));
  const { data, error } = await client.rpc('save_schedule_draft', {
    _version_id: versionId,
    _expected_revision: expectedRevision,
    _tasks: tasks as unknown as Database['public']['Functions']['save_schedule_draft']['Args']['_tasks'],
  });
  if (error) throw error;
  const result = data as { outcome: SaveOutcome; revision: number };
  return { outcome: result.outcome, revision: result.revision };
}

/** Current optimistic-lock revision of a schedule version. */
export async function getVersionRevision(
  client: PlancoreClient,
  versionId: string,
): Promise<number> {
  const { data, error } = await client
    .from('project_schedule_versions')
    .select('revision')
    .eq('id', versionId)
    .single();
  if (error) throw error;
  return data.revision;
}
