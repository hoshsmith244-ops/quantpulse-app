"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client, created only when the project is actually configured.
 *
 * Sync is entirely optional and the app has to work without it. Every caller
 * therefore goes through `getSupabase()`, which returns null when the
 * environment variables are absent — the account UI then explains that sync is
 * not set up rather than throwing, and nothing else in the app notices.
 *
 * Both variables are NEXT_PUBLIC_ on purpose. The anon key is designed to be
 * public: it carries no privileges of its own, and every row is protected by
 * row-level security policies that compare auth.uid() to the row's owner. The
 * service-role key, which does bypass RLS, is never used in this app and must
 * never reach the browser.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when sync has been configured for this deployment. */
export const SYNC_CONFIGURED = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!client) client = createBrowserClient(url, anonKey);
  return client;
}

/**
 * Where the magic link should land.
 *
 * The browser's own origin wins over NEXT_PUBLIC_APP_URL. That ordering is
 * deliberate: this is only ever called from a click in a real browser, which by
 * definition knows where it is, whereas the env var is a build-time constant
 * that is trivially wrong in one environment or the other — a production build
 * carrying a localhost value would email people links back to their own
 * machine. Preferring the live origin makes localhost, preview deployments and
 * production all work with no per-environment configuration.
 *
 * Safe because Supabase validates the redirect against the project's allowlist,
 * so an unexpected origin is rejected there rather than trusted here.
 */
export function authRedirectUrl(): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "");
  return `${base}/auth/callback`;
}
