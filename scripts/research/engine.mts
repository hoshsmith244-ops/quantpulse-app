/**
 * A fast, configurable copy of the app's trading rule, for research only.
 *
 * The app's `simulate` re-sorts every score it has seen on every bar, which is
 * fine for one ticker in a browser and hopeless for thousands of configurations
 * across a universe. This computes the same decisions in O(n log n) with a
 * Fenwick tree, and extends the rule with the variations under test:
 *
 *   entryPct / exitPct   separate thresholds (hysteresis); equal = today's rule
 *   maxHold              a time stop, in sessions
 *   trend                only enter while the close is above its 200-day mean
 *
 * `validate.mts` proves that with the app's own settings this reproduces the
 * app's equity curve and trade list exactly. Nothing here is trusted until it
 * does.
 */

import { computeFactor, type FactorId } from "../../src/lib/alpha.ts";
import type { Bar } from "../../src/lib/types.ts";

/** Same as the app: a year of scores before the rule may take a position. */
export const WARMUP = 252;
/** The app's window: three years of bars. */
export const WINDOW_BARS = 756;

export type Rule = {
  entryPct: number;
  exitPct: number;
  maxHold: number | null;
  trend: boolean;
  costBps: number;
};

export const APP_RULE: Rule = { entryPct: 60, exitPct: 60, maxHold: null, trend: false, costBps: 10 };

/**
 * For each bar: how many of the valid scores seen so far (itself included) are
 * <= this bar's score, and how many have been seen. -1 where there is no score.
 *
 * The app enters when score >= sorted(seen)[floor(len * P / 100)], which holds
 * exactly when countLE >= floor(len * P / 100) + 1, ties included. So any
 * percentile threshold becomes an integer comparison against these arrays.
 */
export type Ranks = { le: Int32Array; len: Int32Array };

export function expandingRanks(scores: (number | null)[]): Ranks {
  const n = scores.length;
  const le = new Int32Array(n).fill(-1);
  const len = new Int32Array(n).fill(0);

  const valid: number[] = [];
  for (const s of scores) if (s !== null && Number.isFinite(s)) valid.push(s);
  const uniq = [...new Set(valid)].sort((a, b) => a - b);
  const index = new Map<number, number>();
  uniq.forEach((v, i) => index.set(v, i + 1));

  const tree = new Int32Array(uniq.length + 1);
  let seen = 0;
  for (let i = 0; i < n; i++) {
    const s = scores[i];
    if (s === null || !Number.isFinite(s)) {
      len[i] = seen;
      continue;
    }
    const k = index.get(s)!;
    for (let j = k; j < tree.length; j += j & -j) tree[j]++;
    seen++;
    let c = 0;
    for (let j = k; j > 0; j -= j & -j) c += tree[j];
    le[i] = c;
    len[i] = seen;
  }
  return { le, len };
}

export function sma200(bars: Bar[]): Float64Array {
  const out = new Float64Array(bars.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].close;
    if (i >= 200) sum -= bars[i - 200].close;
    if (i >= 199) out[i] = sum / 200;
  }
  return out;
}

export type SimTrade = {
  entry: number;
  exit: number | null;
  returnPct: number;
  barsHeld: number;
};

export type Sim = {
  /** Multiplicative daily factor for the strategy, net of costs. */
  stratFactor: Float64Array;
  /** Position held INTO bar i (decided at the close of i-1). */
  heldInto: Uint8Array;
  /** First bar at which the rule was allowed to trade. */
  liveFrom: number;
  trades: SimTrade[];
};

export function simulate(
  bars: Bar[],
  ranks: Ranks,
  rule: Rule,
  trendMa: Float64Array | null,
): Sim {
  const n = bars.length;
  const sideCost = Math.max(0, rule.costBps) / 10_000 / 2;
  const stratFactor = new Float64Array(n).fill(1);
  const heldInto = new Uint8Array(n);
  const trades: SimTrade[] = [];

  let inMarket = false;
  let entryIndex = -1;
  let liveFrom = n;
  // After a time stop the signal must reset before the rule may re-enter;
  // otherwise the stop just churns the same position and pays the spread.
  let cooldown = false;

  for (let i = 0; i < n; i++) {
    let f = 1;
    if (i > 0 && inMarket) f *= bars[i].close / bars[i - 1].close;
    heldInto[i] = inMarket ? 1 : 0;

    const le = ranks.le[i];
    if (le >= 0 && ranks.len[i] >= WARMUP) {
      if (liveFrom === n) liveFrom = i;
      const len = ranks.len[i];
      const aboveEntry = le >= Math.floor((len * rule.entryPct) / 100) + 1;
      const aboveExit = le >= Math.floor((len * rule.exitPct) / 100) + 1;

      if (cooldown && !aboveEntry) cooldown = false;

      let want: boolean = inMarket;
      if (!inMarket) {
        const trendOk = !rule.trend || (trendMa !== null && bars[i].close > trendMa[i]);
        want = aboveEntry && trendOk && !cooldown;
      } else {
        const timedOut = rule.maxHold !== null && i - entryIndex >= rule.maxHold;
        want = aboveExit && !timedOut;
        if (timedOut && aboveExit) cooldown = true;
      }

      if (want !== inMarket) {
        f *= 1 - sideCost;
        if (want) {
          entryIndex = i;
        } else {
          trades.push({
            entry: entryIndex,
            exit: i,
            returnPct: (bars[i].close / bars[entryIndex].close - 1) * 100 - rule.costBps / 100,
            barsHeld: i - entryIndex,
          });
          entryIndex = -1;
        }
        inMarket = want;
      }
    }
    stratFactor[i] = f;
  }

  if (inMarket && entryIndex >= 0) {
    trades.push({
      entry: entryIndex,
      exit: null,
      returnPct: (bars[n - 1].close / bars[entryIndex].close - 1) * 100 - rule.costBps / 100,
      barsHeld: n - 1 - entryIndex,
    });
  }

  return { stratFactor, heldInto, liveFrom, trades };
}

/** Scores and ranks for one ticker window, shared across every rule variant. */
export function prepare(bars: Bar[], factor: FactorId, param: number) {
  const scores = computeFactor(bars, factor, param, {});
  return { ranks: expandingRanks(scores), trendMa: sma200(bars) };
}
