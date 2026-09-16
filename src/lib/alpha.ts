import type { Bar } from "./types";

/**
 * The alpha research engine.
 *
 * A "factor" turns price history into one score per bar. A score is only
 * useful if it predicts what happens NEXT, so everything here measures the
 * factor against FORWARD returns — returns the factor could not have seen.
 *
 * This is the core discipline of quant research: a factor that correlates with
 * past returns is a description; one that correlates with future returns is an
 * edge. The Information Coefficient is how you tell them apart.
 */

export type FactorId =
  | "momentum"
  | "reversal"
  | "riskAdjMomentum"
  | "trendDistance"
  | "volumeThrust"
  | "newsSentiment";

export type FactorMeta = {
  id: FactorId;
  name: string;
  /** one line, plain English */
  thesis: string;
  /** what the lookback controls */
  paramLabel: string;
  min: number;
  max: number;
  def: number;
  /** the family a quant would file this under */
  family: "Trend" | "Mean reversion" | "Flow" | "Sentiment";
  /** needs data beyond the price series, so it can be unavailable */
  external?: true;
};

export const FACTORS: FactorMeta[] = [
  {
    id: "momentum",
    name: "Momentum",
    thesis:
      "Winners keep winning. Scores the trailing return, skipping the last 5 days to avoid short-term reversal.",
    paramLabel: "Formation window",
    min: 20,
    max: 252,
    def: 126,
    family: "Trend",
  },
  {
    id: "reversal",
    name: "Short-term reversal",
    thesis:
      "What fell too fast bounces. Scores the negative of the recent return, so extreme losers score highest.",
    paramLabel: "Reversal window",
    min: 2,
    max: 30,
    def: 5,
    family: "Mean reversion",
  },
  {
    id: "riskAdjMomentum",
    name: "Risk-adjusted momentum",
    thesis:
      "Momentum divided by realised volatility. Prefers steady climbs over violent ones.",
    paramLabel: "Formation window",
    min: 20,
    max: 252,
    def: 90,
    family: "Trend",
  },
  {
    id: "trendDistance",
    name: "Distance from trend",
    thesis:
      "How far price sits above or below its moving average, in standard deviations. A stretch gauge.",
    paramLabel: "Moving average",
    min: 10,
    max: 200,
    def: 50,
    family: "Mean reversion",
  },
  {
    id: "volumeThrust",
    name: "Volume thrust",
    thesis:
      "Return weighted by how unusual today's volume is. Conviction moves score higher than drifts.",
    paramLabel: "Volume baseline",
    min: 10,
    max: 120,
    def: 20,
    family: "Flow",
  },
  {
    id: "newsSentiment",
    name: "News sentiment",
    thesis:
      "Averages how bullish or bearish coverage has been. Needs an Alpha Vantage key.",
    paramLabel: "Sentiment window",
    min: 3,
    max: 60,
    def: 10,
    family: "Sentiment",
    external: true,
  },
];

export const getFactor = (id: FactorId): FactorMeta =>
  FACTORS.find((f) => f.id === id) ?? FACTORS[0];

// ---------------------------------------------------------------------------
// Small statistics helpers
// ---------------------------------------------------------------------------

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

/** Pearson correlation. */
function pearson(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

/** Convert to ranks (average ties), for Spearman. */
function ranks(xs: number[]) {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array(xs.length).fill(0);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[idx[k][1]] = r;
    i = j + 1;
  }
  return out;
}

/**
 * Spearman rank correlation — the standard IC in equity research. Rank-based
 * so a single outlier day cannot manufacture an edge.
 */
const spearman = (xs: number[], ys: number[]) =>
  pearson(ranks(xs), ranks(ys));

function rollingStdev(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period; i < values.length; i++) {
    out[i] = stdev(values.slice(i - period, i));
  }
  return out;
}

function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Factor computation
// ---------------------------------------------------------------------------

/** Skip the most recent week when measuring momentum (standard 12-1 style). */
const MOMENTUM_SKIP = 5;

/**
 * One score per bar, or null where there is not enough history.
 * Every value uses only data available at that bar — no lookahead.
 */
export type FactorInputs = {
  /** ISO date -> daily sentiment score, for the news factor */
  sentiment?: Map<string, number>;
  /**
   * Round-trip trading cost in basis points, charged half on entry and half
   * on exit. Defaults to DEFAULT_COST_BPS rather than zero: free trading is
   * the unrealistic assumption, and a high-turnover rule looks far better
   * without it than it ever would in an account.
   */
  costBps?: number;
};

/** Commission plus half the spread on a liquid US name, round trip. */
export const DEFAULT_COST_BPS = 10;

export function computeFactor(
  bars: Bar[],
  id: FactorId,
  param: number,
  inputs: FactorInputs = {},
): (number | null)[] {
  const close = bars.map((b) => b.close);
  const n = bars.length;
  const out: (number | null)[] = new Array(n).fill(null);

  const dailyRet: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) dailyRet[i] = close[i] / close[i - 1] - 1;

  if (id === "momentum") {
    for (let i = param + MOMENTUM_SKIP; i < n; i++) {
      const start = close[i - param - MOMENTUM_SKIP];
      const end = close[i - MOMENTUM_SKIP];
      out[i] = end / start - 1;
    }
    return out;
  }

  if (id === "reversal") {
    for (let i = param; i < n; i++) {
      out[i] = -(close[i] / close[i - param] - 1);
    }
    return out;
  }

  if (id === "riskAdjMomentum") {
    const vol = rollingStdev(dailyRet, param);
    for (let i = param + MOMENTUM_SKIP; i < n; i++) {
      const v = vol[i];
      if (!v) continue;
      const raw = close[i - MOMENTUM_SKIP] / close[i - param - MOMENTUM_SKIP] - 1;
      out[i] = raw / (v * Math.sqrt(252));
    }
    return out;
  }

  if (id === "trendDistance") {
    const ma = sma(close, param);
    const vol = rollingStdev(dailyRet, param);
    for (let i = 0; i < n; i++) {
      const m = ma[i];
      const v = vol[i];
      if (m === null || !v) continue;
      // Negated: far BELOW trend is the bullish (high) score.
      out[i] = -((close[i] - m) / m / (v * Math.sqrt(param)));
    }
    return out;
  }

  if (id === "newsSentiment") {
    const series = inputs.sentiment;
    if (!series || series.size === 0) return out;

    // Carry the last known reading forward: most days have no coverage, and a
    // quiet day does not reset the tone of the preceding week.
    const filled: (number | null)[] = new Array(n).fill(null);
    let last: number | null = null;
    for (let i = 0; i < n; i++) {
      const v = series.get(bars[i].date);
      if (v !== undefined) last = v;
      filled[i] = last;
    }

    for (let i = param; i < n; i++) {
      const window = filled.slice(i - param + 1, i + 1).filter(
        (v): v is number => v !== null,
      );
      // Require the window to be mostly covered before scoring it.
      if (window.length < Math.max(2, param * 0.5)) continue;
      out[i] = window.reduce((a, b) => a + b, 0) / window.length;
    }
    return out;
  }

  // volumeThrust
  const vols = bars.map((b) => b.volume);
  const volMa = sma(vols, param);
  for (let i = param; i < n; i++) {
    const base = volMa[i];
    if (!base) continue;
    out[i] = dailyRet[i] * (vols[i] / base);
  }
  return out;
}

/** Forward return from bar i to bar i+h. */
function forwardReturns(bars: Bar[], horizon: number): (number | null)[] {
  const close = bars.map((b) => b.close);
  const out: (number | null)[] = new Array(bars.length).fill(null);
  for (let i = 0; i + horizon < bars.length; i++) {
    out[i] = close[i + horizon] / close[i] - 1;
  }
  return out;
}

export type ICPoint = { horizon: number; ic: number; tStat: number };

export type QuantileBucket = {
  /** 1 = lowest factor scores, 5 = highest */
  bucket: number;
  meanForwardPct: number;
  hitRatePct: number;
  count: number;
};

export type AlphaResult = {
  /** IC at the selected horizon */
  ic: number;
  icTStat: number;
  /** IC across horizons — how fast the edge decays */
  decay: ICPoint[];
  quantiles: QuantileBucket[];
  /** top minus bottom quintile mean forward return, in percent */
  spreadPct: number;
  hitRatePct: number;
  /** usable observations */
  sampleSize: number;
  /** latest factor score and where it sits historically */
  current: {
    score: number | null;
    percentile: number | null;
    bucket: number | null;
  };
  /** equity curve of the long-only rule vs buy & hold */
  curve: CurvePoint[];
  strategy: StrategyStats;
  /** every completed round trip, newest last */
  trades: Trade[];
  /** plain-English track record of those trades */
  record: TradeRecord;
  /** what the rule says right now */
  signal: Signal;
};

export type Trade = {
  entryDate: string;
  /** null while the position is still open */
  exitDate: string | null;
  entryPrice: number;
  exitPrice: number | null;
  returnPct: number;
  barsHeld: number;
};

export type TradeRecord = {
  completed: number;
  wins: number;
  winRatePct: number;
  avgWinPct: number;
  avgLossPct: number;
  bestPct: number;
  worstPct: number;
  avgHoldDays: number;
};

/** The current state of the rule, phrased for someone reading it cold. */
export type Signal = {
  state: "in" | "out";
  /** the position flipped on the most recent bar */
  freshToday: boolean;
  /** bars the rule has been in this state */
  daysInState: number;
  /** latest factor score, and the score needed to be long */
  score: number | null;
  threshold: number | null;
  /** 0-100: how close the score is to the entry trigger */
  proximityPct: number | null;
  /** set while a position is open */
  entryDate: string | null;
  entryPrice: number | null;
  openReturnPct: number | null;
};

export type CurvePoint = {
  date: string;
  strategy: number;
  buyHold: number;
  /** 1 when the rule was long on this bar */
  inMarket: number;
};

export type StrategyStats = {
  totalReturnPct: number;
  buyHoldReturnPct: number;
  cagr: number;
  sharpe: number;
  maxDrawdownPct: number;
  exposurePct: number;
  trades: number;
};

const HORIZONS = [1, 5, 10, 21, 63];
const TRADING_DAYS = 252;

/**
 * Full research pass: IC, decay, quantile spread, and the equity curve of
 * acting on the signal.
 */
export function analyse(
  bars: Bar[],
  factorId: FactorId,
  param: number,
  horizon: number,
  inputs: FactorInputs = {},
): AlphaResult {
  const scores = computeFactor(bars, factorId, param, inputs);

  // --- IC at the selected horizon --------------------------------------
  const fwd = forwardReturns(bars, horizon);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    const s = scores[i];
    const f = fwd[i];
    if (s === null || f === null || !Number.isFinite(s)) continue;
    xs.push(s);
    ys.push(f);
  }

  const ic = spearman(xs, ys);
  const nObs = xs.length;
  // Standard significance test for a correlation coefficient.
  const icTStat =
    nObs > 2 && Math.abs(ic) < 1
      ? (ic * Math.sqrt(nObs - 2)) / Math.sqrt(1 - ic * ic)
      : 0;

  // --- Decay across horizons -------------------------------------------
  const decay: ICPoint[] = HORIZONS.map((h) => {
    const f2 = forwardReturns(bars, h);
    const a: number[] = [];
    const b: number[] = [];
    for (let i = 0; i < bars.length; i++) {
      const s = scores[i];
      const v = f2[i];
      if (s === null || v === null || !Number.isFinite(s)) continue;
      a.push(s);
      b.push(v);
    }
    const c = spearman(a, b);
    const t =
      a.length > 2 && Math.abs(c) < 1
        ? (c * Math.sqrt(a.length - 2)) / Math.sqrt(1 - c * c)
        : 0;
    return { horizon: h, ic: c, tStat: t };
  });

  // --- Quintile buckets -------------------------------------------------
  const paired = xs.map((s, i) => ({ s, f: ys[i] }));
  const sorted = [...paired].sort((a, b) => a.s - b.s);
  const per = Math.floor(sorted.length / 5);
  const quantiles: QuantileBucket[] = [];
  for (let q = 0; q < 5; q++) {
    const slice =
      q === 4 ? sorted.slice(q * per) : sorted.slice(q * per, (q + 1) * per);
    const rets = slice.map((r) => r.f);
    quantiles.push({
      bucket: q + 1,
      meanForwardPct: mean(rets) * 100,
      hitRatePct: rets.length
        ? (rets.filter((r) => r > 0).length / rets.length) * 100
        : 0,
      count: rets.length,
    });
  }
  const spreadPct =
    (quantiles[4]?.meanForwardPct ?? 0) - (quantiles[0]?.meanForwardPct ?? 0);

  const hitRatePct = nObs
    ? (paired.filter((p) => (p.s >= 0 ? p.f > 0 : p.f <= 0)).length / nObs) * 100
    : 0;

  // --- Current reading --------------------------------------------------
  let currentScore: number | null = null;
  for (let i = bars.length - 1; i >= 0; i--) {
    const s = scores[i];
    if (s !== null && Number.isFinite(s)) {
      currentScore = s;
      break;
    }
  }
  const history = xs.slice().sort((a, b) => a - b);
  let percentile: number | null = null;
  let bucket: number | null = null;
  if (currentScore !== null && history.length) {
    const below = history.filter((v) => v <= currentScore!).length;
    percentile = (below / history.length) * 100;
    bucket = Math.min(5, Math.floor(percentile / 20) + 1);
  }

  // --- Acting on the signal --------------------------------------------
  // Long whenever the score sits in the top two quintiles of its own history
  // to date. Threshold is computed from PAST scores only, so the rule is
  // tradeable rather than fitted with hindsight.
  const { curve, stats, trades, record, signal } = simulate(
    bars,
    scores,
    inputs.costBps ?? DEFAULT_COST_BPS,
  );

  return {
    ic,
    icTStat,
    decay,
    quantiles,
    spreadPct,
    hitRatePct,
    sampleSize: nObs,
    current: { score: currentScore, percentile, bucket },
    curve,
    strategy: stats,
    trades,
    record,
    signal,
  };
}

/** Minimum history before the rule is allowed to take a position. */
const WARMUP = 252;

/** The rule goes long once the score ranks above this percentile of its history. */
const ENTRY_PERCENTILE = 60;

function simulate(
  bars: Bar[],
  scores: (number | null)[],
  costBps: number,
) {
  // Cost of a full round trip, split across the two transitions so an open
  // position has already paid its entry side.
  const sideCost = Math.max(0, costBps) / 10_000 / 2;
  const curve: CurvePoint[] = [];
  const seen: number[] = [];
  const trades: Trade[] = [];

  let equity = 1;
  let peak = 1;
  let maxDd = 0;
  let inMarket = false;
  let daysIn = 0;
  let flips = 0;
  const rets: number[] = [];

  // Open-position bookkeeping, so each round trip can be reported.
  let entryIndex = -1;
  let lastFlipIndex = 0;
  let threshold: number | null = null;

  const base = bars[0].close;

  for (let i = 0; i < bars.length; i++) {
    const s = scores[i];

    // Yesterday's position earns today's return: no lookahead.
    if (i > 0 && inMarket) {
      const r = bars[i].close / bars[i - 1].close - 1;
      equity *= 1 + r;
      rets.push(r);
      daysIn++;
    } else if (i > 0) {
      rets.push(0);
    }

    peak = Math.max(peak, equity);
    maxDd = Math.min(maxDd, equity / peak - 1);

    curve.push({
      date: bars[i].date,
      strategy: equity,
      buyHold: bars[i].close / base,
      inMarket: inMarket ? 1 : 0,
    });

    // Decide the position for tomorrow using only scores seen so far.
    if (s !== null && Number.isFinite(s)) {
      seen.push(s);
      if (seen.length >= WARMUP) {
        const sortedSeen = [...seen].sort((a, b) => a - b);
        threshold = sortedSeen[Math.floor((sortedSeen.length * ENTRY_PERCENTILE) / 100)];
        const want = s >= threshold;

        if (want !== inMarket) {
          flips++;
          lastFlipIndex = i;
          // Crossing the spread costs the same going in or out.
          equity *= 1 - sideCost;
          if (want) {
            entryIndex = i;
          } else if (entryIndex >= 0) {
            const entry = bars[entryIndex];
            trades.push({
              entryDate: entry.date,
              exitDate: bars[i].date,
              entryPrice: entry.close,
              exitPrice: bars[i].close,
              returnPct:
                (bars[i].close / entry.close - 1) * 100 - costBps / 100,
              barsHeld: i - entryIndex,
            });
            entryIndex = -1;
          }
        }
        inMarket = want;
      }
    }
  }

  const lastIndex = bars.length - 1;
  const last = bars[lastIndex];

  // Surface a still-open position as an unfinished trade.
  if (inMarket && entryIndex >= 0) {
    const entry = bars[entryIndex];
    trades.push({
      entryDate: entry.date,
      exitDate: null,
      entryPrice: entry.close,
      exitPrice: null,
      returnPct:
        (last.close / entry.close - 1) * 100 - costBps / 100,
      barsHeld: lastIndex - entryIndex,
    });
  }

  const latestScore = (() => {
    for (let i = lastIndex; i >= 0; i--) {
      const s = scores[i];
      if (s !== null && Number.isFinite(s)) return s;
    }
    return null;
  })();

  // How close the score sits to the entry trigger, as a 0-100 reading.
  //
  // Measured in PERCENTILE terms, not raw score distance. Raw distance is
  // useless here: scores cluster, so the gap to the threshold is almost always
  // a sliver of the full range and the gauge would read 95% forever. Ranking
  // the score against its own history and comparing to the trigger's rank
  // (the 60th percentile) gives a reading that actually moves.
  let proximityPct: number | null = null;
  if (latestScore !== null && seen.length > 1) {
    const below = seen.filter((v) => v <= latestScore).length;
    const percentile = (below / seen.length) * 100;
    proximityPct = Math.max(0, Math.min(100, (percentile / ENTRY_PERCENTILE) * 100));
  }

  const openTrade = inMarket && entryIndex >= 0 ? bars[entryIndex] : null;

  const signal: Signal = {
    state: inMarket ? "in" : "out",
    freshToday: lastFlipIndex === lastIndex && seen.length >= WARMUP,
    daysInState: lastIndex - lastFlipIndex,
    score: latestScore,
    threshold,
    proximityPct,
    entryDate: openTrade?.date ?? null,
    entryPrice: openTrade?.close ?? null,
    openReturnPct: openTrade
      ? (last.close / openTrade.close - 1) * 100
      : null,
  };

  const completed = trades.filter((t) => t.exitDate !== null);
  const wins = completed.filter((t) => t.returnPct > 0);
  const losses = completed.filter((t) => t.returnPct <= 0);

  const record: TradeRecord = {
    completed: completed.length,
    wins: wins.length,
    winRatePct: completed.length ? (wins.length / completed.length) * 100 : 0,
    avgWinPct: wins.length ? mean(wins.map((t) => t.returnPct)) : 0,
    avgLossPct: losses.length ? mean(losses.map((t) => t.returnPct)) : 0,
    bestPct: completed.length
      ? Math.max(...completed.map((t) => t.returnPct))
      : 0,
    worstPct: completed.length
      ? Math.min(...completed.map((t) => t.returnPct))
      : 0,
    avgHoldDays: completed.length
      ? mean(completed.map((t) => t.barsHeld))
      : 0,
  };

  const years = bars.length / TRADING_DAYS;
  const sd = stdev(rets);
  const m = mean(rets);

  return {
    curve,
    trades,
    record,
    signal,
    stats: {
      totalReturnPct: (equity - 1) * 100,
      buyHoldReturnPct: (last.close / base - 1) * 100,
      cagr: years > 0 ? (equity ** (1 / years) - 1) * 100 : 0,
      sharpe: sd > 0 ? (m / sd) * Math.sqrt(TRADING_DAYS) : 0,
      maxDrawdownPct: maxDd * 100,
      exposurePct: bars.length ? (daysIn / bars.length) * 100 : 0,
      trades: flips,
    } satisfies StrategyStats,
  };
}

/**
 * Plain-English verdict on an IC value.
 *
 * Strength and direction are reported separately on purpose. A large negative
 * IC is a strong result, but it is not a green light — traded as written it
 * loses money, and only pays once the sign is flipped. So the tone stays amber
 * for anything inverted and green is reserved for a factor that works as
 * stated.
 */
export function gradeIC(ic: number, tStat: number) {
  const a = Math.abs(ic);
  const inverted = ic < 0;

  if (Math.abs(tStat) < 2) {
    return {
      label: "Not significant",
      strength: "none" as const,
      inverted,
      tone: "dim" as const,
      note: "Within the range you would expect from random noise.",
    };
  }

  const strength = a >= 0.05 ? "strong" : a >= 0.03 ? "moderate" : "weak";
  const strengthLabel =
    strength === "strong" ? "Strong" : strength === "moderate" ? "Moderate" : "Weak";

  return {
    label: inverted ? `${strengthLabel} · inverted` : strengthLabel,
    strength,
    inverted,
    tone: inverted ? ("amber" as const) : ("up" as const),
    note: inverted
      ? "A real relationship, but pointing the opposite way to the thesis."
      : strength === "strong"
        ? "A meaningful, statistically significant relationship."
        : strength === "moderate"
          ? "A real but modest edge. Typical of a live equity factor."
          : "Detectable but small. Costs would eat most of it.",
  };
}

export const HORIZON_CHOICES = HORIZONS;

/**
 * A single trust rating for someone who does not want to read a t-statistic.
 *
 * Deliberately hard to get a green light: the evidence has to be statistically
 * real, point the right way, rest on enough trades, and actually have beaten
 * buying and holding. Most factor/ticker pairs will land on "weak", which is
 * the truthful answer.
 */
export function verdict(result: AlphaResult) {
  const significant = Math.abs(result.icTStat) >= 2;
  const rightWay = result.ic > 0;
  const enoughTrades = result.record.completed >= 5;
  const beatsHolding =
    result.strategy.totalReturnPct > result.strategy.buyHoldReturnPct;

  if (significant && !rightWay) {
    return {
      level: "inverted" as const,
      tone: "amber" as const,
      headline: "Backwards on this stock",
      detail:
        "There is a real pattern here, but it runs the opposite way to the idea behind this strategy. High scores have come before weaker returns, not stronger ones.",
    };
  }

  if (significant && rightWay && enoughTrades && beatsHolding) {
    return {
      level: "promising" as const,
      tone: "up" as const,
      headline: "Worth a closer look",
      detail:
        "The pattern is statistically real, points the right way, and has beaten simply holding the stock. That is rare — check it on a few other tickers before trusting it.",
    };
  }

  if (significant && rightWay) {
    return {
      level: "mixed" as const,
      tone: "amber" as const,
      headline: "Real, but it did not pay",
      detail: beatsHolding
        ? "The pattern is real but rests on very few trades, so treat it carefully."
        : "The pattern is real, yet trading it still trailed simply buying and holding the stock.",
    };
  }

  return {
    level: "weak" as const,
    tone: "dim" as const,
    headline: "No real edge here",
    detail:
      "The results are within what random chance produces. This is the normal answer — most strategies do not work on most stocks.",
  };
}

// ---------------------------------------------------------------------------
// Walk-forward tuning
// ---------------------------------------------------------------------------

/** Simulation only — skips IC, decay and quantiles, so a sweep stays cheap. */
export function evaluate(
  bars: Bar[],
  factorId: FactorId,
  param: number,
  inputs: FactorInputs = {},
) {
  return simulate(
    bars,
    computeFactor(bars, factorId, param, inputs),
    inputs.costBps ?? DEFAULT_COST_BPS,
  );
}

export type TuningRow = {
  param: number;
  /** return over the training window, in percent */
  trainPct: number;
  /** return over the held-out window, in percent */
  testPct: number;
  trades: number;
};

export type Tuning = {
  splitDate: string;
  trainBars: number;
  testBars: number;
  rows: TuningRow[];
  /** best on training data — what naive tuning would pick */
  chosen: TuningRow;
  /** best on the held-out window, visible only with hindsight */
  hindsight: TuningRow;
  /** what the parameter currently in use did out-of-sample */
  current: TuningRow | null;
  /** buy & hold over the held-out window, as the honest bar to clear */
  testBuyHoldPct: number;
  /** chosen.testPct - chosen.trainPct: how much the tuning flattered itself */
  optimismGapPct: number;
};

/** Parameter values to try. Kept modest: a finer grid finds more noise. */
const SWEEP_STEPS = 16;
/** Share of the history used to choose the parameter. */
const TRAIN_SHARE = 0.6;

/**
 * Tunes a factor's parameter the only way that means anything: choose it on
 * older data, then report what it did on data the chooser never saw.
 *
 * Picking the parameter that made the most money across the WHOLE history is
 * curve fitting — the result is guaranteed to look good and carries no
 * information about the future. The gap between the training and held-out
 * columns is the honest measure of how much of that result was luck.
 */
export function tune(
  bars: Bar[],
  factorId: FactorId,
  currentParam: number,
  inputs: FactorInputs = {},
): Tuning | null {
  const meta = getFactor(factorId);
  const splitIdx = Math.floor(bars.length * TRAIN_SHARE);
  if (splitIdx < 260 || bars.length - splitIdx < 60) return null;

  const splitDate = bars[splitIdx].date;
  const span = meta.max - meta.min;

  const params = Array.from({ length: SWEEP_STEPS }, (_, i) =>
    Math.round(meta.min + (span * i) / (SWEEP_STEPS - 1)),
  ).filter((v, i, arr) => arr.indexOf(v) === i);

  if (!params.includes(currentParam)) params.push(currentParam);
  params.sort((a, b) => a - b);

  const rows: TuningRow[] = params.map((param) => {
    const { curve, trades } = evaluate(bars, factorId, param, inputs);
    const start = curve[0].strategy;
    const mid = curve[splitIdx].strategy;
    const end = curve[curve.length - 1].strategy;

    return {
      param,
      trainPct: (mid / start - 1) * 100,
      testPct: (end / mid - 1) * 100,
      trades: trades.filter((t) => t.exitDate !== null).length,
    };
  });

  const chosen = rows.reduce((a, b) => (b.trainPct > a.trainPct ? b : a), rows[0]);
  const hindsight = rows.reduce((a, b) => (b.testPct > a.testPct ? b : a), rows[0]);
  const current = rows.find((r) => r.param === currentParam) ?? null;

  const bh =
    (bars[bars.length - 1].close / bars[splitIdx].close - 1) * 100;

  return {
    splitDate,
    trainBars: splitIdx,
    testBars: bars.length - splitIdx,
    rows,
    chosen,
    hindsight,
    current,
    testBuyHoldPct: bh,
    optimismGapPct: chosen.testPct - chosen.trainPct,
  };
}
