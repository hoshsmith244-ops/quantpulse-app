import "server-only";

import YahooFinance from "yahoo-finance2";

import { dropInProgressBar } from "./bars";
import type { History } from "./symbols";
import type { Bar } from "./types";

/**
 * Market data from Yahoo Finance — the same endpoints the Python `yfinance`
 * package reads, accessed from TypeScript so the app stays on one runtime.
 *
 * Server-only: `yahoo-finance2` depends on `node:module` and cannot be bundled
 * for the browser. Shared types and the ticker list live in `symbols.ts`.
 */
const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  validation: { logErrors: false },
});

export class SymbolNotFound extends Error {
  constructor(symbol: string) {
    super(`No market data found for "${symbol}".`);
    this.name = "SymbolNotFound";
  }
}

/**
 * Daily OHLCV for the trailing `years`. Rows with a null close (Yahoo returns
 * these for halts and holidays) are dropped so downstream maths never sees a
 * gap it has to special-case.
 */
export async function fetchHistory(
  symbol: string,
  years = 3,
): Promise<History> {
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - years);

  let res;
  try {
    res = await yf.chart(symbol, {
      period1: period1.toISOString().slice(0, 10),
      interval: "1d",
    });
  } catch {
    throw new SymbolNotFound(symbol);
  }

  // A daily bar is a session in the VENUE's timezone, not the viewer's and not
  // UTC. Yahoo stamps US equity bars at 13:30 UTC (09:30 New York) and crypto
  // bars at 00:00 UTC, so slicing the UTC string happens to work for US stocks
  // and is wrong for anything whose session straddles midnight UTC — crypto
  // reads a day ahead for a US viewer, and Asian listings would misdate too.
  const exchangeTz = res.meta.exchangeTimezoneName || "UTC";
  const barDate = (d: Date) => {
    try {
      // en-CA renders as YYYY-MM-DD.
      return d.toLocaleDateString("en-CA", { timeZone: exchangeTz });
    } catch {
      return d.toISOString().slice(0, 10);
    }
  };

  const bars: Bar[] = res.quotes
    .filter(
      (q) =>
        q.close != null && q.open != null && q.high != null && q.low != null,
    )
    .map((q) => ({
      date: barDate(new Date(q.date)),
      open: q.open as number,
      high: q.high as number,
      low: q.low as number,
      close: q.close as number,
      volume: q.volume ?? 0,
    }));

  dropInProgressBar(bars, res.meta, exchangeTz);

  // Below roughly a year of bars the statistics are not worth reporting.
  if (bars.length < 260) throw new SymbolNotFound(symbol);

  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2] ?? last;

  return {
    quote: {
      symbol: res.meta.symbol ?? symbol,
      name: res.meta.longName ?? res.meta.shortName ?? symbol,
      currency: res.meta.currency ?? "USD",
      exchange: res.meta.fullExchangeName ?? res.meta.exchangeName ?? "",
      timezone: exchangeTz,
      price: last.close,
      changePct: ((last.close - prev.close) / prev.close) * 100,
    },
    bars,
  };
}
