"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SyncPayload } from "./sync";

/**
 * The two remote operations, as plain functions.
 *
 * Kept out of the React hook so the background pusher and the account panel
 * share one implementation of the table name, the upsert conflict target and
 * the error handling, rather than each growing its own slightly different copy.
 */

export const SYNC_TABLE = "user_state";

export async function pullPayload(
  client: SupabaseClient,
  userId: string,
): Promise<SyncPayload | null> {
  const { data, error } = await client
    .from(SYNC_TABLE)
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.state as SyncPayload | undefined) ?? null;
}

export async function pushPayload(
  client: SupabaseClient,
  userId: string,
  payload: SyncPayload,
): Promise<void> {
  const { error } = await client.from(SYNC_TABLE).upsert(
    {
      user_id: userId,
      state: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Cheap change detector.
 *
 * `updatedAt` is stamped fresh on every collect, so it has to be excluded or
 * the payload would look different on every single tick and push forever.
 */
export function signatureOf(p: SyncPayload): string {
  return JSON.stringify([
    p.appearance,
    p.mode,
    p.params,
    p.notifyPrefs,
    p.watchlist,
    p.notifications?.map((e) => [e.id, e.read]),
  ]);
}
