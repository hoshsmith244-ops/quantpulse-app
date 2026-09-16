"use client";

import * as React from "react";

import { analyse, getFactor, type FactorId } from "./alpha";
import { withProvisionalClose } from "./provisional";
import type { History, MarketContext } from "./symbols";
import type { WatchEntry } from "./watchlist";

/**
 * Signal-change notifications.
 *
 * The app has no server, no account and no scheduler, so this cannot reach you
 * when the app is closed. What it does instead: remember the last signal state
 * seen for every watchlist entry, and on each check report what changed. That
 * is genuinely useful because the signals only move on a daily bar close —
 * roughly once a day — so a missed minute costs nothing.
 *
 * Browser notifications are opt-in and only fire while a tab is open. Real
 * push while closed needs a server, an account and a scheduled job.
 */

const STATE_KEY = "qp:signal-state";
const EVENTS_KEY = "qp:notifications";
const PREFS_KEY = "qp:notify-prefs";
const LAST_CHECK_KEY = "qp:last-check";

/** Don't re-scan more often than this when moving around the app. */
export const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const MAX_EVENTS = 60;

export type SignalEvent = {
  id: string;
  symbol: string;
  factor: FactorId;
  kind: "entry" | "exit";
  /** the bar date the change happened on */
  date: string;
  price: number;
  /** realised result, present on exits */
  returnPct?: number;
  /** when we noticed, epoch ms */
  at: number;
  read: boolean;
  /**
   * True for a pre-close alert: the rule WOULD trigger if today closed now.
   * This is the actionable one — the settled event arrives after the close,
   * by which time that price is gone.
   */
  provisional?: boolean;
};

type SignalState = Record<string, { state: "in" | "out"; since: string }>;

const listeners = new Set<() => void>();
let cachedEvents: SignalEvent[] | null = null;

function notify() {
  for (const cb of listeners) cb();
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable; the session still works, it just will not persist.
  }
}

function readEvents(): SignalEvent[] {
  if (cachedEvents) return cachedEvents;
  const raw = readJson<SignalEvent[]>(EVENTS_KEY, []);
  cachedEvents = Array.isArray(raw) ? raw.slice(0, MAX_EVENTS) : [];
  return cachedEvents;
}

const EMPTY: SignalEvent[] = [];

export function subscribeStore(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === EVENTS_KEY) {
      cachedEvents = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function commitEvents(next: SignalEvent[]) {
  cachedEvents = next.slice(0, MAX_EVENTS);
  writeJson(EVENTS_KEY, cachedEvents);
  notify();
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export type NotifyPrefs = { browser: boolean };

export function getPrefs(): NotifyPrefs {
  return readJson<NotifyPrefs>(PREFS_KEY, { browser: false });
}

export function setPrefs(p: NotifyPrefs) {
  writeJson(PREFS_KEY, p);
  notify();
}

/** Current browser permission, or "default" on the server. */
export function getPermission(): NotificationPermission | "default" {
  if (typeof Notification === "undefined") return "default";
  return Notification.permission;
}

/** Nudges subscribers after an out-of-band change, e.g. a permission prompt. */
export function refreshStore() {
  notify();
}

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------

/** Per-entry key; the same ticker can appear under two strategies. */
const keyOf = (e: { symbol: string; factor: FactorId }) =>
  `${e.symbol}:${e.factor}`;

async function loadContext(symbol: string): Promise<MarketContext | null> {
  try {
    const res = await fetch(`/api/context?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) return null;
    return (await res.json()) as MarketContext;
  } catch {
    return null;
  }
}

async function loadHistory(symbol: string): Promise<History | null> {
  try {
    const res = await fetch(`/api/history?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) return null;
    return (await res.json()) as History;
  } catch {
    return null;
  }
}

/**
 * Scans the watchlist and records anything that changed since last time.
 *
 * The first run on a fresh list records the current state silently — a
 * position that has been open for three weeks is not news, and announcing it
 * as if it just happened would be a lie.
 */
export async function checkSignals(
  entries: WatchEntry[],
): Promise<SignalEvent[]> {
  if (entries.length === 0) return [];

  const previous = readJson<SignalState>(STATE_KEY, {});
  const isFirstRun = Object.keys(previous).length === 0;
  const nextState: SignalState = {};
  const fresh: SignalEvent[] = [];

  // Six at a time, matching the watchlist scan.
  const queue = [...entries];
  const worker = async () => {
    for (;;) {
      const entry = queue.shift();
      if (!entry) return;

      const [history, context] = await Promise.all([
        loadHistory(entry.symbol),
        loadContext(entry.symbol),
      ]);
      if (!history) continue;

      const result = analyse(history.bars, entry.factor, entry.param, 5);
      const { signal, trades } = result;
      const k = keyOf(entry);

      const lastClosed = [...trades]
        .reverse()
        .find((t) => t.exitDate !== null);
      const since =
        signal.state === "in"
          ? (signal.entryDate ?? "")
          : (lastClosed?.exitDate ?? "");

      nextState[k] = { state: signal.state, since };

      // Pre-close alert. While the session is still open, re-run the rule with
      // the live price standing in for today's close: if it would flip, there
      // is still time to act at the price the backtest assumes. Keyed by the
      // day so it fires once, not every fifteen minutes.
      const livePrice = context?.regular?.price;
      const openNow =
        context?.session === "regular" || context?.session === "pre";

      if (openNow && livePrice) {
        const provisionalBars = withProvisionalClose(
          history.bars,
          livePrice,
          history.quote.timezone,
        );
        const provisional = analyse(
          provisionalBars,
          entry.factor,
          entry.param,
          5,
        ).signal.state;

        if (provisional !== signal.state) {
          const today = provisionalBars[provisionalBars.length - 1].date;
          fresh.push({
            id: `${k}:pending-${provisional}:${today}`,
            symbol: entry.symbol,
            factor: entry.factor,
            kind: provisional === "in" ? "entry" : "exit",
            date: today,
            price: livePrice,
            at: Date.now(),
            read: false,
            provisional: true,
          });
        }
      }

      const before = previous[k];
      // Only a genuine transition counts, and only one we have not already
      // recorded for that same bar date.
      if (
        !isFirstRun &&
        before &&
        (before.state !== signal.state || before.since !== since)
      ) {
        if (signal.state === "in" && signal.entryDate && signal.entryPrice) {
          fresh.push({
            id: `${k}:entry:${signal.entryDate}`,
            symbol: entry.symbol,
            factor: entry.factor,
            kind: "entry",
            date: signal.entryDate,
            price: signal.entryPrice,
            at: Date.now(),
            read: false,
          });
        } else if (signal.state === "out" && lastClosed?.exitDate) {
          fresh.push({
            id: `${k}:exit:${lastClosed.exitDate}`,
            symbol: entry.symbol,
            factor: entry.factor,
            kind: "exit",
            date: lastClosed.exitDate,
            price: lastClosed.exitPrice ?? 0,
            returnPct: lastClosed.returnPct,
            at: Date.now(),
            read: false,
          });
        }
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(6, entries.length) }, worker));

  writeJson(STATE_KEY, nextState);
  writeJson(LAST_CHECK_KEY, Date.now());

  if (fresh.length) {
    const existing = readEvents();
    const seen = new Set(existing.map((e) => e.id));
    const added = fresh.filter((e) => !seen.has(e.id));
    if (added.length) {
      commitEvents([...added, ...existing]);
      maybeShowBrowserNotification(added);
      return added;
    }
  }

  notify();
  return [];
}

export function shouldCheck(): boolean {
  const last = readJson<number>(LAST_CHECK_KEY, 0);
  return Date.now() - last > CHECK_INTERVAL_MS;
}

function maybeShowBrowserNotification(events: SignalEvent[]) {
  if (!getPrefs().browser) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  // One combined notification rather than a burst of them.
  const title =
    events.length === 1
      ? `${events[0].symbol} — ${events[0].kind === "entry" ? "entry signal" : "exit signal"}`
      : `${events.length} signal changes`;

  const body = events
    .slice(0, 4)
    .map(
      (e) =>
        `${e.symbol}: ${e.kind === "entry" ? "entered" : "exited"} ${getFactor(e.factor).name.toLowerCase()}`,
    )
    .join("\n");

  try {
    new Notification(title, { body, tag: "qp-signals" });
  } catch {
    // Some browsers require a service worker; failing silently is fine.
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotifications() {
  const events = React.useSyncExternalStore(
    subscribeStore,
    readEvents,
    () => EMPTY,
  );

  const unread = events.filter((e) => !e.read).length;

  const markAllRead = React.useCallback(() => {
    commitEvents(readEvents().map((e) => ({ ...e, read: true })));
  }, []);

  const clearAll = React.useCallback(() => commitEvents([]), []);

  return { events, unread, markAllRead, clearAll };
}
