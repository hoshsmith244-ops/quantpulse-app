import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for the scheduled job.
 *
 * Uses the SERVICE ROLE key, which bypasses row-level security completely. It
 * exists so one background pass can read every user's watchlist and write to
 * their alert log — something no signed-in session is allowed to do.
 *
 * Two guards, because leaking this key would expose every user's data:
 *
 *   - `server-only` at the top of the file. Importing it from a client
 *     component fails the build rather than shipping the key to a browser.
 *   - The variable deliberately has no NEXT_PUBLIC_ prefix, so Next will not
 *     inline it into the bundle even if something did import it.
 *
 * Returns null when unset, so the app runs perfectly well without any of this
 * configured — the endpoint simply reports that it is switched off.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const ADMIN_CONFIGURED = Boolean(url && serviceKey);

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
