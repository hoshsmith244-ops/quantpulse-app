import { DEFAULT_CASH_RATE_PCT, edgeOf, type Edge } from "./edge";
import type { ScreenData, ScreenRow, ScreenTicker } from "./screen";

/**
 * The daily list, built from the scan rather than from an opinion.
 *
 * Nothing here is generated, predicted or invented. Every name on the list is
 * a rule that already passed the statistical tests, already cleared cash and
 * holding, and is already in the state the list claims. The work is selection
 * and ordering — which is the honest version of "what should I look at today",
 * because the alternative (asking a model to pick stocks) would produce a
 * confident list with no measurable edge behind it.
 *
 * The important distinction this file draws, which the screener never did:
 *
 *   a rule being IN a position  !=  a signal to buy today
 *
 * The backtest entered on the day the rule triggered. A rule forty sessions
 * into a position has already captured most of what was measured, and buying
 * it now is a different trade with a different expected return. So "in" splits
 * into `fresh` and `holding`, and only `fresh` is presented as actionable.
 */

/**
 * Sessions after entry that a signal still counts as fresh.
 *
 * Tied to the scan's forward horizon: the statistics are measured over five
 * days, so five days is the window in which acting resembles what was tested.
 * Past that the number on the page stops describing the trade being offered.
 */
export const FRESH_SESSIONS = 5;

/** Percentile distance at which an out-of-market rule is worth watching. */
export const NEAR_TRIGGER = 85;

export type PickBucket =
  /** Entered within the horizon. The closest thing to a tested trade. */
  | "fresh"
  /** In a position, but long enough ago that entering now differs. */
  | "holding"
  /** Out, but close to triggering. The reason to keep a watchlist. */
  | "nearing"
  /** Out, and not close. Here for completeness. */
  | "waiting";

export type Pick = {
  key: string;
  row: ScreenRow;
  ticker: ScreenTicker | undefined;
  edge: Edge;
  bucket: PickBucket;
};

/**
 * How 1,390 backtests become a handful of names, one rejection at a time.
 *
 * Shown to the user verbatim. The point is not the final number but the shape
 * of the drop: it is the most compact honest argument that the survivors are
 * not just the luckiest rows in a large search.
 */
export type Funnel = {
  pairs: number;
  /** Statistically significant and pointing the right way. */
  significant: number;
  /** ...and survived cost and parameter-shift stress, on enough trades. */
  survived: number;
  /** ...and actually make money, above cash, above holding. */
  candidates: number;
  /** ...and are in a position right now. */
  live: number;
  /** ...and entered recently enough to still resemble the tested trade. */
  fresh: number;
};

export type Today = {
  asOf: string;
  cashRatePct: number;
  years: number;
  picks: Pick[];
  funnel: Funnel;
};

function bucketOf(row: ScreenRow): PickBucket {
  if (row.state === "in") {
    return row.days <= FRESH_SESSIONS ? "fresh" : "holding";
  }
  return (row.prox ?? 0) >= NEAR_TRIGGER ? "nearing" : "waiting";
}

const BUCKET_ORDER: Record<PickBucket, number> = {
  fresh: 0,
  nearing: 1,
  holding: 2,
  waiting: 3,
};

export function buildToday(data: ScreenData): Today {
  const cashRatePct = data.cashRatePct ?? DEFAULT_CASH_RATE_PCT;
  const years = data.years;

  const scored = data.rows.map((row) => ({ row, edge: edgeOf(row, years, cashRatePct) }));

  const significant = data.rows.filter((r) => r.lvl === "promising").length;
  const survived = scored.filter((x) => x.edge.cls !== "noise" && x.edge.cls !== "fragile").length;

  const candidates = scored.filter((x) => x.edge.cls === "candidate");

  const picks: Pick[] = candidates
    .map(({ row, edge }) => ({
      key: `${row.s}:${row.f}`,
      row,
      ticker: data.tickers[row.s],
      edge,
      bucket: bucketOf(row),
    }))
    .sort((a, b) => {
      // Actionability first, then strength of evidence. A merely strong result
      // that cannot be acted on today should not sit above a weaker one that
      // can.
      const byBucket = BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket];
      if (byBucket !== 0) return byBucket;
      return b.edge.score - a.edge.score;
    });

  return {
    asOf: data.asOf,
    cashRatePct,
    years,
    picks,
    funnel: {
      pairs: data.pairs,
      significant,
      survived,
      candidates: candidates.length,
      live: picks.filter((p) => p.row.state === "in").length,
      fresh: picks.filter((p) => p.bucket === "fresh").length,
    },
  };
}

export const BUCKET_LABELS: Record<PickBucket, string> = {
  fresh: "Entered in the last week",
  nearing: "Close to triggering",
  holding: "Already holding",
  waiting: "Not close",
};

/**
 * One sentence each. The long versions said the same thing three ways; what
 * cannot be shortened is the distinction between the groups, because that is
 * the part that stops "currently holding" being read as "buy this".
 */
export const BUCKET_BLURBS: Record<PickBucket, string> = {
  fresh:
    "The only group where the backtest describes the trade you would actually be making.",
  nearing:
    "Not in yet, but close. Watch these — an alert can only reach you for something on your watchlist.",
  holding:
    "Opened a while ago, so much of the move these numbers measure has already happened.",
  waiting: "Passed every test, but nowhere near triggering. Nothing to do yet.",
};
