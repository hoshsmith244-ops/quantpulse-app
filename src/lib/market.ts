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

function toMs(v: unknown): number | null {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  if (typeof v === "number") return v > 1e11 ? v : v * 1000;
  return null;
}

/**
 * Removes the bar for a session that has not finished yet.
 *
 * Yahoo reports the CURRENT session as a daily row whose `close` is simply the
 * latest trade. It is indistinguishable in shape from a finished bar, and every
 * strategy here is defined on the daily CLOSE — so leaving it in means the
 * whole app silently treats an intraday price as a settled close.
 *
 * That is not cosmetic. It fabricates entries and exits that never happened:
 * a rule reads "entered today" at 2pm, and the entry evaporates when the real
 * close lands somewhere else. It also disabled the pre-close alerts entirely,
 * because the "settled" signal already contained today's live price, so the
 * provisional re-run could never differ from it and no flip was ever detected.
 *
 * The venue's own session end decides: while the market is still open, today's
 * row is in progress and goes. After the bell it is a real close and stays.
 * Crypto reports a ~24h session, so its current day is always in progress —
 * which is correct, as that bar only settles at midnight UTC.
 */
function dropInProgressBar(
  bars: Bar[],
  meta: { currentTradingPeriod?: { regular?: { end?: unknown } } },
  exchangeTz: string,
) {
  const sessionEnd = toMs(meta.currentTradingPeriod?.regular?.end);

  let today: string;
  try {
    today = new Date().toLocaleDateString("en-CA", { timeZone: exchangeTz });
  } catch {
    today = new Date().toISOString().slice(0, 10);
  }

  // Without a session end there is no way to tell an in-progress bar from a
  // settled one, so drop today's either way: being a day behind is a far
  // cheaper error than inventing a close.
  const stillOpen = sessionEnd === null || Date.now() < sessionEnd;
  if (!stillOpen) return;

  while (bars.length > 0 && bars[bars.length - 1].date >= today) bars.pop();
}

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
