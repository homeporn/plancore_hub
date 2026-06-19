'use client';

import { useEffect, useState } from 'react';
import { getMyProjectRole, type ProjectRole } from '@plancore/data';
import { getBrowserClient } from '@/lib/supabase/browser';
import { useAuth } from '@/lib/useAuth';

export interface ProjectCaps {
  role: ProjectRole | null;
  loading: boolean;
  /** Edit an existing schedule (owner/admin/planner/member). */
  canEdit: boolean;
  /** Create new schedules / approve (owner/admin). */
  canCreateSchedule: boolean;
  /** Assign roles / manage members (owner/admin). */
  canManageMembers: boolean;
}

const MANAGER: ProjectRole[] = ['owner', 'admin'];
const EDITOR: ProjectRole[] = ['owner', 'admin', 'planner', 'member'];

/** Resolve the current user's role + capabilities on a project. */
export function useProjectRole(projectId: string | null): ProjectCaps {
  const { user } = useAuth();
  const [role, setRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !user) {
      setRole(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getMyProjectRole(getBrowserClient(), projectId, user.id)
      .then((r) => { if (active) setRole(r); })
      .catch(() => { if (active) setRole(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, user]);

  return {
    role,
    loading,
    canEdit: role ? EDITOR.includes(role) : false,
    canCreateSchedule: role ? MANAGER.includes(role) : false,
    canManageMembers: role ? MANAGER.includes(role) : false,
  };
}
