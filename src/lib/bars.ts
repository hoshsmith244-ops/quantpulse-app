import type { Bar } from "./types";

/**
 * Bar hygiene, shared by the live fetch and the offline screener build.
 *
 * Imports nothing at runtime so `scripts/*.mts` can use it directly under
 * Node's type stripping — which matters, because the screener builder made the
 * exact mistake this file exists to prevent.
 */

export function toMs(v: unknown): number | null {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  if (typeof v === "number") return v > 1e11 ? v : v * 1000;
  return null;
}

/** Today's date in the venue's timezone, matching how bars are dated. */
export function todayAtVenue(exchangeTz: string): string {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: exchangeTz });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Removes the bar for a session that has not finished yet.
 *
 * Yahoo reports the CURRENT session as a daily row whose `close` is simply the
 * latest trade. It is indistinguishable in shape from a finished bar, and every
 * strategy here is defined on the daily CLOSE — so leaving it in means treating
 * an intraday price as a settled close.
 *
 * That is not cosmetic. It fabricates entries and exits that never happened: a
 * rule reads "entered today" at 2pm and the entry evaporates when the real
 * close lands elsewhere. It also disables pre-close alerting entirely, because
 * the settled signal already contains today's live price, so the provisional
 * re-run can never differ from it.
 *
 * The venue's own session end decides: while the market is open, today's row is
 * in progress and goes; after the bell it is a real close and stays. Crypto
 * reports a ~24h session, so its current day is always in progress — correct,
 * since that bar only settles at midnight UTC.
 *
 * Mutates in place; returns the same array for convenience.
 */
export function dropInProgressBar(
  bars: Bar[],
  meta: { currentTradingPeriod?: { regular?: { end?: unknown } } } | undefined,
  exchangeTz: string,
  now: number = Date.now(),
): Bar[] {
  const sessionEnd = toMs(meta?.currentTradingPeriod?.regular?.end);

  // Without a session end there is no way to tell an in-progress bar from a
  // settled one, so drop today's either way: being a day behind is a far
  // cheaper error than inventing a close.
  const stillOpen = sessionEnd === null || now < sessionEnd;
  if (!stillOpen) return bars;

  const today = todayAtVenue(exchangeTz);
  while (bars.length > 0 && bars[bars.length - 1].date >= today) bars.pop();
  return bars;
}
