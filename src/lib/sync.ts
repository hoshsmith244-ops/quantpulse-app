"use client";

import { APPEARANCE_KEY, sanitiseAppearance, type Appearance } from "./appearance";
import type { SignalEvent } from "./notifications";
import type { WatchEntry } from "./watchlist";

/**
 * What syncs between devices, and how conflicts are settled.
 *
 * The rule that matters: COLLECTIONS MERGE, PREFERENCES TAKE THE NEWER SIDE.
 * A naive last-write-wins would silently delete watchlist entries added on the
 * other device, which is the one outcome a sync feature must never produce.
 *
 * Deliberately NOT synced — the per-device scan bookkeeping in
 * `qp:signal-state`, `qp:pending-alerts` and `qp:last-check`. Those record what
 * a given browser has already seen, and copying them across would either
 * suppress alerts a second device should raise or replay ones already handled.
 * A new device starting with none of it records its baselines silently, which
 * is exactly the desired behaviour.
 */

export const SYNC_VERSION = 1;

/** Storage keys owned elsewhere; duplicated here so sync stays one module. */
export const KEYS = {
  appearance: APPEARANCE_KEY,
  mode: "qp:mode",
  params: "qp:params",
  watchlist: "qp:watchlist",
  notifyPrefs: "qp:notify-prefs",
  notifications: "qp:notifications",
} as const;

export type SyncPayload = {
  version: number;
  /** epoch ms of the last local change */
  updatedAt: number;
  appearance: Appearance | null;
  mode: string | null;
  params: unknown | null;
  watchlist: WatchEntry[];
  notifyPrefs: unknown | null;
  notifications: SignalEvent[];
};

const MAX_EVENTS = 60;

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

const entryKey = (e: WatchEntry) => `${e.symbol}:${e.factor}`;

/**
 * Union of two watchlists.
 *
 * Union rather than newest-wins because losing a ticker someone chose to watch
 * is a far worse failure than carrying an extra one they can remove in a click.
 * Ties keep the earlier addedAt so the list stays in the order it was built.
 */
function mergeWatchlists(a: WatchEntry[], b: WatchEntry[]): WatchEntry[] {
  const out = new Map<string, WatchEntry>();
  for (const e of [...a, ...b]) {
    if (!e || typeof e.symbol !== "string") continue;
    const k = entryKey(e);
    const seen = out.get(k);
    if (!seen || (e.addedAt ?? 0) < (seen.addedAt ?? 0)) out.set(k, e);
  }
  return [...out.values()].sort((x, y) => (x.addedAt ?? 0) - (y.addedAt ?? 0));
}

/**
 * Union of two notification lists, deduped by event id.
 *
 * Read state is sticky: an event read on any device counts as read everywhere,
 * because the alternative is an unread badge that will not clear.
 */
function mergeNotifications(a: SignalEvent[], b: SignalEvent[]): SignalEvent[] {
  const out = new Map<string, SignalEvent>();
  for (const e of [...a, ...b]) {
    if (!e || typeof e.id !== "string") continue;
    const seen = out.get(e.id);
    out.set(e.id, seen ? { ...seen, read: seen.read || e.read } : e);
  }
  return [...out.values()].sort((x, y) => y.at - x.at).slice(0, MAX_EVENTS);
}

/**
 * Combines this device's state with the stored one.
 *
 * Collections union; singular preferences come from whichever side was touched
 * more recently.
 */
export function mergePayloads(
  local: SyncPayload,
  remote: SyncPayload | null,
): SyncPayload {
  if (!remote) return local;

  const remoteIsNewer = (remote.updatedAt ?? 0) > (local.updatedAt ?? 0);
  const preferred = remoteIsNewer ? remote : local;
  const other = remoteIsNewer ? local : remote;

  const pick = <K extends keyof SyncPayload>(k: K) =>
    (preferred[k] ?? other[k]) as SyncPayload[K];

  return {
    version: SYNC_VERSION,
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
    appearance: pick("appearance"),
    mode: pick("mode"),
    params: pick("params"),
    notifyPrefs: pick("notifyPrefs"),
    watchlist: mergeWatchlists(local.watchlist ?? [], remote.watchlist ?? []),
    notifications: mergeNotifications(
      local.notifications ?? [],
      remote.notifications ?? [],
    ),
  };
}

export type LocalSummary = {
  watched: number;
  events: number;
  unread: number;
  themed: boolean;
};

/** Human summary for the account panel. */
export function describePayload(p: SyncPayload): LocalSummary {
  const unread = (p.notifications ?? []).filter((e) => !e.read).length;
  return {
    watched: (p.watchlist ?? []).length,
    events: (p.notifications ?? []).length,
    unread,
    themed: Boolean(p.appearance),
  };
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
