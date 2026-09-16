import type { Bar } from "./types";

/**
 * Builds the bar series as it would look if today closed at the live price.
 *
 * Shared by the pre-close panel and the notification check so both answer the
 * same question the same way.
 */

/** Today's date in the venue's timezone, matching how bars are dated. */
export function todayIn(tz: string) {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: tz });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Replaces today's in-progress bar with the live price, or appends one if the
 * provider has not opened today's bar yet.
 */
export function withProvisionalClose(
  bars: Bar[],
  livePrice: number,
  tz: string,
): Bar[] {
  const today = todayIn(tz);
  const last = bars[bars.length - 1];
  if (!last) return bars;

  if (last.date === today) {
    return [
      ...bars.slice(0, -1),
      {
        ...last,
        close: livePrice,
        high: Math.max(last.high, livePrice),
        low: Math.min(last.low, livePrice),
      },
    ];
  }

  return [
    ...bars,
    {
      date: today,
      open: livePrice,
      high: livePrice,
      low: livePrice,
      close: livePrice,
      volume: 0,
    },
  ];
}
