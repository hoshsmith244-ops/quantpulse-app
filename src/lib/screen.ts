import type { FactorId } from "./alpha";

/**
 * The screener dataset and the filters over it.
 *
 * Two kinds of number live side by side here and they are NOT equivalent:
 *
 *   - Strategy statistics (ic, t, ret, oos, …) come from the same backtest the
 *     terminal runs, on price alone, with no lookahead.
 *   - Fundamentals (marketCap, pe, divYield, beta, …) are a snapshot of TODAY.
 *     They are a filter on which names you look at, never an input to the
 *     backtest — today's P/E did not exist three years ago, so scoring a
 *     three-year simulation with it would be lookahead bias.
 *
 * The UI keeps that distinction visible rather than blending the two into one
 * ranking, which is what a conventional screener would do.
 */

export type ScreenTicker = {
  name: string;
  /** EQUITY, ETF, CRYPTOCURRENCY, … */
  kind: string;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  pe: number | null;
  forwardPe: number | null;
  /** percent */
  divYield: number | null;
  beta: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  debtToEquity: number | null;
  /** percent */
  profitMargin: number | null;
  /** percent */
  revenueGrowth: number | null;
  /** percent of float sold short */
  shortPctFloat: number | null;
  avgVolume: number | null;
  /** average daily traded value in dollars */
  dollarVolume: number | null;
  /** annualised standard deviation of daily returns, percent */
  volatility: number | null;
  /** percent below the 52-week high */
  from52wHigh: number | null;
  price: number;
  bars: number;
};

export type VerdictLevel = "promising" | "mixed" | "inverted" | "weak";

export type ScreenRow = {
  s: string;
  f: FactorId;
  p: number;
  lvl: VerdictLevel;
  ic: number;
  t: number;
  n: number;
  win: number;
  ret: number;
  bh: number;
  sharpe: number;
  dd: number;
  exp: number;
  state: "in" | "out";
  oos: number | null;
  oosBh: number | null;
  costOk: boolean;
  nbrOk: boolean;
};

export type ScreenData = {
  generatedAt: string;
  asOf: string;
  years: number;
  horizon: number;
  costBps: number;
  stressCostBps: number;
  neighbourShift: number;
  universe: number;
  pairs: number;
  counts: Partial<Record<VerdictLevel, number>>;
  failed: string[];
  tickers: Record<string, ScreenTicker>;
  rows: ScreenRow[];
};

// ---------------------------------------------------------------------------
// Buckets
// ---------------------------------------------------------------------------

export type CapBucket = "mega" | "large" | "mid" | "small";

export const CAP_LABELS: Record<CapBucket, string> = {
  mega: "Mega · over $200B",
  large: "Large · $10–200B",
  mid: "Mid · $2–10B",
  small: "Small · under $2B",
};

export function capBucket(marketCap: number | null): CapBucket | null {
  if (marketCap === null) return null;
  if (marketCap >= 200e9) return "mega";
  if (marketCap >= 10e9) return "large";
  if (marketCap >= 2e9) return "mid";
  return "small";
}

export type PeBucket = "under15" | "15to25" | "25to40" | "over40";

export const PE_LABELS: Record<PeBucket, string> = {
  under15: "Under 15",
  "15to25": "15 – 25",
  "25to40": "25 – 40",
  over40: "Over 40",
};

export function peBucket(pe: number | null): PeBucket | null {
  if (pe === null) return null;
  if (pe < 15) return "under15";
  if (pe < 25) return "15to25";
  if (pe < 40) return "25to40";
  return "over40";
}

export const VERDICT_LABELS: Record<VerdictLevel, string> = {
  promising: "Worth a closer look",
  mixed: "Real, but it did not pay",
  inverted: "Backwards on this stock",
  weak: "No real edge",
};

export type LiquidityBucket = "high" | "medium" | "low";

export const LIQUIDITY_LABELS: Record<LiquidityBucket, string> = {
  high: "Heavy · over $100M a day",
  medium: "Moderate · $10–100M a day",
  low: "Thin · under $10M a day",
};

/**
 * Liquidity matters more here than any valuation ratio.
 *
 * Every backtest on this page charges a flat 10 bps round trip, which is only
 * honest on a name that actually trades. Below roughly $10M a day the real
 * spread is wider than the modelled cost, so the edge shown is partly fiction.
 */
export function liquidityBucket(dollarVolume: number | null): LiquidityBucket | null {
  if (dollarVolume === null) return null;
  if (dollarVolume >= 100e6) return "high";
  if (dollarVolume >= 10e6) return "medium";
  return "low";
}

export type VolBucket = "calm" | "normal" | "wild";

export const VOL_LABELS: Record<VolBucket, string> = {
  calm: "Calm · under 20%",
  normal: "Normal · 20–40%",
  wild: "Wild · over 40%",
};

export function volBucket(volatility: number | null): VolBucket | null {
  if (volatility === null) return null;
  if (volatility < 20) return "calm";
  if (volatility < 40) return "normal";
  return "wild";
}

/** Sample-size floors offered in the picker. */
export const TRADE_FLOORS = [0, 10, 20, 50] as const;

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type Filters = {
  // --- What the backtest found -------------------------------------------
  verdict: VerdictLevel | "all";
  factor: FactorId | "all";
  /** survives a 25 bps cost and a parameter shift either way */
  robust: boolean;
  state: "all" | "in" | "out";
  /** minimum completed trades — a guard against tiny samples */
  minTrades: number;
  /** only rows whose out-of-sample result also beat buy & hold */
  oos: "all" | "beat";
  /** exclude strategies that beat holding while still losing money */
  profitableOnly: boolean;

  // --- The company --------------------------------------------------------
  sector: string;
  industry: string;
  cap: CapBucket | "all";
  pe: PeBucket | "none" | "all";
  dividend: "all" | "pays" | "over2";
  earnings: "all" | "profitable" | "unprofitable";
  growth: "all" | "growing" | "shrinking";

  // --- Risk and tradeability ---------------------------------------------
  liquidity: LiquidityBucket | "all";
  volatility: VolBucket | "all";
  beta: "all" | "under1" | "over1";
  shortInterest: "all" | "heavy";

  /** free-text ticker or company match */
  q: string;
};

export const DEFAULT_FILTERS: Filters = {
  verdict: "promising",
  factor: "all",
  robust: true,
  state: "all",
  minTrades: 0,
  oos: "all",
  profitableOnly: false,
  sector: "all",
  industry: "all",
  cap: "all",
  pe: "all",
  dividend: "all",
  earnings: "all",
  growth: "all",
  liquidity: "all",
  volatility: "all",
  beta: "all",
  shortInterest: "all",
  q: "",
};

export type FilterResult = {
  rows: ScreenRow[];
  /**
   * Rows dropped because the ticker has no value for an active fundamental
   * filter — an ETF has no P/E, an unprofitable company has no positive one.
   * Surfaced rather than silently folded into the result, because "excluded
   * for missing data" and "failed the test" are different answers.
   */
  unknown: number;
};

/** True when any company or risk filter is doing work. */
export function hasFundamentalFilter(f: Filters) {
  return (
    f.cap !== "all" ||
    f.pe !== "all" ||
    f.sector !== "all" ||
    f.industry !== "all" ||
    f.dividend !== "all" ||
    f.earnings !== "all" ||
    f.growth !== "all" ||
    f.liquidity !== "all" ||
    f.volatility !== "all" ||
    f.beta !== "all" ||
    f.shortInterest !== "all"
  );
}

export function countActive(f: Filters) {
  let n = 0;
  if (f.verdict !== DEFAULT_FILTERS.verdict) n++;
  if (f.factor !== "all") n++;
  if (!f.robust) n++;
  if (f.state !== "all") n++;
  if (f.minTrades > 0) n++;
  if (f.oos !== "all") n++;
  if (f.profitableOnly) n++;
  if (f.sector !== "all") n++;
  if (f.industry !== "all") n++;
  if (f.cap !== "all") n++;
  if (f.pe !== "all") n++;
  if (f.dividend !== "all") n++;
  if (f.earnings !== "all") n++;
  if (f.growth !== "all") n++;
  if (f.liquidity !== "all") n++;
  if (f.volatility !== "all") n++;
  if (f.beta !== "all") n++;
  if (f.shortInterest !== "all") n++;
  if (f.q.trim()) n++;
  return n;
}

export function applyFilters(data: ScreenData, f: Filters): FilterResult {
  let unknown = 0;
  const q = f.q.trim().toUpperCase();

  const rows = data.rows.filter((r) => {
    const t = data.tickers[r.s];
    if (!t) return false;

    // --- The backtest ------------------------------------------------------
    if (f.verdict !== "all" && r.lvl !== f.verdict) return false;
    if (f.factor !== "all" && r.f !== f.factor) return false;
    if (f.state !== "all" && r.state !== f.state) return false;
    if (f.robust && !(r.costOk && r.nbrOk)) return false;
    if (f.minTrades > 0 && r.n < f.minTrades) return false;
    // Beating a stock that fell is not a profit, even when the edge is large.
    if (f.profitableOnly && r.ret <= 0) return false;

    if (f.oos === "beat") {
      // Only computed where it is meaningful; unknown never counts as a pass.
      if (r.oos === null || r.oosBh === null) {
        unknown++;
        return false;
      }
      if (r.oos <= r.oosBh) return false;
    }

    if (q && !r.s.includes(q) && !t.name.toUpperCase().includes(q)) {
      return false;
    }

    // Fundamentals. A missing value is never treated as a pass.
    if (f.cap !== "all") {
      const b = capBucket(t.marketCap);
      if (b === null) {
        unknown++;
        return false;
      }
      if (b !== f.cap) return false;
    }

    if (f.pe !== "all") {
      if (f.pe === "none") {
        // Explicitly asking for the no-earnings bucket, which only makes sense
        // for something that could have earnings in the first place.
        if (t.kind !== "EQUITY") return false;
        if (t.pe !== null) return false;
      } else {
        const b = peBucket(t.pe);
        if (b === null) {
          unknown++;
          return false;
        }
        if (b !== f.pe) return false;
      }
    }

    if (f.sector !== "all") {
      if (t.sector === null) {
        unknown++;
        return false;
      }
      if (t.sector !== f.sector) return false;
    }

    if (f.dividend !== "all") {
      if (t.divYield === null) {
        unknown++;
        return false;
      }
      if (f.dividend === "pays" && t.divYield <= 0) return false;
      if (f.dividend === "over2" && t.divYield < 2) return false;
    }

    if (f.industry !== "all") {
      if (t.industry === null) {
        unknown++;
        return false;
      }
      if (t.industry !== f.industry) return false;
    }

    if (f.earnings !== "all") {
      if (t.profitMargin === null) {
        unknown++;
        return false;
      }
      if (f.earnings === "profitable" && t.profitMargin <= 0) return false;
      if (f.earnings === "unprofitable" && t.profitMargin > 0) return false;
    }

    if (f.growth !== "all") {
      if (t.revenueGrowth === null) {
        unknown++;
        return false;
      }
      if (f.growth === "growing" && t.revenueGrowth <= 0) return false;
      if (f.growth === "shrinking" && t.revenueGrowth > 0) return false;
    }

    // --- Risk and tradeability ---------------------------------------------
    if (f.liquidity !== "all") {
      const b = liquidityBucket(t.dollarVolume);
      if (b === null) {
        unknown++;
        return false;
      }
      if (b !== f.liquidity) return false;
    }

    if (f.volatility !== "all") {
      const b = volBucket(t.volatility);
      if (b === null) {
        unknown++;
        return false;
      }
      if (b !== f.volatility) return false;
    }

    if (f.beta !== "all") {
      if (t.beta === null) {
        unknown++;
        return false;
      }
      if (f.beta === "under1" && t.beta >= 1) return false;
      if (f.beta === "over1" && t.beta < 1) return false;
    }

    if (f.shortInterest === "heavy") {
      if (t.shortPctFloat === null) {
        unknown++;
        return false;
      }
      if (t.shortPctFloat < 10) return false;
    }

    return true;
  });

  return { rows, unknown };
}

export type SortKey = "edge" | "return" | "evidence" | "trades" | "symbol";

export function sortRows(rows: ScreenRow[], key: SortKey): ScreenRow[] {
  const rank = { promising: 3, mixed: 2, inverted: 1, weak: 0 };
  return [...rows].sort((a, b) => {
    switch (key) {
      case "return":
        return b.ret - a.ret;
      case "evidence":
        return rank[b.lvl] - rank[a.lvl] || Math.abs(b.t) - Math.abs(a.t);
      case "trades":
        return b.n - a.n;
      case "symbol":
        return a.s.localeCompare(b.s) || a.f.localeCompare(b.f);
      default:
        return b.ret - b.bh - (a.ret - a.bh);
    }
  });
}

/**
 * How many tickers fall in each bucket, for the pickers.
 *
 * Shown beside every option so an empty slice is visible before it is chosen.
 * A filter that silently returns nothing reads as broken; "Mid · $2–10B (0)"
 * reads as an honest gap in the universe.
 *
 * Counted over tickers rather than rows, and unconditioned by the other
 * filters — it answers "does this slice exist at all", not "what would I get
 * given everything else I have set".
 */
export type BucketCounts = {
  cap: Record<string, number>;
  pe: Record<string, number>;
  liquidity: Record<string, number>;
  volatility: Record<string, number>;
};

export function bucketCounts(data: ScreenData): BucketCounts {
  const counts: BucketCounts = { cap: {}, pe: {}, liquidity: {}, volatility: {} };
  const bump = (m: Record<string, number>, k: string | null) => {
    if (k) m[k] = (m[k] ?? 0) + 1;
  };

  for (const t of Object.values(data.tickers)) {
    bump(counts.cap, capBucket(t.marketCap));
    bump(counts.pe, peBucket(t.pe));
    if (t.pe === null && t.kind === "EQUITY") bump(counts.pe, "none");
    bump(counts.liquidity, liquidityBucket(t.dollarVolume));
    bump(counts.volatility, volBucket(t.volatility));
  }

  return counts;
}

/**
 * Weekdays elapsed since the screen was built.
 *
 * Calendar days would cry stale every Monday about a perfectly current Friday
 * build, which trains people to ignore the warning. Counting weekdays is not
 * a holiday calendar, but it is right the other 250 days a year and costs
 * nothing.
 */
export function sessionsSince(asOf: string, now: Date = new Date()): number {
  const start = new Date(`${asOf}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return 0;

  let count = 0;
  const cursor = new Date(start);
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/**
 * How much to trust a screen of this age.
 *
 * The signals move on the daily close, so one session behind is simply normal
 * between builds. Beyond that the entry and exit states on the page are
 * describing a market that has since moved on, which is worth saying loudly on
 * a tool whose purpose is deciding what to do today.
 */
export function stalenessOf(asOf: string, now: Date = new Date()) {
  const sessions = sessionsSince(asOf, now);
  return {
    sessions,
    level: sessions <= 1 ? ("fresh" as const) : sessions <= 4 ? ("aging" as const) : ("stale" as const),
  };
}

/** Sectors present in the data, sorted, for the picker. */
export function sectorsOf(data: ScreenData): string[] {
  const set = new Set<string>();
  for (const t of Object.values(data.tickers)) {
    if (t.sector) set.add(t.sector);
  }
  return [...set].sort();
}

/**
 * Industries, narrowed to the chosen sector.
 *
 * Offering all ~90 industries at once would be a wall of options, most of
 * which return nothing once a sector is set.
 */
export function industriesOf(data: ScreenData, sector: string): string[] {
  const set = new Set<string>();
  for (const t of Object.values(data.tickers)) {
    if (!t.industry) continue;
    if (sector !== "all" && t.sector !== sector) continue;
    set.add(t.industry);
  }
  return [...set].sort();
}

/** Compact market cap, e.g. $4.85T / $341B / $22.1B. */
export function fmtCap(v: number | null): string {
  if (v === null) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(v >= 100e9 ? 0 : 1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toFixed(0)}`;
}
