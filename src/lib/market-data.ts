import type { Bar } from "./types";

/** Deterministic PRNG so every render/server-client pass produces identical series. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Box–Muller transform: uniform -> standard normal. */
function gaussian(rand: () => number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export type AssetProfile = {
  symbol: string;
  name: string;
  klass: "Equity" | "ETF" | "Crypto";
  startPrice: number;
  /** annualised volatility */
  vol: number;
  /** total return over the full window, e.g. 0.38 = +38% */
  totalReturn: number;
};

export const ASSETS: AssetProfile[] = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF", klass: "ETF", startPrice: 372.4, vol: 0.158, totalReturn: 0.38 },
  { symbol: "QQQ", name: "Invesco QQQ Trust", klass: "ETF", startPrice: 281.9, vol: 0.223, totalReturn: 0.52 },
  { symbol: "AAPL", name: "Apple Inc.", klass: "Equity", startPrice: 148.7, vol: 0.264, totalReturn: 0.44 },
  { symbol: "NVDA", name: "NVIDIA Corp.", klass: "Equity", startPrice: 46.2, vol: 0.472, totalReturn: 1.9 },
  { symbol: "BTC/USD", name: "Bitcoin / US Dollar", klass: "Crypto", startPrice: 23180, vol: 0.594, totalReturn: 1.25 },
  { symbol: "ETH/USD", name: "Ethereum / US Dollar", klass: "Crypto", startPrice: 1596, vol: 0.671, totalReturn: 0.7 },
];

export const getAsset = (symbol: string): AssetProfile =>
  ASSETS.find((a) => a.symbol === symbol) ?? ASSETS[0];

const TRADING_DAYS = 756; // ~3 years of sessions

/**
 * Geometric Brownian motion with a slow-moving regime component, so the series
 * has the trending / mean-reverting alternation real strategies get judged on.
 *
 * Raw GBM over three years at 20-60% vol makes the terminal price a coin flip,
 * which is fine statistically but useless as a demo fixture. So the drift is
 * bridged: after generating the path, a constant is added to every log return
 * so the series lands on the asset's target total return. Daily volatility,
 * regime texture and drawdown shape are untouched.
 */
export function generateSeries(symbol: string, days = TRADING_DAYS): Bar[] {
  const profile = getAsset(symbol);
  const rand = mulberry32(hashSeed(symbol));
  const dt = 1 / 252;
  const bars: Bar[] = [];

  let regime = 0;

  // Walk backwards from today so the most recent bar is "now".
  const end = Date.UTC(2026, 8, 11); // 2026-09-11
  const dates: string[] = [];
  const cursor = new Date(end);
  while (dates.length < days) {
    const dow = cursor.getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    if (profile.klass === "Crypto" || !isWeekend) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  dates.reverse();

  // Pass 1: build the raw log-return path and remember each bar's local vol.
  const logRets: number[] = [];
  const sigmas: number[] = [];
  const shocks: number[] = [];
  for (let i = 0; i < dates.length; i++) {
    // Ornstein–Uhlenbeck style regime: pulls toward 0, wanders slowly.
    regime = regime * 0.985 + gaussian(rand) * 0.06;
    const sigma = profile.vol * (1 + Math.abs(regime) * 0.3);
    const shock = gaussian(rand);
    // Regime tilts local drift so trends persist, but sums out over the window.
    const localDrift = regime * profile.vol * 0.55 * dt;
    logRets.push(localDrift - 0.5 * sigma * sigma * dt + sigma * Math.sqrt(dt) * shock);
    sigmas.push(sigma);
    shocks.push(shock);
  }

  // Pass 2: bridge the drift so the path lands on the target total return.
  const realized = logRets.reduce((a, b) => a + b, 0);
  const adjust = (Math.log(1 + profile.totalReturn) - realized) / logRets.length;

  let price = profile.startPrice;
  for (let i = 0; i < dates.length; i++) {
    const open = price;
    price = price * Math.exp(logRets[i] + adjust);
    const close = price;

    const intraday = sigmas[i] * Math.sqrt(dt) * 0.85;
    const hi = Math.max(open, close) * (1 + Math.abs(gaussian(rand)) * intraday);
    const lo = Math.min(open, close) * (1 - Math.abs(gaussian(rand)) * intraday);

    const baseVol = profile.klass === "Crypto" ? 41_000 : 68_000_000;
    const volume = Math.round(
      baseVol * (0.55 + rand() * 0.9) * (1 + Math.abs(shocks[i]) * 0.4),
    );

    bars.push({
      date: dates[i],
      open: round(open),
      high: round(hi),
      low: round(lo),
      close: round(close),
      volume,
    });
  }

  return bars;
}

function round(n: number) {
  return n >= 1000 ? Math.round(n * 100) / 100 : Math.round(n * 10000) / 10000;
}

/** Cached per-symbol so repeated backtests in one session stay cheap. */
const cache = new Map<string, Bar[]>();
export function getSeries(symbol: string, days = TRADING_DAYS): Bar[] {
  const key = `${symbol}:${days}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = generateSeries(symbol, days);
    cache.set(key, hit);
  }
  return hit;
}
