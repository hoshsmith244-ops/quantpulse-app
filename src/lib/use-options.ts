"use client";

import * as React from "react";

import type { IvCutoffs, OptionsSnapshot } from "./options";

/** Yahoo's option quotes run ~15 minutes late; refreshing faster buys nothing. */
const REFRESH_MS = 5 * 60_000;

export type OptionsState =
  | { status: "loading" }
  | { status: "ready"; snapshot: OptionsSnapshot }
  | { status: "none" }
  | { status: "error" };

/**
 * The live option chain for one ticker, plus today's IV cutoffs.
 *
 * "none" is a real answer, not a failure: crypto and most non-US listings have
 * no options, and the panel says so rather than showing an error.
 */
export function useOptions(symbol: string): { state: OptionsState; cutoffs: IvCutoffs | null } {
  const [data, setData] = React.useState<{ for: string; state: OptionsState } | null>(null);
  const cutoffs = useIvCutoffs();

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/options?symbol=${encodeURIComponent(symbol)}`);
        if (cancelled) return;
        if (res.status === 404) {
          setData({ for: symbol, state: { status: "none" } });
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const snapshot = (await res.json()) as OptionsSnapshot;
        if (!cancelled) setData({ for: symbol, state: { status: "ready", snapshot } });
      } catch {
        // Keep showing the last good chain on a failed refresh; only report an
        // error when there is nothing to show.
        if (!cancelled) {
          setData((prev) => (prev && prev.for === symbol && prev.state.status === "ready" ? prev : { for: symbol, state: { status: "error" } }));
        }
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol]);

  return { state: data && data.for === symbol ? data.state : { status: "loading" }, cutoffs };
}

let cutoffsPromise: Promise<IvCutoffs | null> | null = null;

/** Published by the nightly screen build; one small static file, fetched once. */
function useIvCutoffs(): IvCutoffs | null {
  const [cutoffs, setCutoffs] = React.useState<IvCutoffs | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    cutoffsPromise ??= fetch("/iv-cutoffs.json")
      .then((r) => (r.ok ? (r.json() as Promise<IvCutoffs>) : null))
      .catch(() => null);
    cutoffsPromise.then((c) => {
      if (!cancelled) setCutoffs(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return cutoffs;
}
