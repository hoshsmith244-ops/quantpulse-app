"use client";

import * as React from "react";

import { analyse, getFactor, type AlphaResult, type FactorId } from "./alpha";
import type { History, SentimentSeries } from "./symbols";
import {
  usePersistedParams,
  DEFAULTS,
  type Params,
} from "./use-persisted-params";

// Re-exported so existing imports of Params/DEFAULTS keep working.
export { DEFAULTS };
export type { Params };

/** What came back for one symbol. */
type Loaded =
  | { symbol: string; ok: true; history: History }
  | { symbol: string; ok: false; message: string };

export type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; history: History };

/**
 * Fetches a ticker once, then recomputes the analysis locally whenever the
 * factor, parameter or horizon changes, so slider drags stay instant.
 *
 * Loading is *derived* — it is true whenever the data on hand is for a
 * different symbol than the one requested — rather than being set from inside
 * the effect. That keeps the effect to a single state write, in its async
 * callback, where it belongs.
 */
export function useAlpha() {
  // Persisted, so leaving for the guide and coming back keeps your ticker.
  const [params, setParams] = usePersistedParams();
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [sentiment, setSentiment] = React.useState<SentimentSeries | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const symbol = params.symbol;

    fetch(`/api/history?symbol=${encodeURIComponent(symbol)}`)
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        setLoaded(
          res.ok
            ? { symbol, ok: true, history: body as History }
            : {
                symbol,
                ok: false,
                message: body?.message ?? "Could not load market data.",
              },
        );
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded({
          symbol,
          ok: false,
          message: "Network error while loading market data.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [params.symbol]);

  // Sentiment is optional — it needs an API key — so the factor that depends
  // on it stays hidden unless real data comes back.
  React.useEffect(() => {
    let cancelled = false;
    const url = `/api/sentiment?symbol=${encodeURIComponent(params.symbol)}`;

    fetch(url)
      .then((r) => r.json())
      .then((body: SentimentSeries) => {
        if (!cancelled) setSentiment(body);
      })
      .catch(() => {
        if (!cancelled) setSentiment(null);
      });

    return () => {
      cancelled = true;
    };
  }, [params.symbol]);

  const state: State = React.useMemo(() => {
    if (!loaded || loaded.symbol !== params.symbol) return { status: "loading" };
    return loaded.ok
      ? { status: "ready", history: loaded.history }
      : { status: "error", message: loaded.message };
  }, [loaded, params.symbol]);

  const deferred = React.useDeferredValue(params);
  const computing = params !== deferred;

  const sentimentMap = React.useMemo(() => {
    if (!sentiment?.available) return undefined;
    return new Map(sentiment.daily.map((d) => [d.date, d.score]));
  }, [sentiment]);

  const result: AlphaResult | null = React.useMemo(() => {
    if (state.status !== "ready") return null;
    return analyse(
      state.history.bars,
      deferred.factor,
      deferred.param,
      deferred.horizon,
      { sentiment: sentimentMap },
    );
  }, [state, deferred, sentimentMap]);

  const set = React.useCallback(
    <K extends keyof Params>(key: K, value: Params[K]) => {
      setParams((prev) => {
        if (key !== "factor") return { ...prev, [key]: value };
        // Each factor has its own sensible parameter range, so switching
        // factors resets the parameter rather than carrying a nonsense one over.
        const meta = getFactor(value as FactorId);
        return { ...prev, factor: value as FactorId, param: meta.def };
      });
    },
    [setParams],
  );

  return {
    params,
    set,
    setParams,
    state,
    result,
    computing,
    sentiment,
    sentimentMap,
  };
}
