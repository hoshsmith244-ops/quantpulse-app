"use client";

import * as React from "react";

import type { ScreenData } from "./screen";

/**
 * Loads the pre-built screener dataset.
 *
 * The scan is 1,000-odd backtests over 200 tickers and takes minutes, which is
 * far too slow to do per request — and pointless, because daily bars only move
 * once a day. It is built offline by `scripts/build-screen.mts` and served as a
 * static file, so this page costs one cached CDN fetch and no Yahoo traffic at
 * all.
 */
export function useScreen() {
  const [data, setData] = React.useState<ScreenData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetch("/screen.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: ScreenData) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "The screen could not be loaded. It is a static file — a refresh usually fixes it.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error };
}
