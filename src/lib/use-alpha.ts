"use client";

import * as React from "react";

import { analyse, getFactor, type AlphaResult, type FactorId } from "./alpha";
import type { History } from "./symbols";

export type Params = {
  symbol: string;
  factor: FactorId;
  param: number;
  horizon: number;
};

export const DEFAULTS: Params = {
  symbol: "AAPL",
  factor: "momentum",
  param: 126,
  horizon: 5,
};

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
export function useAlpha(initial: Partial<Params> = {}) {
  const [params, setParams] = React.useState<Params>({
    ...DEFAULTS,
    ...initial,
  });
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);

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

  const state: State = React.useMemo(() => {
    if (!loaded || loaded.symbol !== params.symbol) return { status: "loading" };
    return loaded.ok
      ? { status: "ready", history: loaded.history }
      : { status: "error", message: loaded.message };
  }, [loaded, params.symbol]);

  const deferred = React.useDeferredValue(params);
  const computing = params !== deferred;

  const result: AlphaResult | null = React.useMemo(() => {
    if (state.status !== "ready") return null;
    return analyse(
      state.history.bars,
      deferred.factor,
      deferred.param,
      deferred.horizon,
    );
  }, [state, deferred]);

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
    [],
  );

  return { params, set, setParams, state, result, computing };
}
