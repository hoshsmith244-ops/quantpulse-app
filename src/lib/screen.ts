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
  /** percent */
  profitMargin: number | null;
  /** percent */
  revenueGrowth: number | null;
  avgVolume: number | null;
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

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type Filters = {
  verdict: VerdictLevel | "all";
  factor: FactorId | "all";
  /** survives a 25 bps cost and a parameter shift either way */
  robust: boolean;
  cap: CapBucket | "all";
  pe: PeBucket | "none" | "all";
  sector: string;
  dividend: "all" | "pays" | "over2";
  beta: "all" | "under1" | "over1";
  state: "all" | "in" | "out";
  /** free-text ticker or company match */
  q: string;
};

export const DEFAULT_FILTERS: Filters = {
  verdict: "promising",
  factor: "all",
  robust: true,
  cap: "all",
  pe: "all",
  sector: "all",
  dividend: "all",
  beta: "all",
  state: "all",
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

/** True when any fundamental filter is doing work. */
export function hasFundamentalFilter(f: Filters) {
  return (
    f.cap !== "all" ||
    f.pe !== "all" ||
    f.sector !== "all" ||
    f.dividend !== "all" ||
    f.beta !== "all"
  );
}

export function countActive(f: Filters) {
  let n = 0;
  if (f.verdict !== DEFAULT_FILTERS.verdict) n++;
  if (f.factor !== "all") n++;
  if (!f.robust) n++;
  if (f.cap !== "all") n++;
  if (f.pe !== "all") n++;
  if (f.sector !== "all") n++;
  if (f.dividend !== "all") n++;
  if (f.beta !== "all") n++;
  if (f.state !== "all") n++;
  if (f.q.trim()) n++;
  return n;
}

export function applyFilters(data: ScreenData, f: Filters): FilterResult {
  let unknown = 0;
  const q = f.q.trim().toUpperCase();

  const rows = data.rows.filter((r) => {
    const t = data.tickers[r.s];
    if (!t) return false;

    if (f.verdict !== "all" && r.lvl !== f.verdict) return false;
    if (f.factor !== "all" && r.f !== f.factor) return false;
    if (f.state !== "all" && r.state !== f.state) return false;
    if (f.robust && !(r.costOk && r.nbrOk)) return false;

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

    if (f.beta !== "all") {
      if (t.beta === null) {
        unknown++;
        return false;
      }
      if (f.beta === "under1" && t.beta >= 1) return false;
      if (f.beta === "over1" && t.beta < 1) return false;
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

/** Sectors present in the data, sorted, for the picker. */
export function sectorsOf(data: ScreenData): string[] {
  const set = new Set<string>();
  for (const t of Object.values(data.tickers)) {
    if (t.sector) set.add(t.sector);
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
