'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isVersionEditable, type ScheduleRow } from '@plancore/core';
import { ScheduleStore, type PresenceUser } from '@plancore/store';
import {
  getCurrentScheduleVersion,
  loadCurrentScheduleRows,
  type ScheduleVersionInfo,
} from '@plancore/data';
import { getBrowserClient } from '@/lib/supabase/browser';
import { useAuth } from '@/lib/useAuth';

export type SaveState = 'idle' | 'saving' | 'saved' | 'stale' | 'locked' | 'error';

interface CollabApi {
  version: ScheduleVersionInfo | null;
  revision: number;
  editable: boolean;
  /** Other editors currently present on this version (excluding self). */
  others: PresenceUser[];
  /** True when another editor has saved a newer revision than ours. */
  stale: boolean;
  saveState: SaveState;
  error: string | null;
  save: (rows: ScheduleRow[]) => Promise<void>;
  /** Reload rows from the server and clear the stale flag. */
  reload: () => Promise<void>;
}

/**
 * Wire a project's current schedule version to save + realtime collaboration:
 * optimistic-revision save, "who is editing" presence, and a stale signal when
 * someone else saves. `onRows` receives reloaded rows.
 */
export function useScheduleCollab(
  projectId: string | null,
  onRows: (rows: ScheduleRow[]) => void,
): CollabApi {
  const { user } = useAuth();
  const storeRef = useRef<ScheduleStore | null>(null);
  if (!storeRef.current) storeRef.current = new ScheduleStore(getBrowserClient());
  const store = storeRef.current;

  const [version, setVersion] = useState<ScheduleVersionInfo | null>(null);
  const [revision, setRevision] = useState(0);
  const [others, setOthers] = useState<PresenceUser[]>([]);
  const [stale, setStale] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Keep the latest revision available to the realtime callback without
  // re-subscribing on every save.
  const revisionRef = useRef(0);
  revisionRef.current = revision;

  // No version yet → you're building the first one, so editing is allowed.
  // A version locks edits only when it's approved / in review.
  const editable = version ? isVersionEditable(version.approvalStatus) : true;

  // Load version + revision, subscribe to revision changes and presence.
  useEffect(() => {
    if (!projectId) return;
    let leaveRev: (() => void) | undefined;
    let leavePresence: (() => void) | undefined;
    let active = true;

    (async () => {
      const v = await getCurrentScheduleVersion(getBrowserClient(), projectId);
      if (!active || !v) {
        setVersion(v);
        return;
      }
      setVersion(v);
      const rev = await store.getRevision(v.id);
      if (!active) return;
      setRevision(rev);

      leaveRev = store.subscribeRevision(v.id, (serverRev) => {
        if (serverRev !== revisionRef.current) setStale(true);
      });
      if (user) {
        leavePresence = store.joinPresence(
          v.id,
          { userId: user.id, name: user.email ?? 'Пользователь' },
          (editors) => setOthers(editors.filter((e) => e.userId !== user.id)),
        );
      }
    })().catch((e) => setError(e instanceof Error ? e.message : 'Ошибка инициализации'));

    return () => {
      active = false;
      leaveRev?.();
      leavePresence?.();
    };
  }, [projectId, user, store]);

  const reload = useCallback(async () => {
    if (!projectId || !version) return;
    const [rows, rev] = await Promise.all([
      loadCurrentScheduleRows(getBrowserClient(), projectId),
      store.getRevision(version.id),
    ]);
    onRows(rows);
    setRevision(rev);
    setStale(false);
    setSaveState('idle');
  }, [projectId, version, store, onRows]);

  const save = useCallback(
    async (rows: ScheduleRow[]) => {
      if (!version) return;
      setSaveState('saving');
      setError(null);
      try {
        const result = await store.save(version.id, revisionRef.current, rows);
        if (result.outcome === 'saved') {
          setRevision(result.revision);
          setSaveState('saved');
        } else if (result.outcome === 'stale') {
          setStale(true);
          setSaveState('stale');
        } else {
          setSaveState('locked');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить');
        setSaveState('error');
      }
    },
    [version, store],
  );

  return { version, revision, editable, others, stale, saveState, error, save, reload };
}
