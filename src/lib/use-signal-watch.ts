"use client";

import * as React from "react";

import {
  ACTION_INTERVAL_MS,
  checkSignals,
  shouldCheck,
  unseenEntries,
} from "./notifications";
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
      if (cancelled) return;
      // A ticker added since the last scan has no recorded state, so it cannot
      // be compared against anything. Record its baseline straight away rather
      // than waiting out the throttle: a tab closed before the next scan would
      // leave it unseen, and the following day's real signal would be swallowed
      // as a first observation. Otherwise shouldCheck() decides, so polling on
      // the short interval costs nothing when nothing is due.
      if (!shouldCheck() && unseenEntries(entries).length === 0) return;
      // Fire and forget: failures are already swallowed per-ticker inside.
      void checkSignals(entries);
    };

    // Give first paint room to finish before firing network work. Kept short
    // so adding a ticker and immediately closing the tab still records it.
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
