"use client";

import * as React from "react";

import { actionWindow, decideAlert } from "./action-window";
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
const PENDING_KEY = "qp:pending-alerts";
const NEXT_DELAY_KEY = "qp:next-delay";
const WINDOW_LOG_KEY = "qp:window-log";

/** Resting cadence, well away from any close. */
export const CHECK_INTERVAL_MS = 15 * 60 * 1000;
/** Inside the pre-close window, where a flip has to be caught quickly. */
export const ACTION_INTERVAL_MS = 2 * 60 * 1000;
/** Approaching a close: tighten up so the window is not slept through. */
export const APPROACH_INTERVAL_MS = 5 * 60 * 1000;
/** How far out to start tightening, in minutes before the close. */
const APPROACH_MIN = 45;

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
   * True for a pre-close alert: the rule WOULD trigger if today closed now,
   * and there is still time to send an on-close order. This is the actionable
   * one — the settled event arrives after the close, by which time that price
   * is gone.
   */
  provisional?: boolean;
  /**
   * True for a stand-down: a provisional alert was sent earlier in the window
   * and the rule no longer triggers.
   *
   * This is not a nicety. Alerting "buy at the close" and then going silent
   * when the reason evaporates would make the system actively cause wrong
   * trades — worse than sending no alert at all.
   */
  cancelled?: boolean;
  /** Minutes left to place an on-close order when the alert was raised. */
  minutesLeft?: number;
};

type SignalState = Record<string, { state: "in" | "out"; since: string }>;

/** What we have already told the user to do today, so we can take it back. */
type PendingAlerts = Record<string, { date: string; dir: "in" | "out" }>;

/**
 * Proof that the pre-close window was actually evaluated today.
 *
 * Silence from an alerting system has three possible meanings — the rule said
 * no, nobody ever asked it, or something is broken — and they are
 * indistinguishable without a record like this. That ambiguity is not
 * hypothetical: a scan returning zero signals across 54 pairs was read as a
 * quiet day when in fact alerts could not fire at all.
 *
 * Deliberately NOT a notification. Most days nothing triggers, so a daily
 * "nothing happened" push would be the bulk of all notifications and would
 * train people to ignore the bell. This is a status the app can show when
 * asked, which is a different thing.
 */
export type WindowLog = {
  /** Venue date the window belonged to. */
  date: string;
  /** Checks performed inside the action window today. */
  checks: number;
  /** Alerts raised today, so "checked and quiet" reads differently to "fired". */
  fired: number;
  firstCheckAt: number | null;
  lastCheckAt: number | null;
};

/**
 * Cached because useSyncExternalStore demands a referentially stable snapshot.
 * JSON.parse hands back a fresh object every call, which React sees as a new
 * value on every render and loops until it gives up with "Maximum update depth
 * exceeded". The same reason the events list is cached.
 */
let cachedWindowLog: WindowLog | null | undefined;

export function getWindowLog(): WindowLog | null {
  if (cachedWindowLog !== undefined) return cachedWindowLog;
  const log = readJson<WindowLog | null>(WINDOW_LOG_KEY, null);
  cachedWindowLog = log && typeof log.date === "string" ? log : null;
  return cachedWindowLog;
}

function commitWindowLog(next: WindowLog) {
  cachedWindowLog = next;
  writeJson(WINDOW_LOG_KEY, next);
  notify();
}

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
    } else if (e.key === WINDOW_LOG_KEY) {
      cachedWindowLog = undefined;
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
  if (entries.length === 0) {
    writeJson(NEXT_DELAY_KEY, CHECK_INTERVAL_MS);
    return [];
  }

  const previous = readJson<SignalState>(STATE_KEY, {});
  const pendingBefore = readJson<PendingAlerts>(PENDING_KEY, {});
  const isFirstRun = Object.keys(previous).length === 0;
  const nextState: SignalState = {};
  const nextPending: PendingAlerts = {};
  const fresh: SignalEvent[] = [];
  /** Tightest polling cadence any watched name asked for this pass. */
  let soonest = CHECK_INTERVAL_MS;
  /** Whether this pass actually evaluated anything inside the action window. */
  let sawWindow = false;
  let windowDate = "";

  // Six at a time, matching the watchlist scan.
  const queue = [...entries];
  const worker = async () => {
    for (;;) {
      const entry = queue.shift();
      if (!entry) return;

      const k = keyOf(entry);

      const [history, context] = await Promise.all([
        loadHistory(entry.symbol),
        loadContext(entry.symbol),
      ]);

      if (!history) {
        // Carry the last known state forward. The store is rewritten whole, so
        // simply skipping would erase what we knew about this ticker, and the
        // next successful check would treat it as newly added — silently
        // swallowing a real entry or exit as a "first observation".
        const prior = previous[k];
        if (prior) nextState[k] = prior;
        const priorPending = pendingBefore[k];
        if (priorPending) nextPending[k] = priorPending;
        continue;
      }

      const result = analyse(history.bars, entry.factor, entry.param, 5);
      const { signal, trades } = result;

      const lastClosed = [...trades]
        .reverse()
        .find((t) => t.exitDate !== null);
      const since =
        signal.state === "in"
          ? (signal.entryDate ?? "")
          : (lastClosed?.exitDate ?? "");

      nextState[k] = { state: signal.state, since };

      // --- The pre-close window ------------------------------------------
      //
      // Alerts fire ONLY inside it. Earlier in the session a provisional
      // close is a guess about hours of trading still to come, and alerting
      // on it teaches people to act on noise; later, on-close orders are no
      // longer accepted, so there is nothing useful left to say.
      const win = actionWindow(context ?? null);
      const livePrice = context?.regular?.price;

      // Record that the window was genuinely evaluated, so a quiet day can be
      // told apart from a day the app was never open for.
      if (win.actionable) {
        windowDate = history.bars[history.bars.length - 1]?.date ?? windowDate;
        sawWindow = true;
      }

      // Keep the fastest cadence any watched name needs.
      if (win.phase === "action" || win.phase === "final") {
        soonest = Math.min(soonest, ACTION_INTERVAL_MS);
      } else if (
        win.phase === "early" &&
        win.minutesToClose !== null &&
        win.minutesToClose <= APPROACH_MIN
      ) {
        soonest = Math.min(soonest, APPROACH_INTERVAL_MS);
      }

      const priorAlert = pendingBefore[k];

      if (win.actionable && livePrice) {
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

        const today = provisionalBars[provisionalBars.length - 1].date;
        const decision = decideAlert({
          actionable: true,
          changing: provisional !== signal.state,
          provisional,
          today,
          prior: priorAlert ?? null,
        });

        if (decision.pending) nextPending[k] = decision.pending;

        if (decision.emit) {
          const cancelled = decision.emit === "stand-down";
          // A stand-down reports the direction being withdrawn, which is the
          // prior instruction, not the current (unchanged) reading.
          const dir = cancelled ? (priorAlert?.dir ?? provisional) : provisional;

          fresh.push({
            id: `${k}:${cancelled ? "standdown" : "act"}-${dir}:${today}`,
            symbol: entry.symbol,
            factor: entry.factor,
            kind: dir === "in" ? "entry" : "exit",
            date: today,
            price: livePrice,
            at: Date.now(),
            read: false,
            provisional: true,
            ...(cancelled ? { cancelled: true } : {}),
            minutesLeft: Math.round(win.minutesToCutoff ?? 0),
          });
        }
      } else {
        // Outside the window nothing is re-evaluated, but today's instruction
        // is remembered so a later check can still stand it down.
        const decision = decideAlert({
          actionable: false,
          changing: false,
          provisional: signal.state,
          today: history.bars[history.bars.length - 1].date,
          prior: priorAlert ?? null,
        });
        if (decision.pending) nextPending[k] = decision.pending;
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

  if (sawWindow) {
    const now = Date.now();
    const prior = getWindowLog();
    // A new venue date starts a fresh log; yesterday's count would otherwise
    // read as today's evidence.
    const carry = prior && prior.date === windowDate ? prior : null;
    commitWindowLog({
      date: windowDate,
      checks: (carry?.checks ?? 0) + 1,
      fired: (carry?.fired ?? 0) + fresh.length,
      firstCheckAt: carry?.firstCheckAt ?? now,
      lastCheckAt: now,
    });
  }

  writeJson(STATE_KEY, nextState);
  writeJson(PENDING_KEY, nextPending);
  writeJson(NEXT_DELAY_KEY, soonest);
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

/**
 * How long to wait before the next scan.
 *
 * Set by the previous scan from what it saw: a flat fifteen minutes would
 * comfortably sleep through a ten-minute action window, which is the one
 * stretch of the day the alerts exist for.
 */
export function nextDelayMs(): number {
  const v = readJson<number>(NEXT_DELAY_KEY, CHECK_INTERVAL_MS);
  return Number.isFinite(v)
    ? Math.min(CHECK_INTERVAL_MS, Math.max(ACTION_INTERVAL_MS, v))
    : CHECK_INTERVAL_MS;
}

export function shouldCheck(): boolean {
  const last = readJson<number>(LAST_CHECK_KEY, 0);
  return Date.now() - last > nextDelayMs();
}

/**
 * Watchlist entries with no recorded state yet.
 *
 * A ticker cannot be compared against anything until its first scan, so one
 * that is added and never scanned is invisible: the next scan records it as a
 * baseline and says nothing, swallowing whatever the rule did in between. The
 * scan is throttled globally, so adding a ticker just after a scan could leave
 * it unrecorded for the next quarter hour — long enough to close the tab and
 * lose a day's signal.
 */
export function unseenEntries(entries: WatchEntry[]): WatchEntry[] {
  const previous = readJson<SignalState>(STATE_KEY, {});
  return entries.filter((e) => !(keyOf(e) in previous));
}

function maybeShowBrowserNotification(events: SignalEvent[]) {
  if (!getPrefs().browser) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  /**
   * Only a pre-close alert may read as an instruction.
   *
   * A settled event is a record of a bar that has already closed — often read
   * hours later, in the evening. Titling it "entry signal" makes it look like
   * a live prompt to go and buy something at a price that no longer exists,
   * which is the single most harmful thing this app could say.
   */
  const line = (e: SignalEvent) => {
    const name = getFactor(e.factor).name.toLowerCase();
    if (e.cancelled) {
      return `${e.symbol}: stand down — ${name} no longer triggers`;
    }
    if (e.provisional) {
      const verb = e.kind === "entry" ? "BUY" : "SELL";
      return `${e.symbol}: ${verb} at the close — ${e.minutesLeft ?? 0}m left to order`;
    }
    const verb = e.kind === "entry" ? "entered" : "exited";
    return `${e.symbol}: ${name} ${verb} on the ${e.date} close — already settled`;
  };

  // Cancellations lead: they are the time-critical ones, because the user may
  // be part-way through placing the trade being taken back.
  const ordered = [...events].sort(
    (a, b) => Number(!!b.cancelled) - Number(!!a.cancelled),
  );
  const first = ordered[0];

  const title =
    ordered.length > 1
      ? `${ordered.length} signal changes`
      : first.cancelled
        ? `${first.symbol} — stand down`
        : first.provisional
          ? `${first.symbol} — act before the close`
          : // Past tense and a state, never a verb that sounds like a command.
            `${first.symbol} — ${first.kind === "entry" ? "now holding" : "now flat"} (settled)`;

  const body = ordered.slice(0, 4).map(line).join("\n");

  try {
    // Untagged when time-critical, so a stand-down cannot silently replace the
    // alert it contradicts before the user has read either one.
    new Notification(title, {
      body,
      tag: ordered.some((e) => e.provisional) ? undefined : "qp-signals",
      requireInteraction: ordered.some((e) => e.cancelled),
    });
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
