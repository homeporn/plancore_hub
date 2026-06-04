// Library orchestrator Edge Function.
//
// The single authoritative entry point for *mutating* library items. It:
//   1. authenticates the caller (JWT from the Authorization header),
//   2. validates the requested workflow action against the current state
//      (shared state machine in ./workflow.ts),
//   3. applies the item update, records an immutable snapshot in
//      `library_item_versions`, and appends a `library_change_log` entry.
//
// Reads stay on the client via the cached LibraryStore; only writes go here so
// transitions, versioning and the audit trail are enforced in one place.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { applyTransition, LibraryTransitionError, type LibraryAction } from './workflow.ts';

interface RequestBody {
  itemId: string;
  action: LibraryAction;
  note?: string;
  /** Optional new content; only persisted for content edits, not transitions. */
  payload?: unknown;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Identify the caller with their own JWT (respects auth, not RLS bypass).
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);
  const userId = userData.user.id;

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.itemId || !body.action) {
    return json({ error: 'itemId and action are required' }, 400);
  }

  // Service-role client performs the authoritative writes after validation.
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: item, error: loadError } = await admin
    .from('library_items')
    .select('*')
    .eq('id', body.itemId)
    .maybeSingle();
  if (loadError) return json({ error: loadError.message }, 500);
  if (!item) return json({ error: 'Library item not found' }, 404);

  // Validate the transition with the shared state machine.
  let next: { status: string; publishState: string };
  try {
    next = applyTransition(
      {
        status: item.status,
        validationState: item.validation_state,
        publishState: item.publish_state,
      },
      body.action,
    );
  } catch (e) {
    if (e instanceof LibraryTransitionError) return json({ error: e.message }, 422);
    throw e;
  }

  const fromStatus = item.status;
  const updatedPayload = body.payload !== undefined ? body.payload : item.payload;

  // 1) Update the item to its new state.
  const { data: updated, error: updateError } = await admin
    .from('library_items')
    .update({
      status: next.status,
      publish_state: next.publishState,
      payload: updatedPayload,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.itemId)
    .select('*')
    .single();
  if (updateError) return json({ error: updateError.message }, 500);

  // 2) Snapshot the resulting state for history.
  const { error: versionError } = await admin.from('library_item_versions').insert({
    library_item_id: body.itemId,
    version: updated.version,
    status: updated.status,
    validation_state: updated.validation_state,
    publish_state: updated.publish_state,
    snapshot: updated,
    note: body.note ?? null,
    created_by: userId,
  });
  if (versionError) return json({ error: versionError.message }, 500);

  // 3) Append an audit entry to the change log.
  const { error: logError } = await admin.from('library_change_log').insert({
    library_item_id: body.itemId,
    action_type: body.action,
    from_status: fromStatus,
    to_status: updated.status,
    summary: `${body.action}: ${fromStatus} → ${updated.status}`,
    details: { publishState: updated.publish_state, note: body.note ?? null },
    created_by: userId,
  });
  if (logError) return json({ error: logError.message }, 500);

  return json({ item: updated });
});
