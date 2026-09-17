"use client";

import type { Session } from "@supabase/supabase-js";
import * as React from "react";

import { SYNC_CONFIGURED, authRedirectUrl, getSupabase } from "./supabase";
import { pullPayload, pushPayload } from "./sync-remote";
import {
  applyLocal,
  collectLocal,
  mergePayloads,
  type SyncPayload,
} from "./sync";

/**
 * Account and sync.
 *
 * Optional throughout: with no Supabase project configured the hook reports
 * `configured: false` and every action is a no-op, so the app behaves exactly
 * as it did before any of this existed.
 *
 * Signing in pulls the stored state, merges it with whatever is in this browser,
 * saves the result to both and reloads. After that useSyncPush() keeps the
 * stored copy current in the background. There is no live cross-device
 * streaming: the honest version of that needs conflict handling far beyond what
 * this app's data is worth.
 */

export type SyncStatus =
  | "idle"
  | "syncing"
  | "saved"
  | "error"
  | "unconfigured";

export function useAccount() {
  const supabase = getSupabase();

  const [session, setSession] = React.useState<Session | null>(null);
  const [ready, setReady] = React.useState(!SYNC_CONFIGURED);
  const [status, setStatus] = React.useState<SyncStatus>(
    SYNC_CONFIGURED ? "idle" : "unconfigured",
  );
  const [error, setError] = React.useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = React.useState<number | null>(null);

  // --- Session ------------------------------------------------------------
  React.useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setReady(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // --- Remote read / write ------------------------------------------------
  const pull = React.useCallback(async (): Promise<SyncPayload | null> => {
    if (!supabase || !session) return null;
    return pullPayload(supabase, session.user.id);
  }, [supabase, session]);

  const push = React.useCallback(
    async (payload: SyncPayload) => {
      if (!supabase || !session) return;
      await pushPayload(supabase, session.user.id, payload);
    },
    [supabase, session],
  );

  /**
   * Full reconcile. Used on sign-in and by the manual button.
   *
   * Reloads afterwards: every preference store in the app caches its value in
   * module scope, so rewriting localStorage underneath them would leave a
   * half-updated UI. A reload at this exact moment is unremarkable — it only
   * happens when signing in or when the user explicitly asks to sync.
   */
  const syncNow = React.useCallback(
    async (opts?: { reload?: boolean }) => {
      if (!supabase || !session) return;
      setStatus("syncing");
      setError(null);
      try {
        const local = collectLocal();
        const remote = await pull();
        const merged = mergePayloads(local, remote);
        applyLocal(merged);
        await push(merged);
        setLastSyncedAt(Date.now());
        setStatus("saved");
        if (opts?.reload !== false) window.location.reload();
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Sync failed.");
      }
    },
    [supabase, session, pull, push],
  );

  // Ongoing pushes are handled by useSyncPush(), mounted once in the app shell
  // so they keep running on every page rather than only while this panel is
  // open. It is silent by design; the explicit feedback lives on the button.

  // --- Auth actions -------------------------------------------------------
  const signIn = React.useCallback(
    async (email: string) => {
      if (!supabase) return { ok: false, message: "Sync is not configured." };
      const trimmed = email.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
        return { ok: false, message: "That does not look like an email." };
      }
      const { error: err } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: authRedirectUrl() },
      });
      if (err) return { ok: false, message: err.message };
      return {
        ok: true,
        message: `Check ${trimmed} for a sign-in link. It expires shortly.`,
      };
    },
    [supabase],
  );

  /**
   * Signs out WITHOUT clearing local data.
   *
   * Everything already synced stays in this browser, so signing out is not a
   * destructive act — the watchlist and settings are still there, exactly as
   * they would be for someone who never signed in.
   */
  const signOut = React.useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setStatus("idle");
    setLastSyncedAt(null);
  }, [supabase]);

  return {
    configured: SYNC_CONFIGURED,
    ready,
    session,
    email: session?.user.email ?? null,
    status,
    error,
    lastSyncedAt,
    signIn,
    signOut,
    syncNow,
  };
}
