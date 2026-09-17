import type { Appearance } from "./appearance";
import type { SignalEvent } from "./notifications";
import type { WatchEntry } from "./watchlist";

/**
 * How two devices' state is reconciled.
 *
 * Split out from sync.ts, which owns the localStorage side, for one reason:
 * this file imports nothing at runtime, so it can be driven directly by
 * scripts/check-sync.mts. The rules below are the only thing standing between
 * a user and a silently deleted watchlist, and "it looked right" is not an
 * acceptable standard for that.
 *
 * THE RULE: collections merge, singular preferences take the newer side.
 *
 * A plain last-write-wins would delete entries added on the other device, which
 * is the one outcome a sync feature must never produce. Carrying an extra
 * ticker someone can remove in a click is a trivial failure; losing one they
 * chose to watch is not.
 */

export const SYNC_VERSION = 1;

/** Cap on stored events, matching the notification store. */
export const MAX_EVENTS = 60;

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

const entryKey = (e: WatchEntry) => `${e.symbol}:${e.factor}`;

/**
 * Union of two watchlists.
 *
 * Ties keep the EARLIER addedAt so the list stays in the order it was built,
 * and so re-adding a ticker does not reshuffle it to the end.
 */
export function mergeWatchlists(
  a: WatchEntry[],
  b: WatchEntry[],
): WatchEntry[] {
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
 * Read state is sticky: read on any device counts as read everywhere, because
 * the alternative is an unread badge that cannot be cleared.
 */
export function mergeNotifications(
  a: SignalEvent[],
  b: SignalEvent[],
): SignalEvent[] {
  const out = new Map<string, SignalEvent>();
  for (const e of [...a, ...b]) {
    if (!e || typeof e.id !== "string") continue;
    const seen = out.get(e.id);
    out.set(e.id, seen ? { ...seen, read: seen.read || e.read } : e);
  }
  return [...out.values()].sort((x, y) => y.at - x.at).slice(0, MAX_EVENTS);
}

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

export function describePayload(p: SyncPayload): LocalSummary {
  return {
    watched: (p.watchlist ?? []).length,
    events: (p.notifications ?? []).length,
    unread: (p.notifications ?? []).filter((e) => !e.read).length,
    themed: Boolean(p.appearance),
  };
}
