"use client";

import * as React from "react";

import { analyse, verdict, type AlphaResult } from "./alpha";
import type { History } from "./symbols";
import type { WatchEntry } from "./watchlist";

/**
 * Runs every watchlist entry through the engine with its own saved strategy.
 *
 * Each ticker needs one /api/history call, which is edge-cached for an hour,
 * and the analysis itself is local — measured at roughly 18ms per ticker. The
 * fetches are capped so a long list cannot open forty sockets at once.
 */

const CONCURRENCY = 6;

export type ScanRow =
  | { entry: WatchEntry; status: "loading" }
  | { entry: WatchEntry; status: "error"; message: string }
  | {
      entry: WatchEntry;
      status: "ok";
      history: History;
      result: AlphaResult;
      grade: ReturnType<typeof verdict>;
    };

/** Simple worker pool, so a 40-row list does not stampede the API. */
async function pooled<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      for (;;) {
        const i = cursor++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    },
  );

  await Promise.all(workers);
  return out;
}

type Completed = { key: string; rows: ScanRow[]; at: number };

export function useWatchlistScan(entries: WatchEntry[]) {
  const [done, setDone] = React.useState<Completed | null>(null);

  // Identifies the exact list being scanned, so a change of ticker, strategy
  // or parameter starts a new scan while a re-render alone does not.
  const key = entries
    .map((e) => `${e.symbol}:${e.factor}:${e.param}`)
    .join("|");

  React.useEffect(() => {
    if (entries.length === 0) return;
    let cancelled = false;

    pooled(entries, CONCURRENCY, async (entry): Promise<ScanRow> => {
      try {
        const res = await fetch(
          `/api/history?symbol=${encodeURIComponent(entry.symbol)}`,
        );
        const body = await res.json();
        if (!res.ok) {
          return {
            entry,
            status: "error",
            message: body?.message ?? "Could not load this ticker.",
          };
        }
        const history = body as History;
        const result = analyse(history.bars, entry.factor, entry.param, 5);
        return { entry, status: "ok", history, result, grade: verdict(result) };
      } catch {
        return { entry, status: "error", message: "Network error." };
      }
    })
      .then((rows) => {
        if (!cancelled) setDone({ key, rows, at: Date.now() });
      })
      .catch(() => {
        if (!cancelled) {
          setDone({
            key,
            rows: entries.map((entry) => ({
              entry,
              status: "error" as const,
              message: "Scan failed.",
            })),
            at: Date.now(),
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // `key` already encodes every field the scan depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Everything below is derived, so the effect only ever writes once, from its
  // async callback — no synchronous setState during the effect body.
  const fresh = done?.key === key;
  const rows: ScanRow[] = React.useMemo(() => {
    if (entries.length === 0) return [];
    if (fresh && done) return done.rows;
    return entries.map((entry) => ({ entry, status: "loading" as const }));
  }, [entries, fresh, done]);

  return {
    rows,
    scanning: entries.length > 0 && !fresh,
    scannedAt: fresh ? (done?.at ?? null) : null,
  };
}
