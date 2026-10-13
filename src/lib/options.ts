/**
 * Options maths and the decisions built on it.
 *
 * What this file is for, and what it is not. The research in
 * scripts/research/ (README, "Options research") tested whether the app's five
 * strategies can drive profitable option trades, on real implied vol from 2020
 * to 2026. They cannot: implied vol at a signal is ~1.1x what is later
 * realised, the same as for any stock, so the signals find no mispriced
 * options. What did hold up, in both the train and the test window, is about
 * INSTRUMENT CHOICE -- whether options on a stock are expensive relative to
 * other stocks today, how big a move the market is already pricing, and what
 * the spread will cost. That is what lives here.
 *
 * No runtime imports, so the nightly screen build and the test harness can use
 * the same functions the terminal does.
 */

import type { Bar } from "./types";

// ---------------------------------------------------------------------------
// Data shapes (produced server-side by options-chain.ts)
// ---------------------------------------------------------------------------

export type OptionQuote = {
  strike: number;
  bid: number;
  ask: number;
  last: number;
  /** Yahoo's own implied vol for the contract. Unreliable on stale quotes. */
  iv: number | null;
  openInterest: number;
  volume: number;
};

export type ExpiryChain = {
  /** ISO date, YYYY-MM-DD */
  expiration: string;
  /** Calendar days from the snapshot to expiry. */
  days: number;
  calls: OptionQuote[];
  puts: OptionQuote[];
};

export type OptionsSnapshot = {
  symbol: string;
  spot: number;
  /** Epoch ms the snapshot was taken. Yahoo's option quotes run ~15 min late. */
  asOf: number;
  isEtf: boolean;
  /** Next earnings date, ISO, when the issuer has one scheduled. */
  earnings: string | null;
  expirations: ExpiryChain[];
};

/**
 * Today's cross-section, published by the nightly screen build: quintile
 * breakpoints of log(HV_252 / IV) across the universe's single stocks.
 */
export type IvCutoffs = {
  asOf: string;
  generatedAt: string;
  /** Ascending. Below breaks[0] is the richest fifth. */
  breaks: [number, number, number, number];
  /** Stocks the breakpoints were computed from. */
  n: number;
};

// ---------------------------------------------------------------------------
// Black-Scholes
// ---------------------------------------------------------------------------

export const RATE = 0.04;

export function ncdf(x: number): number {
  // Abramowitz & Stegun 7.1.26, |error| < 1.5e-7.
  const t = 1 / (1 + (0.3275911 * Math.abs(x)) / Math.SQRT2);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(x * x) / 2);
  return 0.5 * (1 + Math.sign(x) * y);
}

export type Right = "call" | "put";

export function bsPrice(right: Right, S: number, K: number, T: number, sigma: number, r = RATE): number {
  if (T <= 0 || sigma <= 0) return Math.max(0, right === "call" ? S - K : K - S);
  const v = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + r * T + (v * v) / 2) / v;
  const d2 = d1 - v;
  const disc = Math.exp(-r * T);
  return right === "call" ? S * ncdf(d1) - K * disc * ncdf(d2) : K * disc * ncdf(-d2) - S * ncdf(-d1);
}

export function bsDelta(right: Right, S: number, K: number, T: number, sigma: number, r = RATE): number {
  if (T <= 0 || sigma <= 0) return right === "call" ? (S > K ? 1 : 0) : S < K ? -1 : 0;
  const v = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + r * T + (v * v) / 2) / v;
  return right === "call" ? ncdf(d1) : ncdf(d1) - 1;
}

/**
 * Risk-neutral probability the underlying finishes above `level` at expiry.
 * This is what the option market implies, not a forecast -- and because
 * implied vol usually runs above realised, it tends to understate how often
 * prices stay put.
 */
export function probAbove(S: number, level: number, T: number, sigma: number, r = RATE): number {
  if (T <= 0 || sigma <= 0) return S > level ? 1 : 0;
  const v = sigma * Math.sqrt(T);
  const d2 = (Math.log(S / level) + r * T - (v * v) / 2) / v;
  return ncdf(d2);
}

/** Implied vol from a price, by bisection. Null when no vol fits. */
export function impliedVol(right: Right, price: number, S: number, K: number, T: number, r = RATE): number | null {
  if (!(price > 0) || !(T > 0)) return null;
  const intrinsic = Math.max(0, right === "call" ? S - K * Math.exp(-r * T) : K * Math.exp(-r * T) - S);
  if (price <= intrinsic) return null;
  let lo = 0.005;
  let hi = 5;
  if (bsPrice(right, S, K, T, hi, r) < price) return null;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (bsPrice(right, S, K, T, mid, r) > price) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------------------
// Reading a chain
// ---------------------------------------------------------------------------

/** Mid price, or null when the quote is one-sided -- common after hours. */
export function midOf(q: OptionQuote): number | null {
  return q.bid > 0 && q.ask > 0 && q.ask >= q.bid ? (q.bid + q.ask) / 2 : null;
}

/** Quoted spread as a share of mid. */
export function spreadPct(q: OptionQuote): number | null {
  const m = midOf(q);
  return m ? (q.ask - q.bid) / m : null;
}

export const yearsTo = (days: number) => Math.max(days, 0.5) / 365;

export function atmStrike(chain: ExpiryChain, spot: number): number | null {
  const strikes = chain.calls.map((c) => c.strike).filter((k) => chain.puts.some((p) => p.strike === k));
  if (!strikes.length) return null;
  return strikes.reduce((a, b) => (Math.abs(b - spot) < Math.abs(a - spot) ? b : a));
}

/**
 * Implied vol of one contract. Inverted from the mid when there is a two-sided
 * quote, which is more trustworthy than Yahoo's own figure; Yahoo's is used
 * only as a fallback.
 */
export function contractIv(right: Right, q: OptionQuote, spot: number, days: number): number | null {
  const m = midOf(q);
  const fromMid = m ? impliedVol(right, m, spot, q.strike, yearsTo(days)) : null;
  if (fromMid && fromMid > 0.01 && fromMid < 5) return fromMid;
  return q.iv && q.iv > 0.01 && q.iv < 5 ? q.iv : null;
}

/** At-the-money implied vol: the average of the ATM call and put. */
export function atmIv(chain: ExpiryChain, spot: number): number | null {
  const K = atmStrike(chain, spot);
  if (K === null) return null;
  const c = chain.calls.find((x) => x.strike === K)!;
  const p = chain.puts.find((x) => x.strike === K)!;
  const vs = [contractIv("call", c, spot, chain.days), contractIv("put", p, spot, chain.days)].filter(
    (v): v is number => v !== null,
  );
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
}

/**
 * The move the market is pricing to expiry, as a share of spot: the ATM
 * straddle's mid divided by the price. Falls back to the textbook
 * approximation (0.8 x IV x sqrt(T)) when the straddle has no two-sided quote.
 */
export function impliedMove(chain: ExpiryChain, spot: number): number | null {
  const K = atmStrike(chain, spot);
  if (K === null) return null;
  const c = midOf(chain.calls.find((x) => x.strike === K)!);
  const p = midOf(chain.puts.find((x) => x.strike === K)!);
  if (c && p) return (c + p) / spot;
  const iv = atmIv(chain, spot);
  return iv ? 0.8 * iv * Math.sqrt(yearsTo(chain.days)) : null;
}

/** The expiry nearest a target, among those at least `minDays` out. */
export function expiryNear(chains: ExpiryChain[], targetDays: number, minDays = 2): ExpiryChain | null {
  const ok = chains.filter((c) => c.days >= minDays);
  if (!ok.length) return null;
  return ok.reduce((a, b) => (Math.abs(b.days - targetDays) < Math.abs(a.days - targetDays) ? b : a));
}

// ---------------------------------------------------------------------------
// Liquidity
// ---------------------------------------------------------------------------

export type Liquidity = {
  grade: "tight" | "fair" | "wide" | "no-quote";
  /** Average quoted spread of the ATM call and put, as a share of mid. */
  spread: number | null;
  openInterest: number;
};

/**
 * Bands from Bryzgalova, Pavlova & Sikorskaya (Journal of Finance, 2023):
 * retail ATM options were quoted at 8.7% of mid on average, ETF options at
 * 8.4%, and the worst trades (small, out of the money) above 25%.
 */
export function liquidityOf(chain: ExpiryChain, spot: number): Liquidity {
  const K = atmStrike(chain, spot);
  if (K === null) return { grade: "no-quote", spread: null, openInterest: 0 };
  const c = chain.calls.find((x) => x.strike === K)!;
  const p = chain.puts.find((x) => x.strike === K)!;
  const s = [spreadPct(c), spreadPct(p)].filter((v): v is number => v !== null);
  const oi = c.openInterest + p.openInterest;
  if (!s.length) return { grade: "no-quote", spread: null, openInterest: oi };
  const spread = s.reduce((a, b) => a + b, 0) / s.length;
  const grade = spread <= 0.05 && oi >= 100 ? "tight" : spread <= 0.12 ? "fair" : "wide";
  return { grade, spread, openInterest: oi };
}

// ---------------------------------------------------------------------------
// Rich or cheap -- the tested rule
// ---------------------------------------------------------------------------

/**
 * Annualised realised vol over the last 252 sessions, zero-mean -- the
 * definition the research sorted on.
 */
export function hv252(bars: Bar[]): number | null {
  if (bars.length < 253) return null;
  let q = 0;
  for (let i = bars.length - 252; i < bars.length; i++) {
    const r = Math.log(bars[i].close / bars[i - 1].close);
    q += r * r;
  }
  return Math.sqrt((252 * q) / 252);
}

export type IvBucket = 0 | 1 | 2 | 3 | 4;

/**
 * Where log(HV_252 / IV) falls against today's cross-section. 0 = IV richest.
 *
 * Cross-sectional on purpose. Sorting each week against the other stocks held
 * up in both periods; FIXED cutoffs did not -- after 2020 every stock's
 * one-year vol was inflated at once, and the fixed-cutoff ordering reversed.
 */
export function ivBucket(hv: number, iv: number, cutoffs: IvCutoffs): IvBucket {
  const x = Math.log(hv / iv);
  return cutoffs.breaks.filter((b) => x > b).length as IvBucket;
}

/**
 * What buying premium earned in each fifth, per $ of premium over 30 days, at
 * a typical retail fill (half the quoted spread). Single stocks, weekly
 * cross-sectional quintiles, real implied vol (DoltHub, CC BY-SA 4.0).
 * Source: scripts/research/iv-analysis.mts section 2.
 */
export const IV_BUCKETS: {
  label: string;
  short: string;
  tone: "down" | "amber" | "dim" | "up";
  train: number;
  test: number;
}[] = [
  { label: "Rich", short: "IV rich", tone: "down", train: -11.1, test: -8.2 },
  { label: "Above average", short: "IV above avg", tone: "amber", train: -9.3, test: -7.7 },
  { label: "Average", short: "IV average", tone: "dim", train: -7.9, test: -4.3 },
  { label: "Below average", short: "IV below avg", tone: "dim", train: -7.9, test: -0.2 },
  { label: "Cheap", short: "IV cheap", tone: "up", train: -5.8, test: 0.1 },
];

// ---------------------------------------------------------------------------
// The market's move vs this signal's history
// ---------------------------------------------------------------------------

/** Calendar days to trading sessions, roughly. */
export const sessionsIn = (days: number) => Math.max(1, Math.round((days * 252) / 365));

export type MoveStats = {
  n: number;
  /** Mean simple return, as a share. */
  mean: number;
  median: number;
  upRate: number;
  /** Median absolute move -- comparable to an implied move. */
  medianAbs: number;
};

/**
 * Fixed-horizon moves after each past entry: where the stock stood `sessions`
 * later. Fixed horizon because an option has a date, not an exit rule -- the
 * strategy's own trade win rate counts how trades END, which is a different
 * and much flattering number.
 */
export function movesAfter(bars: Bar[], entries: number[], sessions: number): MoveStats | null {
  const xs: number[] = [];
  for (const i of entries) {
    if (i >= 0 && i + sessions < bars.length) xs.push(bars[i + sessions].close / bars[i].close - 1);
  }
  if (xs.length < 3) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const abs = xs.map(Math.abs).sort((a, b) => a - b);
  return {
    n: xs.length,
    mean: xs.reduce((a, b) => a + b, 0) / xs.length,
    median: sorted[sorted.length >> 1],
    upRate: xs.filter((x) => x > 0).length / xs.length,
    medianAbs: abs[abs.length >> 1],
  };
}

// ---------------------------------------------------------------------------
// Buying calls and puts
// ---------------------------------------------------------------------------

/** Per-share P&L at expiry for a bought option. */
export function payoffAtExpiry(right: Right, strike: number, premium: number, price: number): number {
  return Math.max(0, right === "call" ? price - strike : strike - price) - premium;
}

/** Time decay, per share per calendar day, at constant vol. Negative for a buyer. */
export function bsThetaPerDay(right: Right, S: number, K: number, T: number, sigma: number, r = RATE): number {
  const dt = 1 / 365;
  if (T <= dt) return payoffAtExpiry(right, K, bsPrice(right, S, K, T, sigma, r), S);
  return bsPrice(right, S, K, T - dt, sigma, r) - bsPrice(right, S, K, T, sigma, r);
}

export type Contract = {
  right: Right;
  strike: number;
  bid: number;
  ask: number;
  /** What a buyer realistically pays per share: the mid, or the ask when one-sided. */
  premium: number | null;
  /** Quoted spread as a share of mid. */
  spread: number | null;
  iv: number | null;
  delta: number | null;
  thetaPerDay: number | null;
  breakeven: number | null;
  /** Move from spot to breakeven, as a positive share: up for calls, down for puts. */
  needMove: number | null;
  /** Risk-neutral chance of finishing past breakeven -- what the price implies. */
  chanceMarket: number | null;
  moneyness: "itm" | "atm" | "otm";
  openInterest: number;
  volume: number;
};

/**
 * The strikes around the money for one side of one expiry, with what a buyer
 * needs to know about each.
 */
export function contractsFor(chain: ExpiryChain, spot: number, right: Right, around = 8): Contract[] {
  const list = (right === "call" ? chain.calls : chain.puts).slice().sort((a, b) => a.strike - b.strike);
  if (!list.length) return [];
  const K0 = atmStrike(chain, spot);
  const at = Math.max(0, list.findIndex((q) => q.strike === K0));
  const T = yearsTo(chain.days);
  const fallbackIv = atmIv(chain, spot);

  return list.slice(Math.max(0, at - around), at + around + 1).map((q) => {
    const mid = midOf(q);
    const premium = mid ?? (q.ask > 0 ? q.ask : null);
    const iv = contractIv(right, q, spot, chain.days) ?? fallbackIv;
    const breakeven = premium === null ? null : right === "call" ? q.strike + premium : q.strike - premium;
    const needMove = breakeven === null ? null : right === "call" ? breakeven / spot - 1 : 1 - breakeven / spot;
    const chanceMarket =
      breakeven === null || iv === null || breakeven <= 0
        ? null
        : right === "call"
          ? probAbove(spot, breakeven, T, iv)
          : 1 - probAbove(spot, breakeven, T, iv);
    return {
      right,
      strike: q.strike,
      bid: q.bid,
      ask: q.ask,
      premium,
      spread: spreadPct(q),
      iv,
      delta: iv ? bsDelta(right, spot, q.strike, T, iv) : null,
      thetaPerDay: iv ? bsThetaPerDay(right, spot, q.strike, T, iv) : null,
      breakeven,
      needMove,
      chanceMarket,
      moneyness: q.strike === K0 ? "atm" : (right === "call" ? q.strike < spot : q.strike > spot) ? "itm" : "otm",
      openInterest: q.openInterest,
      volume: q.volume,
    };
  });
}

/**
 * How often this stock's own `sessions`-day move has gone past `need` in the
 * bars given, with the average move (the trend) removed.
 *
 * The trend comes out because a stock that rose for three years makes every
 * call look good on history alone -- that is the bull market, not the option.
 * What remains is how much the stock actually moves, which is exactly what an
 * option's price is a bet on.
 */
export function historicalChance(bars: Bar[], sessions: number, need: number, right: Right): number | null {
  if (bars.length < sessions + 60) return null;
  const rs: number[] = [];
  for (let i = 0; i + sessions < bars.length; i++) rs.push(Math.log(bars[i + sessions].close / bars[i].close));
  const mean = rs.reduce((a, b) => a + b, 0) / rs.length;
  const target = right === "call" ? Math.log(1 + need) : need < 1 ? Math.log(1 - need) : -Infinity;
  const hits = rs.filter((r) => (right === "call" ? r - mean > target : r - mean < target)).length;
  return hits / rs.length;
}

/**
 * The contract to look at first: at the money. Not a prediction -- it is where
 * spreads are tightest (about 4% of premium round trip, against 14-28% out of
 * the money; Bryzgalova, Pavlova & Sikorskaya 2023) and where the option most
 * directly expresses a view on direction rather than a lottery on a big move.
 */
export function suggestedContract(contracts: Contract[]): Contract | null {
  return contracts.find((c) => c.moneyness === "atm" && c.premium !== null) ?? null;
}

/** True when an earnings date falls on or before the expiry. */
export function earningsBefore(earnings: string | null, expiration: string): boolean {
  return earnings !== null && earnings <= expiration;
}
