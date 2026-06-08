import type { PlancoreClient } from '../supabase/client.js';

export type CustomColumnType = 'text' | 'number' | 'date';

export interface CustomColumn {
  id: string;
  projectId: string;
  key: string;
  label: string;
  type: CustomColumnType;
  sortOrder: number;
}

export interface CustomColumnInput {
  key: string;
  label: string;
  type?: CustomColumnType;
  sortOrder?: number;
}

function toCustomColumn(row: {
  id: string;
  project_id: string;
  key: string;
  label: string;
  col_type: string;
  sort_order: number;
}): CustomColumn {
  return {
    id: row.id,
    projectId: row.project_id,
    key: row.key,
    label: row.label,
    type: (row.col_type as CustomColumnType) ?? 'text',
    sortOrder: row.sort_order,
  };
}

/** User-defined custom columns for a project, in display order. */
export async function listCustomColumns(
  client: PlancoreClient,
  projectId: string,
): Promise<CustomColumn[]> {
  const { data, error } = await client
    .from('project_custom_columns')
    .select('id, project_id, key, label, col_type, sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toCustomColumn);
}

/** Create a custom column definition for a project. */
export async function createCustomColumn(
  client: PlancoreClient,
  projectId: string,
  input: CustomColumnInput,
): Promise<CustomColumn> {
  const { data, error } = await client
    .from('project_custom_columns')
    .insert({
      project_id: projectId,
      key: input.key,
      label: input.label,
      col_type: input.type ?? 'text',
      sort_order: input.sortOrder ?? 0,
    })
    .select('id, project_id, key, label, col_type, sort_order')
    .single();
  if (error) throw error;
  return toCustomColumn(data);
}

/** Delete a custom column definition. */
export async function deleteCustomColumn(
  client: PlancoreClient,
  id: string,
): Promise<void> {
  const { error } = await client.from('project_custom_columns').delete().eq('id', id);
  if (error) throw error;
}
