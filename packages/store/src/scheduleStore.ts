/**
 * ScheduleStore — server-facing facade for saving a schedule draft and for
 * realtime collaboration signals (Wave H).
 *
 * The in-editor row state stays in the local `useScheduleStore`; this store owns
 * the persistence + concurrency concerns: the atomic save RPC, an optimistic
 * revision, presence ("who is editing") and a notification when another editor
 * advances the version's revision.
 */

import type { ScheduleRow, SaveResult } from '@plancore/core';
import type { PlancoreClient } from '@plancore/data';
import { saveScheduleDraft, getVersionRevision } from '@plancore/data';

export interface PresenceUser {
  userId: string;
  name: string;
}

export class ScheduleStore {
  constructor(private readonly client: PlancoreClient) {}

  /** Persist rows to a draft version; returns saved | stale | locked + revision. */
  save(versionId: string, expectedRevision: number, rows: ScheduleRow[]): Promise<SaveResult> {
    return saveScheduleDraft(this.client, versionId, expectedRevision, rows);
  }

  getRevision(versionId: string): Promise<number> {
    return getVersionRevision(this.client, versionId);
  }

  /**
   * Notify when the version's revision changes on the server (another editor
   * saved). Returns an unsubscribe function.
   */
  subscribeRevision(versionId: string, onChange: (revision: number) => void): () => void {
    const channel = this.client
      .channel(`schedule-rev:${versionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_schedule_versions',
          filter: `id=eq.${versionId}`,
        },
        (payload: { new: { revision?: number } }) => {
          const rev = payload.new?.revision;
          if (typeof rev === 'number') onChange(rev);
        },
      )
      .subscribe();
    return () => {
      void this.client.removeChannel(channel);
    };
  }

  /**
   * Track presence on a version and report the set of editors currently joined.
   * Returns a leave function.
   */
  joinPresence(
    versionId: string,
    me: PresenceUser,
    onSync: (editors: PresenceUser[]) => void,
  ): () => void {
    const channel = this.client.channel(`schedule-presence:${versionId}`, {
      config: { presence: { key: me.userId } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, PresenceUser[]>;
        const editors = Object.values(state).flat();
        onSync(editors);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') void channel.track(me);
      });
    return () => {
      void this.client.removeChannel(channel);
    };
  }
}
