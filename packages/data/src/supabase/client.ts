import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.js';

/**
 * A Supabase client typed against the project's `public` schema.
 *
 * This package never *creates* a client — the host app (browser / server)
 * owns client construction and auth/session handling. Repositories here accept
 * an already-configured `PlancoreClient`, keeping `@plancore/data`
 * framework-agnostic and testable.
 */
export type PlancoreClient = SupabaseClient<Database>;

export type { Database };
