"use client";

import * as React from "react";

import { collectLocal } from "./sync";
import { pushPayload, signatureOf } from "./sync-remote";
import { getSupabase } from "./supabase";

/**
 * Keeps the stored copy current while you use the app.
 *
 * Without this, sync only ran when the account panel was open and its button
 * was pressed — so adding a ticker on one device and closing the tab would
 * never reach the other one, which is the whole point of the feature.
 *
 * Deliberately a polling check rather than a subscription. The state it watches
 * is spread across five independent localStorage stores, each with its own
 * listener list; subscribing to all of them would couple this to every one and
 * still miss writes made outside React. Comparing a signature every few seconds
 * catches all of it, and the payload is a few kilobytes so the comparison is
 * free.
 *
 * Runs silently: it reports nothing to the UI, because a status indicator that
 * flickers on every keystroke is worse than no indicator. The account panel
 * still shows explicit feedback for the sync it performs itself.
 */

/** How often to look for local changes. */
const CHECK_MS = 8_000;
/** Ignore failures this many times in a row before giving up until reload. */
const MAX_FAILURES = 3;

export function useSyncPush(userId: string | null) {
  React.useEffect(() => {
    const client = getSupabase();
    if (!client || !userId) return;

    let cancelled = false;
    let failures = 0;
    // Seeded from the current state so signing in does not immediately push
    // what syncNow() has just written.
    let lastSignature = signatureOf(collectLocal());
    let inFlight = false;

    const maybePush = async () => {
      if (cancelled || inFlight || failures >= MAX_FAILURES) return;
      const payload = collectLocal();
      const signature = signatureOf(payload);
      if (signature === lastSignature) return;

      inFlight = true;
      try {
        await pushPayload(client, userId, payload);
        if (!cancelled) {
          lastSignature = signature;
          failures = 0;
        }
      } catch {
        // Offline, or the table is missing. Retry on the next tick a few times,
        // then stop bothering the network until the page is reloaded — the data
        // is safe locally regardless.
        failures++;
      } finally {
        inFlight = false;
      }
    };

    const interval = window.setInterval(maybePush, CHECK_MS);

    // Closing or backgrounding the tab is the moment most likely to lose a
    // change, so take the opportunity.
    const onHide = () => {
      if (document.visibilityState === "hidden") void maybePush();
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [userId]);
}
