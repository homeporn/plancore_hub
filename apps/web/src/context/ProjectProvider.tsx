'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ProjectMeta } from '@plancore/data';

interface ProjectContextValue {
  /** The currently active project, or null when none is selected. */
  current: ProjectMeta | null;
  setCurrent: (project: ProjectMeta | null) => void;
  clear: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

/**
 * Holds the cross-mode "current project" so import / audit / editor / graph
 * routes share a single selection. State is in-memory (per session); the Hub
 * sets it on open, modes read it.
 */
export function ProjectProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ProjectMeta | null>(null);
  const clear = useCallback(() => setCurrent(null), []);
  return (
    <ProjectContext.Provider value={{ current, setCurrent, clear }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within a ProjectProvider');
  return ctx;
}
