"use client";

import * as React from "react";

import { FACTORS, getFactor, type FactorId } from "./alpha";
import { normaliseSymbol } from "./symbols";

/**
 * The watchlist.
 *
 * Each entry carries its own strategy preset, not just a ticker. That matters:
 * the research surface exists precisely because a factor that works on one
 * name usually does not work on another, so a watchlist of bare tickers would
 * throw away the conclusion you did the work to reach. Pinning the strategy
 * per row means a scan runs each name the way you decided it should be run.
 *
 * Stored in localStorage and read through useSyncExternalStore, same as the
 * other persisted state, so the server snapshot and first client render agree.
 */

const KEY = "qp:watchlist";
const MAX_ENTRIES = 40;

export type WatchEntry = {
  symbol: string;
  factor: FactorId;
  param: number;
  /** epoch ms, for stable ordering of new additions */
  addedAt: number;
};

const listeners = new Set<() => void>();

/** getSnapshot must be referentially stable or React re-renders forever. */
let cached: WatchEntry[] | null = null;

const VALID_FACTORS = new Set<string>(FACTORS.map((f) => f.id));

/** Storage is untrusted: validate every field on the way in. */
function sanitise(raw: unknown): WatchEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Partial<WatchEntry>;

  const symbol = normaliseSymbol(String(v.symbol ?? ""));
  if (!symbol) return null;

  const factor = (
    VALID_FACTORS.has(String(v.factor)) ? v.factor : "momentum"
  ) as FactorId;

  const meta = getFactor(factor);
  const n = Number(v.param);
  const param = Number.isFinite(n)
    ? Math.min(meta.max, Math.max(meta.min, Math.round(n)))
    : meta.def;

  const addedAt = Number.isFinite(Number(v.addedAt))
    ? Number(v.addedAt)
    : Date.now();

  return { symbol, factor, param, addedAt };
}

function parse(raw: string | null): WatchEntry[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const out: WatchEntry[] = [];
    const seen = new Set<string>();
    for (const item of arr) {
      const e = sanitise(item);
      if (!e) continue;
      // One row per symbol+strategy pair; the same ticker may legitimately
      // appear twice under different strategies.
      const key = `${e.symbol}:${e.factor}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
      if (out.length >= MAX_ENTRIES) break;
    }
    return out;
  } catch {
    return [];
  }
}

function read(): WatchEntry[] {
  if (cached) return cached;
  try {
    cached = parse(window.localStorage.getItem(KEY));
  } catch {
    cached = [];
  }
  return cached;
}

const EMPTY: WatchEntry[] = [];

function subscribe(cb: () => void) {
  listeners.add(cb);
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

function commit(next: WatchEntry[]) {
  cached = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Not persisting is acceptable; the session still works.
  }
  for (const cb of listeners) cb();
}

export function useWatchlist() {
  const entries = React.useSyncExternalStore(subscribe, read, () => EMPTY);

  const add = React.useCallback(
    (symbol: string, factor: FactorId, param: number) => {
      const e = sanitise({ symbol, factor, param, addedAt: Date.now() });
      if (!e) return;
      const current = cached ?? [];
      const key = `${e.symbol}:${e.factor}`;
      // Re-adding an existing pair updates its parameter rather than
      // duplicating the row.
      const without = current.filter((x) => `${x.symbol}:${x.factor}` !== key);
      commit([...without, e].slice(-MAX_ENTRIES));
    },
    [],
  );

  const remove = React.useCallback((symbol: string, factor: FactorId) => {
    const current = cached ?? [];
    commit(
      current.filter((x) => !(x.symbol === symbol && x.factor === factor)),
    );
  }, []);

  const clear = React.useCallback(() => commit([]), []);

  const has = React.useCallback(
    (symbol: string, factor: FactorId) =>
      (cached ?? []).some((x) => x.symbol === symbol && x.factor === factor),
    [],
  );

  return { entries, add, remove, clear, has, max: MAX_ENTRIES };
}
