import type { PlancoreClient, Database } from '../supabase/client.js';

type VolumeRow = Database['public']['Tables']['project_volumes']['Row'];

/** A project volume (book/том) — the selectable target of a handoff assignment. */
export interface ProjectVolume {
  id: string;
  projectId: string;
  code: string;
  mark: string;
  setName: string;
  sectionId: string | null;
  name: string;
  sortOrder: number;
}

/** Fields needed to create a volume (project_id is passed separately). */
export interface VolumeInput {
  code?: string;
  mark?: string;
  setName?: string;
  sectionId?: string | null;
  name: string;
  sortOrder?: number;
}

function rowToVolume(row: VolumeRow): ProjectVolume {
  return {
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    mark: row.mark,
    setName: row.set_name,
    sectionId: row.section_id,
    name: row.name,
    sortOrder: row.sort_order,
  };
}

/** The volume registry of a project, ordered for display / selection. */
export async function listVolumes(
  client: PlancoreClient,
  projectId: string,
): Promise<ProjectVolume[]> {
  const { data, error } = await client
    .from('project_volumes')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToVolume);
}

/** Add one volume to a project's registry. */
export async function createVolume(
  client: PlancoreClient,
  projectId: string,
  input: VolumeInput,
): Promise<ProjectVolume> {
  const { data, error } = await client
    .from('project_volumes')
    .insert({
      project_id: projectId,
      code: input.code,
      mark: input.mark,
      set_name: input.setName,
      section_id: input.sectionId ?? null,
      name: input.name,
      sort_order: input.sortOrder,
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToVolume(data);
}

/**
 * Bulk-insert volumes (e.g. from an Excel "состав проекта" import). Returns the
 * created rows in registry order.
 */
export async function createVolumesBatch(
  client: PlancoreClient,
  projectId: string,
  inputs: VolumeInput[],
): Promise<ProjectVolume[]> {
  if (inputs.length === 0) return [];
  const payload = inputs.map((input, i) => ({
    project_id: projectId,
    code: input.code,
    mark: input.mark,
    set_name: input.setName,
    section_id: input.sectionId ?? null,
    name: input.name,
    sort_order: input.sortOrder ?? i,
  }));
  const { data, error } = await client.from('project_volumes').insert(payload).select('*');
  if (error) throw error;
  return (data ?? []).map(rowToVolume).sort((a, b) => a.sortOrder - b.sortOrder);
}
