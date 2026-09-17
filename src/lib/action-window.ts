import type { MarketContext } from "./symbols";

/**
 * The pre-close action window — the "3:40 system".
 *
 * The strategy reads the daily CLOSE, which creates a timing problem: by the
 * time the close exists, that price is gone. The backtest fills at the close of
 * the signal day, so the only way to take the trade it measured is to decide
 * shortly BEFORE the bell and send a market-on-close order.
 *
 * That gives a narrow window, bounded at both ends:
 *
 *   - Too early and the reading is worthless. A provisional close computed at
 *     10am is a guess about six more hours of trading. Alerting then trains
 *     people to act on noise.
 *   - Too late and you cannot trade it. NYSE and Nasdaq stop accepting new
 *     market-on-close and limit-on-close orders TEN MINUTES before the bell
 *     (3:50pm ET for a 4:00pm close). After that the order is rejected, so
 *     advising one would be advising a trade that cannot happen.
 *
 * Everything here is measured against the venue's own closing time rather than
 * an assumed 16:00, so London (16:30) and half-day holiday closes work without
 * special cases.
 *
 * Note that these are EXCHANGE cutoffs. Brokers routinely impose earlier ones,
 * and some retail brokers do not offer on-close orders at all, which the UI
 * says rather than assuming.
 */

/** Minutes before the close when the window opens. 20 → 3:40pm in New York. */
export const ACTION_LEAD_MIN = 20;
/** Minutes before the close when on-close orders stop being accepted. */
export const MOC_CUTOFF_MIN = 10;

export type WindowPhase =
  /** Market shut, or the close has already happened. Nothing to act on. */
  | "closed"
  /** Open, but too far from the close for a provisional reading to mean much. */
  | "early"
  /** The window. A signal here can still be taken at the closing price. */
  | "action"
  /** Past the on-close cutoff but before the bell. Too late for an MOC order. */
  | "final"
  /** Crypto. There is no bell, so none of this applies. */
  | "always-open";

export type ActionWindow = {
  phase: WindowPhase;
  /** Minutes until the close; null when there is no meaningful close. */
  minutesToClose: number | null;
  /** Minutes until on-close orders stop being accepted, floored at 0. */
  minutesToCutoff: number | null;
  closeAt: number | null;
  /** True only in the phase where an alert is worth sending. */
  actionable: boolean;
};

const CLOSED: ActionWindow = {
  phase: "closed",
  minutesToClose: null,
  minutesToCutoff: null,
  closeAt: null,
  actionable: false,
};

export function actionWindow(
  context: MarketContext | null,
  now: number = Date.now(),
): ActionWindow {
  if (!context) return CLOSED;

  if (context.alwaysOpen) {
    return {
      phase: "always-open",
      minutesToClose: null,
      minutesToCutoff: null,
      closeAt: context.regularEnd,
      actionable: false,
    };
  }

  // Only the regular session leads to a close that can be traded. Pre-market
  // is many hours out; post-market is after the fact.
  if (context.session !== "regular" || context.regularEnd === null) {
    return CLOSED;
  }

  const msToClose = context.regularEnd - now;
  if (msToClose <= 0) return CLOSED;

  const minutesToClose = msToClose / 60_000;
  const minutesToCutoff = Math.max(0, minutesToClose - MOC_CUTOFF_MIN);

  const phase: WindowPhase =
    minutesToClose > ACTION_LEAD_MIN
      ? "early"
      : minutesToClose > MOC_CUTOFF_MIN
        ? "action"
        : "final";

  return {
    phase,
    minutesToClose,
    minutesToCutoff,
    closeAt: context.regularEnd,
    actionable: phase === "action",
  };
}

/** "18m" / "1h 20m" / "under a minute" */
export function fmtCountdown(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return "under a minute";
  const m = Math.floor(minutes);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Local clock time at the venue, e.g. "3:40 PM". */
export function venueTime(at: number | null, timezone: string): string {
  if (at === null) return "—";
  try {
    return new Date(at).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || undefined,
    });
  } catch {
    return new Date(at).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
}

/** When the window opens and when on-close orders stop, as venue clock times. */
export function windowTimes(w: ActionWindow, timezone: string) {
  if (w.closeAt === null) return { opens: "—", cutoff: "—", close: "—" };
  return {
    opens: venueTime(w.closeAt - ACTION_LEAD_MIN * 60_000, timezone),
    cutoff: venueTime(w.closeAt - MOC_CUTOFF_MIN * 60_000, timezone),
    close: venueTime(w.closeAt, timezone),
  };
}

/**
 * A ticking `now`, for the countdown.
 *
 * Deliberately coarse: the window is twenty minutes wide and the copy is
 * phrased in whole minutes, so a second-by-second timer would repaint 30x more
 * often to display the same string.
 */
export const TICK_MS = 15_000;

// ---------------------------------------------------------------------------
// Alert state machine
// ---------------------------------------------------------------------------

export type AlertDecision = {
  /** What to tell the user, if anything. */
  emit: "act" | "stand-down" | null;
  /** The instruction that stands after this decision, or null if none does. */
  pending: { date: string; dir: "in" | "out" } | null;
};

/**
 * The pre-close alert state machine, kept pure so it can be tested without a
 * market being open.
 *
 * Four things have to hold, and the fourth is the one that is easy to miss:
 *
 *   1. Outside the window, say nothing — but remember any instruction already
 *      given today, so a later pass can still withdraw it.
 *   2. Inside the window, a flip that has not been announced gets one alert.
 *   3. Repeating the same flip on the next pass says nothing. The alert fires
 *      once, not every two minutes for twenty minutes.
 *   4. If an announced flip stops holding, withdraw it. Going quiet instead
 *      would leave the user acting on an instruction the rule has abandoned,
 *      which is worse than never having alerted at all.
 */
export function decideAlert(args: {
  actionable: boolean;
  /** The provisional state differs from the settled one. */
  changing: boolean;
  provisional: "in" | "out";
  today: string;
  /** Any instruction already given, for any day. */
  prior: { date: string; dir: "in" | "out" } | null;
}): AlertDecision {
  const { actionable, changing, provisional, today, prior } = args;
  const openToday = prior && prior.date === today ? prior : null;

  if (!actionable) {
    // Stale instructions from previous days are dropped; today's is kept so it
    // can still be stood down.
    return { emit: null, pending: openToday };
  }

  if (changing) {
    // A reversal within the window counts as a new instruction.
    if (openToday?.dir === provisional) return { emit: null, pending: openToday };
    return { emit: "act", pending: { date: today, dir: provisional } };
  }

  if (openToday) return { emit: "stand-down", pending: null };

  return { emit: null, pending: null };
}
