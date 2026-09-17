"use client";

import * as React from "react";

import { ACTION_INTERVAL_MS, checkSignals, shouldCheck } from "./notifications";
import { useWatchlist } from "./watchlist";

/**
 * Runs a signal check in the background from anywhere in the app, so the bell
 * is meaningful on every page rather than only after visiting the watchlist.
 *
 * The cadence is adaptive rather than fixed. Most of the day a check every
 * fifteen minutes is generous — daily signals move once a day and the history
 * route is cached for an hour. But the pre-close window is only ten minutes
 * wide, and a fixed fifteen-minute timer would routinely sleep straight
 * through the one stretch of the day the alerts exist for. Each scan reports
 * how soon it needs to run again, and the ticker below simply asks often
 * enough to honour it.
 */
export function useSignalWatch() {
  const { entries } = useWatchlist();

  const key = entries.map((e) => `${e.symbol}:${e.factor}`).join("|");

  React.useEffect(() => {
    if (entries.length === 0) return;
    let cancelled = false;

    const run = () => {
      // shouldCheck() compares against the delay the last scan asked for, so
      // polling on the short interval costs nothing when nothing is due.
      if (cancelled || !shouldCheck()) return;
      // Fire and forget: failures are already swallowed per-ticker inside.
      void checkSignals(entries);
    };

    // Give first paint room to finish before firing network work.
    const initial = setTimeout(run, 1500);
    const id = setInterval(run, ACTION_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(id);
    };
    // `key` captures the list identity; entries is read fresh inside run().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
