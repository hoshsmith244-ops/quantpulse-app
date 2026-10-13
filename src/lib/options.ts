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
// Structures
// ---------------------------------------------------------------------------

export type Leg = { side: "buy" | "sell"; right: Right; strike: number; bid: number; ask: number; mid: number };

export type Structure = {
  id: "long-call" | "call-debit-spread" | "bull-put-spread";
  name: string;
  legs: Leg[];
  /** Positive = you pay (debit). Negative = you receive (credit). At mid. */
  net: number;
  /** The same, filled at the far side of every leg -- the worst case. */
  natural: number;
  /** Per share. Null = unlimited. */
  maxGain: number | null;
  maxLoss: number;
  breakeven: number;
  /** Risk-neutral chance of finishing past breakeven. */
  chance: number;
  /** One sentence on when this structure fits. */
  fit: string;
};

function quote(list: OptionQuote[], strike: number): OptionQuote | undefined {
  return list.find((q) => q.strike === strike);
}

function leg(side: Leg["side"], right: Right, q: OptionQuote): Leg | null {
  const m = midOf(q);
  return m ? { side, right, strike: q.strike, bid: q.bid, ask: q.ask, mid: m } : null;
}

/** Nearest listed strike at or beyond a level, in the given direction. */
function strikeBeyond(list: OptionQuote[], level: number, dir: 1 | -1): OptionQuote | undefined {
  const ok = list.filter((q) => (dir === 1 ? q.strike >= level : q.strike <= level) && midOf(q));
  return ok.sort((a, b) => dir * (a.strike - b.strike))[0];
}

/**
 * Three ways to express a BULLISH view on one expiry, priced from the live
 * chain. The order depends on how rich implied vol is: when options are
 * expensive relative to other stocks, structures that sell some premium back
 * go first.
 *
 * Bullish only, because every strategy here is long-only: "out" means no
 * signal, not a bearish one.
 */
export function bullishStructures(chain: ExpiryChain, spot: number, iv: number, move: number, bucket: IvBucket | null): Structure[] {
  const T = yearsTo(chain.days);
  const K = atmStrike(chain, spot);
  if (K === null) return [];
  const out: Structure[] = [];

  const atmCall = quote(chain.calls, K);
  const lc = atmCall && leg("buy", "call", atmCall);
  if (lc) {
    out.push({
      id: "long-call",
      name: "Long call",
      legs: [lc],
      net: lc.mid,
      natural: lc.ask,
      maxGain: null,
      maxLoss: lc.mid,
      breakeven: K + lc.mid,
      chance: probAbove(spot, K + lc.mid, T, iv),
      fit: "Most upside, but you pay for all the implied vol. Only reasonable when IV is not rich.",
    });
  }

  const upper = strikeBeyond(chain.calls, spot * (1 + move), 1);
  const short = upper && upper.strike > K ? leg("sell", "call", upper) : null;
  if (lc && short) {
    const net = lc.mid - short.mid;
    const width = short.strike - lc.strike;
    if (net > 0 && net < width) {
      out.push({
        id: "call-debit-spread",
        name: "Call debit spread",
        legs: [lc, short],
        net,
        natural: lc.ask - short.bid,
        maxGain: width - net,
        maxLoss: net,
        breakeven: lc.strike + net,
        chance: probAbove(spot, lc.strike + net, T, iv),
        fit: "Caps the upside at the market's own expected move and sells back premium -- cheaper than a long call when IV is elevated.",
      });
    }
  }

  const sellPut = strikeBeyond(chain.puts, spot * (1 - move), -1);
  const buyPut = sellPut ? strikeBeyond(chain.puts, sellPut.strike - Math.max(spot * 0.025, 0.01), -1) : undefined;
  const sp = sellPut && leg("sell", "put", sellPut);
  const bp = buyPut && buyPut.strike < (sellPut?.strike ?? 0) ? leg("buy", "put", buyPut) : null;
  if (sp && bp) {
    const credit = sp.mid - bp.mid;
    const width = sp.strike - bp.strike;
    if (credit > 0 && credit < width) {
      out.push({
        id: "bull-put-spread",
        name: "Bull put spread",
        legs: [sp, bp],
        net: -credit,
        natural: -(sp.bid - bp.ask),
        maxGain: credit,
        maxLoss: width - credit,
        breakeven: sp.strike - credit,
        chance: probAbove(spot, sp.strike - credit, T, iv),
        fit: "Gets paid if the stock simply holds above the market's expected downside. Puts rich premium on your side, with the loss capped.",
      });
    }
  }

  const rank: Record<Structure["id"], number> =
    bucket !== null && bucket <= 1
      ? { "bull-put-spread": 0, "call-debit-spread": 1, "long-call": 2 }
      : bucket !== null && bucket >= 3
        ? { "long-call": 0, "call-debit-spread": 1, "bull-put-spread": 2 }
        : { "call-debit-spread": 0, "long-call": 1, "bull-put-spread": 2 };
  return out.sort((a, b) => rank[a.id] - rank[b.id]);
}

/** True when an earnings date falls on or before the expiry. */
export function earningsBefore(earnings: string | null, expiration: string): boolean {
  return earnings !== null && earnings <= expiration;
}
