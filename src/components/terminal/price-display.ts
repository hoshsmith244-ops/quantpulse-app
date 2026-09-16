"use client";

import type { History, MarketContext } from "@/lib/symbols";

const prettyDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * What to show in the price box.
 *
 * The daily bar series is the wrong source for this: Yahoo posts the day's
 * bar with a lag, and /api/history is cached for an hour, so `bars[last]`
 * can still be YESTERDAY's close while the market has since moved. The live
 * quote (cached 60s) is the accurate figure, so prefer it and fall back to the
 * bar only when the quote has not loaded — labelled for what it actually is,
 * never as "right now".
 *
 * The strategy itself is unaffected: it reads daily closes, and should.
 */
export function displayPrice(history: History, context: MarketContext | null) {
  const currency = history.quote.currency;

  if (context?.extended && (context.session === "pre" || context.session === "post")) {
    return {
      value: context.extended.price,
      changePct: context.extended.changePct,
      label: `${history.quote.symbol} · ${context.session === "pre" ? "pre-market" : "after hours"}`,
      changeLabel: "vs close",
      note: `Live ${context.session === "pre" ? "pre-market" : "after-hours"} price, updated every minute.`,
      currency,
      isLive: true,
    };
  }

  if (context?.regular) {
    const live = context.session === "regular";
    return {
      value: context.regular.price,
      changePct: context.regular.changePct,
      label: live
        ? `${history.quote.symbol} · live`
        : `${history.quote.symbol} · last close`,
      changeLabel: "today",
      note: live
        ? "Live price while the market is open, updated every minute."
        : "Most recent closing price. The market is closed.",
      currency,
      isLive: true,
    };
  }

  // Quote unavailable — say plainly that this is the last daily bar.
  const lastBar = history.bars[history.bars.length - 1];
  return {
    value: history.quote.price,
    changePct: history.quote.changePct,
    label: `${history.quote.symbol} · ${prettyDate(lastBar.date)} close`,
    changeLabel: "on the day",
    note: "Live quote unavailable, so this is the last completed daily bar.",
    currency,
    isLive: false,
  };
}
