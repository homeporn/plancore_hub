'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { ProjectMeta } from '@plancore/data';

interface ProjectContextValue {
  /** The currently active project, or null when none is selected. */
  current: ProjectMeta | null;
  setCurrent: (project: ProjectMeta | null) => void;
  clear: () => void;
  /** False until the persisted selection has been read on the client. */
  hydrated: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_KEY = 'plancore.currentProject';

/**
 * Holds the cross-mode "current project" so import / audit / editor / graph
 * routes share a single selection. Persisted to localStorage so the choice
 * survives reloads and deep links; the Hub sets it on open, modes read it.
 */
export function ProjectProvider({ children }: { children: ReactNode }) {
  const [current, setCurrentState] = useState<ProjectMeta | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on the client.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCurrentState(JSON.parse(raw) as ProjectMeta);
    } catch {
      /* ignore malformed storage */
    }
    setHydrated(true);
  }, []);

  const setCurrent = useCallback((project: ProjectMeta | null) => {
    setCurrentState(project);
    try {
      if (project) localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — keep in-memory */
    }
  }, []);

  const clear = useCallback(() => setCurrent(null), [setCurrent]);

  return (
    <ProjectContext.Provider value={{ current, setCurrent, clear, hydrated }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within a ProjectProvider');
  return ctx;
}
