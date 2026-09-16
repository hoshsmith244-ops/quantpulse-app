"use client";

import * as React from "react";

import { DEFAULT_COST_BPS, FACTORS, getFactor, type FactorId } from "./alpha";
import { normaliseSymbol } from "./symbols";

export type Params = {
  symbol: string;
  factor: FactorId;
  param: number;
  horizon: number;
  /** round-trip trading cost in basis points */
  costBps: number;
};

export const DEFAULTS: Params = {
  symbol: "AAPL",
  factor: "momentum",
  param: 126,
  horizon: 5,
  costBps: DEFAULT_COST_BPS,
};

/**
 * Remembers what you were looking at.
 *
 * Navigating to the guide and back unmounts the terminal, which would
 * otherwise reset you to the default ticker. State lives in localStorage and
 * is read through useSyncExternalStore rather than an effect, so the server
 * snapshot and the first client render agree and React applies the stored
 * value immediately after hydration without a mismatch.
 */

const KEY = "qp:params";

const listeners = new Set<() => void>();

/**
 * getSnapshot must return a referentially stable value or React re-renders
 * forever, so the parsed result is cached and only rebuilt on a write.
 */
let cached: Params | null = null;

const VALID_FACTORS = new Set<string>(FACTORS.map((f) => f.id));

/** Anything could be in storage, so validate every field before trusting it. */
function parse(raw: string | null): Params {
  if (!raw) return DEFAULTS;

  try {
    const v = JSON.parse(raw) as Partial<Params>;

    const symbol = normaliseSymbol(String(v.symbol ?? "")) ?? DEFAULTS.symbol;
    const factor = (
      VALID_FACTORS.has(String(v.factor)) ? v.factor : DEFAULTS.factor
    ) as FactorId;

    const meta = getFactor(factor);
    const rawParam = Number(v.param);
    const param = Number.isFinite(rawParam)
      ? Math.min(meta.max, Math.max(meta.min, Math.round(rawParam)))
      : meta.def;

    const rawHorizon = Number(v.horizon);
    const horizon = Number.isFinite(rawHorizon)
      ? Math.min(250, Math.max(1, Math.round(rawHorizon)))
      : DEFAULTS.horizon;

    const rawCost = Number(v.costBps);
    const costBps = Number.isFinite(rawCost)
      ? Math.min(100, Math.max(0, rawCost))
      : DEFAULT_COST_BPS;

    return { symbol, factor, param, horizon, costBps };
  } catch {
    return DEFAULTS;
  }
}

function read(): Params {
  if (cached) return cached;
  try {
    cached = parse(window.localStorage.getItem(KEY));
  } catch {
    // Private browsing or blocked storage — defaults are fine.
    cached = DEFAULTS;
  }
  return cached;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Keep other tabs in step.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cached = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePersistedParams(): [
  Params,
  React.Dispatch<React.SetStateAction<Params>>,
] {
  const params = React.useSyncExternalStore(subscribe, read, () => DEFAULTS);

  const setParams = React.useCallback<
    React.Dispatch<React.SetStateAction<Params>>
  >((update) => {
    const next =
      typeof update === "function"
        ? (update as (prev: Params) => Params)(cached ?? DEFAULTS)
        : update;

    cached = next;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Not persisting is acceptable; the session still works.
    }
    for (const cb of listeners) cb();
  }, []);

  return [params, setParams];
}
