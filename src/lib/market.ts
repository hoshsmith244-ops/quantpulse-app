import "server-only";

import YahooFinance from "yahoo-finance2";

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

  const bars: Bar[] = res.quotes
    .filter(
      (q) =>
        q.close != null && q.open != null && q.high != null && q.low != null,
    )
    .map((q) => ({
      date: new Date(q.date).toISOString().slice(0, 10),
      open: q.open as number,
      high: q.high as number,
      low: q.low as number,
      close: q.close as number,
      volume: q.volume ?? 0,
    }));

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
      price: last.close,
      changePct: ((last.close - prev.close) / prev.close) * 100,
    },
    bars,
  };
}
