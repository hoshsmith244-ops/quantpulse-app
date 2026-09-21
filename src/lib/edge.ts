/**
 * What a result is actually worth — as opposed to how large it looks.
 *
 * The screener's raw fields answer a narrow question: did this rule, on this
 * ticker, over this window, end with more money than buying and holding? That
 * is not the question anyone is really asking, and the gap between the two is
 * where people lose money. Three separate things get conflated:
 *
 *   1. Is the pattern REAL?          -> t-statistic, trade count, stress tests
 *   2. Does it MAKE money?           -> annualised return, against cash
 *   3. Does it beat HOLDING?         -> annualised return, against buy-and-hold
 *
 * All three can disagree. A rule can beat holding by losing 4% a year while the
 * stock lost 22% -- a real, statistically sound way to lose money slightly more
 * slowly. Ranked by "edge over holding" that lands near the top of the list.
 * Seventeen of the fifty-three rules that survive every statistical test in the
 * current dataset lose money outright, and twenty-nine earn less than cash.
 *
 * Nothing here re-runs a backtest. It reads numbers the scan already produced
 * and says what they mean. No imports on purpose, so the build script and the
 * test harness can both use it.
 */

/**
 * Cash yield to beat, annualised percent.
 *
 * A strategy sitting in the market a quarter of the time has the other
 * three-quarters earning the short rate, and one that cannot clear that rate is
 * not paying for its own risk. Overridden per-dataset when the scan records the
 * real short rate; this default is a recent 13-week T-bill level and is
 * deliberately not zero, because zero flatters every result on the page.
 */
export const DEFAULT_CASH_RATE_PCT = 4.3;

/** Fewer completed trades than this and the sample cannot carry a conclusion. */
export const MIN_TRADES = 10;
/** Trades needed before the sample stops discounting the result at all. */
export const FULL_TRADES = 30;
/** |t| at which statistical confidence stops discounting the result. */
export const FULL_T = 3;
/**
 * Percentage points a year over cash below which the margin is called thin.
 * Not a rejection — a caveat. Clearing the short rate by a point or two while
 * accepting equity drawdown is a poor trade that passes every other test.
 */
export const THIN_MARGIN = 3;

export type EdgeRow = {
  /** Total strategy return over the whole window, percent. */
  ret: number;
  /** Total buy-and-hold return over the same window, percent. */
  bh: number;
  /** Completed round-trip trades. */
  n: number;
  /** t-statistic of the information coefficient. */
  t: number;
  /** Percent of days holding a position. */
  exp: number;
  /** Worst peak-to-trough, percent (negative). */
  dd: number;
  /** Beat holding once costs were raised to a punitive level. */
  costOk: boolean;
  /** Beat holding at neighbouring parameter values, not just the best one. */
  nbrOk: boolean;
  /**
   * Walk-forward result: this rule's return on a window the tuning never saw,
   * and buy-and-hold over that same window. Null when the scan did not run the
   * walk-forward for this row.
   *
   * This is the strongest evidence in the dataset and the only number here
   * that is not, in some sense, a description of the data it was fitted to.
   */
  oos?: number | null;
  oosBh?: number | null;
};

export type EdgeClass =
  /** Real, clears cash, beats holding, and held up on unseen data. */
  | "candidate"
  /**
   * Passed every in-sample test and then failed on the held-out window.
   * Kept as its own class rather than folded into "fragile": this is the
   * single most informative failure in the dataset, because it is the only
   * one measured on data the rule was not fitted to.
   */
  | "failed-forward"
  /** Real and beats holding, but does not make money. A cushion, not a trade. */
  | "cushion"
  /** Real and makes money, but holding the stock did better. */
  | "holding-wins"
  /** Points the right way but the sample is too thin or too fragile to trust. */
  | "fragile"
  /** Inside what chance produces. The normal answer. */
  | "noise";

export type Edge = {
  /** Strategy return per year, percent. */
  annStrategy: number;
  /** Buy-and-hold return per year, percent, same window. */
  annHold: number;
  /** Percentage points per year over holding. Can be positive while losing. */
  vsHold: number;
  /** Percentage points per year over cash. */
  vsCash: number;
  /** 0-1. How much the sample size and significance support the number. */
  confidence: number;
  /** vsHold discounted by confidence. The ranking key. */
  score: number;
  /**
   * Percentage points this rule beat holding by on the held-out window, or
   * null when the scan did not walk it forward. NOT annualised: the test
   * window is a slice, not a fixed term, so a per-year figure would imply a
   * precision the number does not have.
   */
  oosEdge: number | null;
  /** Beat holding on data the tuning never saw. Null when untested. */
  heldUp: boolean | null;
  cls: EdgeClass;
  /** One sentence. What this row actually is. */
  headline: string;
  /** Plain-English caveats, worst first. Safe to render as a list. */
  warnings: string[];
};

/** Total return over `years` -> return per year. */
export function annualise(totalPct: number, years: number): number {
  if (years <= 0) return 0;
  // A total loss is terminal; the geometric mean is undefined past -100%.
  const growth = 1 + totalPct / 100;
  if (growth <= 0) return -100;
  return (Math.pow(growth, 1 / years) - 1) * 100;
}

/**
 * How much weight the evidence can bear, 0-1.
 *
 * Two independent ways a result can be flattering: too few trades, and a weak
 * test statistic. Multiplying means either one alone is enough to pull the
 * ranking down, which is the behaviour we want -- a 35%/yr edge from fifteen
 * trades should not outrank a 20%/yr edge from sixty.
 */
export function confidenceOf(n: number, t: number): number {
  const sample = Math.min(1, n / FULL_TRADES);
  const stat = Math.min(1, Math.abs(t) / FULL_T);
  return sample * stat;
}

export function edgeOf(
  row: EdgeRow,
  years: number,
  cashRatePct: number = DEFAULT_CASH_RATE_PCT,
): Edge {
  const annStrategy = annualise(row.ret, years);
  const annHold = annualise(row.bh, years);
  const vsHold = annStrategy - annHold;
  const vsCash = annStrategy - cashRatePct;
  const confidence = confidenceOf(row.n, row.t);

  const significant = Math.abs(row.t) >= 2;
  const rightWay = row.t > 0;
  const enoughTrades = row.n >= MIN_TRADES;
  const survivedStress = row.costOk && row.nbrOk;

  const oosEdge =
    row.oos === null || row.oos === undefined || row.oosBh === null || row.oosBh === undefined
      ? null
      : row.oos - row.oosBh;
  // Absent is not the same as failed. The scan only walks forward the rows
  // that were worth the cost, so most of the dataset has no reading at all.
  const heldUp = oosEdge === null ? null : oosEdge > 0;

  const warnings: string[] = [];

  // Ordered worst-first: the UI truncates, and the first one has to be the
  // thing that would actually cost you money.
  if (annStrategy <= 0) {
    warnings.push("This rule lost money over the test window.");
  } else if (vsCash <= 0) {
    warnings.push(
      `Earned ${annStrategy.toFixed(1)}% a year — less than leaving the money in cash.`,
    );
  } else if (vsCash < THIN_MARGIN) {
    // Clearing cash by a whisker is not the same as being worth the risk. A
    // rule earning two points over T-bills while accepting a 20% drawdown is
    // a bad trade that passes every test above.
    warnings.push(
      `Only ${vsCash.toFixed(1)} points a year better than cash — thin pay for the risk.`,
    );
  }
  if (vsHold <= 0) {
    warnings.push("Simply holding the stock did better.");
  }
  if (!enoughTrades) {
    warnings.push(`Only ${row.n} completed trades — too few to conclude much.`);
  } else if (row.n < FULL_TRADES) {
    warnings.push(`${row.n} completed trades is a small sample.`);
  }
  if (!row.costOk) {
    warnings.push("Stopped beating holding once trading costs were raised.");
  }
  if (!row.nbrOk) {
    warnings.push(
      "Only works at this exact setting — nearby settings failed, which is the signature of a curve fit.",
    );
  }
  if (row.dd <= -35) {
    warnings.push(`Fell ${Math.abs(row.dd).toFixed(0)}% from its peak along the way.`);
  }

  let cls: EdgeClass;
  let headline: string;

  if (!significant || !rightWay) {
    cls = "noise";
    headline = "No real edge — this is what chance looks like";
  } else if (!enoughTrades || !survivedStress) {
    cls = "fragile";
    headline = "Real on paper, but it does not survive scrutiny";
  } else if (heldUp === false) {
    // Checked before the money tests on purpose. A rule that failed on unseen
    // data has told us the in-sample profit was a description of the past, so
    // there is nothing to be gained by grading that profit further.
    cls = "failed-forward";
    headline = "Worked on the test data, failed on fresh data";
    warnings.unshift(
      `Lost to holding by ${Math.abs(oosEdge ?? 0).toFixed(0)} points on data the tuning never saw.`,
    );
  } else if (vsHold <= 0) {
    cls = "holding-wins";
    headline = "Works, but holding the stock beat it";
  } else if (annStrategy <= cashRatePct) {
    cls = "cushion";
    headline =
      annStrategy <= 0
        ? "Lost less than holding — a cushion, not a trade"
        : "Beat holding, but earned less than cash";
  } else {
    cls = "candidate";
    headline = "Clears cash, beats holding, survives stress";
  }

  return {
    annStrategy,
    annHold,
    vsHold,
    vsCash,
    confidence,
    // Ranking deliberately uses edge over HOLDING, not raw return: a rule on a
    // stock that tripled should not rank above a rule that added more of its
    // own. Classification is what keeps money-losing cushions out of the list.
    score: vsHold * confidence,
    oosEdge,
    heldUp,
    cls,
    headline,
    warnings,
  };
}

/** True for rows a person should actually be shown as actionable. */
export function isCandidate(e: Edge): boolean {
  return e.cls === "candidate";
}

/**
 * Confidence as a phrase.
 *
 * "t = 6.24, n = 24" is precise and means nothing to most people reading it;
 * worse, a large t-stat beside a small trade count invites exactly the wrong
 * conclusion. One phrase carries the combined judgement, and the numbers stay
 * available for anyone who wants to check the arithmetic.
 */
export function evidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "strong evidence";
  if (confidence >= 0.5) return "moderate evidence";
  return "limited evidence";
}

export const EDGE_LABELS: Record<EdgeClass, string> = {
  candidate: "Candidate",
  "failed-forward": "Failed on fresh data",
  cushion: "Cushion only",
  "holding-wins": "Holding wins",
  fragile: "Too fragile",
  noise: "No edge",
};

export const EDGE_TONES: Record<EdgeClass, "up" | "amber" | "down" | "dim"> = {
  candidate: "up",
  "failed-forward": "down",
  cushion: "amber",
  "holding-wins": "amber",
  fragile: "dim",
  noise: "dim",
};
