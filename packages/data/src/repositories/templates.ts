import type { ScaffoldInput } from '@plancore/core';
import type { PlancoreClient } from '../supabase/client.js';
import {
  wbsTemplateToNode,
  dependencyRowToRule,
  durationRowToModel,
} from '../mappers/scaffold.js';

/** Distinct object types that have at least one WBS template. */
export async function listTemplateObjectTypes(
  client: PlancoreClient,
): Promise<string[]> {
  const { data, error } = await client
    .from('wbs_templates')
    .select('object_type');
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.object_type))].sort();
}

/**
 * Load the full scaffold input (templates + dependency + duration rules) for a
 * given object type, ready to feed `buildScheduleFromTemplate`.
 */
export async function loadScaffoldInput(
  client: PlancoreClient,
  objectType: string,
): Promise<ScaffoldInput> {
  const [templates, dependencies, durations] = await Promise.all([
    client.from('wbs_templates').select('*').eq('object_type', objectType)
      .order('wbs_level', { ascending: true })
      .order('sort_order', { ascending: true }),
    client.from('dependency_matrix').select('*').eq('object_type', objectType),
    client.from('duration_models').select('*').eq('object_type', objectType),
  ]);

  if (templates.error) throw templates.error;
  if (dependencies.error) throw dependencies.error;
  if (durations.error) throw durations.error;

  return {
    templates: (templates.data ?? []).map(wbsTemplateToNode),
    dependencies: (dependencies.data ?? []).map(dependencyRowToRule),
    durationModels: (durations.data ?? []).map(durationRowToModel),
  };
}
