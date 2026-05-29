'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database, PlancoreClient } from '@plancore/data';
import { supabaseEnv } from './env';

let cached: PlancoreClient | null = null;

/** Browser-side Supabase client (singleton), typed against our schema. */
export function getBrowserClient(): PlancoreClient {
  if (cached) return cached;
  const { url, key } = supabaseEnv();
  cached = createBrowserClient<Database>(url, key);
  return cached;
}
