import type { Bar } from "./types";

/**
 * Shared, dependency-free market types and helpers.
 *
 * Kept separate from `market.ts` on purpose: that module imports
 * `yahoo-finance2`, which reaches for `node:module` and cannot be bundled for
 * the browser. Anything the client needs lives here instead.
 */

export type Quote = {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  /** most recent close */
  price: number;
  /** change vs the previous close, in percent */
  changePct: number;
};

export type History = {
  quote: Quote;
  bars: Bar[];
};

/** Tickers offered in the picker. Any valid Yahoo symbol also works. */
export const PRESETS = [
  { symbol: "AAPL", label: "Apple" },
  { symbol: "MSFT", label: "Microsoft" },
  { symbol: "NVDA", label: "NVIDIA" },
  { symbol: "TSLA", label: "Tesla" },
  { symbol: "AMZN", label: "Amazon" },
  { symbol: "SPY", label: "S&P 500 ETF" },
  { symbol: "QQQ", label: "Nasdaq 100 ETF" },
  { symbol: "BTC-USD", label: "Bitcoin" },
];

/** Yahoo symbols are uppercase; reject anything that cannot be one. */
export function normaliseSymbol(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  if (!s || s.length > 15) return null;
  if (!/^[A-Z0-9.\-^=]+$/.test(s)) return null;
  return s;
}

// --- Live market context ----------------------------------------------------
// Shared with the client, so these live here rather than in `context.ts`,
// which carries a `server-only` guard.

export type Session = "pre" | "regular" | "post" | "closed";

export type NewsItem = {
  id: string;
  title: string;
  publisher: string;
  link: string;
  /** epoch ms */
  publishedAt: number;
  /** true when published after the last regular-session close */
  afterClose: boolean;
};

export type MarketContext = {
  symbol: string;
  session: Session;
  timezone: string;
  regular: { price: number; changePct: number; at: number } | null;
  extended: {
    price: number;
    changePct: number;
    at: number;
    session: "pre" | "post";
  } | null;
  /** move since the regular close, in percent — what the signal has not seen */
  driftPct: number | null;
  news: NewsItem[];
};

/**
 * How big an extended-hours move has to be before the signal is flagged as
 * stale. Below this it is daily noise; above it, the close the signal was
 * built on is arguably no longer the right reference point.
 */
export const STALE_DRIFT_PCT = 2;
