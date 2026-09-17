"use client";

import { APPEARANCE_KEY, sanitiseAppearance, type Appearance } from "./appearance";
import {
  MAX_EVENTS,
  SYNC_VERSION,
  describePayload,
  type LocalSummary,
  type SyncPayload,
} from "./sync-merge";
import type { SignalEvent } from "./notifications";
import type { WatchEntry } from "./watchlist";

/**
 * The localStorage side of sync: what gets collected, and how it is applied.
 *
 * The reconciliation rules live in sync-merge.ts, which imports nothing at
 * runtime so it can be driven directly by scripts/check-sync.mts.
 *
 * Deliberately NOT synced — the per-device scan bookkeeping in
 * `qp:signal-state`, `qp:pending-alerts` and `qp:last-check`. Those record what
 * a given browser has already seen, and copying them across would either
 * suppress alerts a second device should raise or replay ones already handled.
 * A new device starting with none of it records its baselines silently, which
 * is exactly the desired behaviour.
 */

export {
  SYNC_VERSION,
  MAX_EVENTS,
  describePayload,
  mergePayloads,
  mergeWatchlists,
  mergeNotifications,
  type SyncPayload,
  type LocalSummary,
} from "./sync-merge";

/** Storage keys owned elsewhere; gathered here so sync stays one module. */
export const KEYS = {
  appearance: APPEARANCE_KEY,
  mode: "qp:mode",
  params: "qp:params",
  watchlist: "qp:watchlist",
  notifyPrefs: "qp:notify-prefs",
  notifications: "qp:notifications",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Storage unavailable. Nothing useful to do; the session still works.
  }
}

/** Snapshot of everything this browser would contribute. */
export function collectLocal(): SyncPayload {
  return {
    version: SYNC_VERSION,
    updatedAt: Date.now(),
    appearance: read<Appearance | null>(KEYS.appearance, null),
    mode: read<string | null>(KEYS.mode, null),
    params: read<unknown>(KEYS.params, null),
    watchlist: read<WatchEntry[]>(KEYS.watchlist, []),
    notifyPrefs: read<unknown>(KEYS.notifyPrefs, null),
    notifications: read<SignalEvent[]>(KEYS.notifications, []),
  };
}

/** Writes a payload into this browser. Callers reload afterwards. */
export function applyLocal(p: SyncPayload) {
  if (p.appearance) write(KEYS.appearance, sanitiseAppearance(p.appearance));
  if (p.mode) write(KEYS.mode, p.mode);
  if (p.params) write(KEYS.params, p.params);
  write(KEYS.watchlist, p.watchlist ?? []);
  if (p.notifyPrefs) write(KEYS.notifyPrefs, p.notifyPrefs);
  write(KEYS.notifications, (p.notifications ?? []).slice(0, MAX_EVENTS));
}

// ---------------------------------------------------------------------------
// Summary as an external store
// ---------------------------------------------------------------------------
//
// The account panel needs "what this browser holds", which can only be read in
// the browser. Reading it in an effect and calling setState is the obvious
// approach and the wrong one: it trips react-hooks/set-state-in-effect and
// renders one frame of stale UI. useSyncExternalStore handles both, provided
// the snapshot is REFERENTIALLY STABLE — recomputing the object on every call
// would loop forever — hence the cache below.

let summaryCache: LocalSummary | null = null;
const summaryListeners = new Set<() => void>();

export function getLocalSummary(): LocalSummary {
  if (!summaryCache) summaryCache = describePayload(collectLocal());
  return summaryCache;
}

/** Server render has no localStorage, so it reports nothing. */
export function getServerSummary(): LocalSummary | null {
  return null;
}

export function invalidateLocalSummary() {
  summaryCache = null;
  for (const cb of summaryListeners) cb();
}

export function subscribeLocalSummary(cb: () => void) {
  summaryListeners.add(cb);
  const onStorage = () => invalidateLocalSummary();
  window.addEventListener("storage", onStorage);
  return () => {
    summaryListeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
