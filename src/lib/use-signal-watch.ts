"use client";

import * as React from "react";

import { CHECK_INTERVAL_MS, checkSignals, shouldCheck } from "./notifications";
import { useWatchlist } from "./watchlist";

/**
 * Runs a signal check in the background from anywhere in the app, so the bell
 * is meaningful on every page rather than only after visiting the watchlist.
 *
 * Throttled to one check per interval across the whole app — the underlying
 * history route is cached for an hour and signals only move on a daily close,
 * so checking more often would just burn requests.
 */
export function useSignalWatch() {
  const { entries } = useWatchlist();

  const key = entries.map((e) => `${e.symbol}:${e.factor}`).join("|");

  React.useEffect(() => {
    if (entries.length === 0) return;
    let cancelled = false;

    const run = () => {
      if (cancelled || !shouldCheck()) return;
      // Fire and forget: failures are already swallowed per-ticker inside.
      void checkSignals(entries);
    };

    // Give first paint room to finish before firing network work.
    const initial = setTimeout(run, 1500);
    const id = setInterval(run, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(id);
    };
    // `key` captures the list identity; entries is read fresh inside run().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
