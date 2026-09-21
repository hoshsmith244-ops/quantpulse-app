/**
 * Verifies the edge model, and then runs it over the real screener dataset.
 *
 * The cases below are not hypotheticals. Every one is taken from a row that
 * currently ranks near the top of the shipped screen.json, where the raw
 * "beat holding" number looks excellent and the result is worthless. If these
 * ever start classifying as `candidate`, the ranking has regressed to the
 * behaviour this model exists to prevent.
 *
 *   node scripts/check-edge.mts
 */

import {
  DEFAULT_CASH_RATE_PCT,
  annualise,
  confidenceOf,
  edgeOf,
  type EdgeRow,
} from "../src/lib/edge.ts";

let failures = 0;

function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n          got  ${JSON.stringify(got)}\n          want ${JSON.stringify(want)}`}`,
  );
}

function near(name: string, got: number, want: number, tol = 0.05) {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n          got  ${got}\n          want ~${want}`}`,
  );
}

const row = (over: Partial<EdgeRow>): EdgeRow => ({
  ret: 0,
  bh: 0,
  n: 40,
  t: 4,
  exp: 27,
  dd: -15,
  costOk: true,
  nbrOk: true,
  ...over,
});

const YEARS = 3;

// --- Annualising -----------------------------------------------------------
console.log("\nAnnualising");
near("doubling over 3y is ~26%/yr", annualise(100, YEARS), 25.99);
near("flat is 0", annualise(0, YEARS), 0);
near("-50% over 3y is ~-20.6%/yr", annualise(-50, YEARS), -20.63);
check("a total loss is floored at -100", annualise(-100, YEARS), -100);
check("beyond a total loss cannot go lower", annualise(-140, YEARS), -100);

// --- Confidence ------------------------------------------------------------
console.log("\nConfidence");
check("plenty of trades, strong t", confidenceOf(40, 4), 1);
check("half the trades halves it", confidenceOf(15, 4), 0.5);
check("weak t discounts it", confidenceOf(40, 1.5), 0.5);
check("both weak compounds", confidenceOf(15, 1.5), 0.25);
check("sign of t is irrelevant to strength", confidenceOf(40, -4), 1);

// --- The case this whole file exists for -----------------------------------
// ENPH/trendDistance, currently a top-10 row by "edge over holding":
// -0.2%/yr against a stock that lost 33.4%/yr. A 33-point "edge" that is
// really just a smaller loss.
console.log("\nA money-losing rule that beats holding");
const enph = edgeOf(row({ ret: -0.6, bh: -70.5, n: 18, t: 4.71, dd: -29 }), YEARS);
check("is not a candidate", enph.cls, "cushion");
check("says so plainly", enph.headline, "Lost less than holding — a cushion, not a trade");
check("leads with the loss", enph.warnings[0], "This rule lost money over the test window.");
near("still reports a large edge over holding", enph.vsHold, 33.2, 0.6);

// A rule that makes money, but less than cash: also not a trade.
console.log("\nA rule that earns less than cash");
const thin = edgeOf(row({ ret: 6, bh: -20, n: 40, t: 3 }), YEARS);
check("classified as cushion", thin.cls, "cushion");
check("names cash explicitly", thin.headline, "Beat holding, but earned less than cash");

// --- Holding simply wins ---------------------------------------------------
console.log("\nWhen holding wins");
const held = edgeOf(row({ ret: 40, bh: 120, n: 40, t: 3 }), YEARS);
check("classified", held.cls, "holding-wins");
check("warns", held.warnings.includes("Simply holding the stock did better."), true);

// --- Fragility -------------------------------------------------------------
console.log("\nFragility");
check(
  "too few trades is fragile, not a candidate",
  edgeOf(row({ ret: 200, bh: 10, n: 4, t: 3 }), YEARS).cls,
  "fragile",
);
check(
  "failing the cost stress is fragile",
  edgeOf(row({ ret: 200, bh: 10, costOk: false }), YEARS).cls,
  "fragile",
);
check(
  "working only at one setting is fragile",
  edgeOf(row({ ret: 200, bh: 10, nbrOk: false }), YEARS).cls,
  "fragile",
);
check(
  "curve-fit warning is explicit",
  edgeOf(row({ ret: 200, bh: 10, nbrOk: false }), YEARS).warnings.some((w) =>
    w.includes("curve fit"),
  ),
  true,
);

// --- Noise -----------------------------------------------------------------
console.log("\nNoise");
check("weak t is noise", edgeOf(row({ ret: 300, bh: 10, t: 0.5 }), YEARS).cls, "noise");
check("a real but INVERTED pattern is not tradeable here", edgeOf(row({ ret: 300, bh: 10, t: -4 }), YEARS).cls, "noise");

// --- A genuine candidate ---------------------------------------------------
console.log("\nA genuine candidate");
// CROX/trendDistance: 35.2%/yr against 11.7%/yr holding, 27 trades, t=4.13.
const crox = edgeOf(row({ ret: 147, bh: 39.4, n: 27, t: 4.13, dd: -15.2 }), YEARS);
check("classified", crox.cls, "candidate");
near("edge per year", crox.vsHold, 23.5, 0.6);
// 27 trades is under FULL_TRADES, so it still earns a soft note. A candidate
// is allowed to carry caveats -- what it must never carry is a reason not to
// trade it at all.
check("notes the sample size", crox.warnings, ["27 completed trades is a small sample."]);
const disqualifying = ["lost money", "less than leaving", "holding the stock did better"];
check(
  "carries no disqualifying warning",
  crox.warnings.some((w) => disqualifying.some((d) => w.includes(d))),
  false,
);

// --- Walk-forward ----------------------------------------------------------
// COP/trendDistance passes every in-sample test and then loses to holding by
// 23 points on the held-out window. That is the most informative failure the
// scan can produce and it must outrank the in-sample profit.
console.log("\nWalk-forward");
const cop = edgeOf(row({ ret: 14, bh: 10, n: 19, t: 4, oos: 14.9, oosBh: 38.2 }), YEARS);
check("failing forward is its own class", cop.cls, "failed-forward");
check("and leads the warnings", cop.warnings[0], "Lost to holding by 23 points on data the tuning never saw.");
check("reports the gap", Math.round(cop.oosEdge ?? 0), -23);
check("heldUp is false", cop.heldUp, false);

const walked = edgeOf(row({ ret: 147, bh: 39.4, n: 27, t: 4.13, oos: 55.9, oosBh: 15.5 }), YEARS);
check("holding up keeps candidate status", walked.cls, "candidate");
check("heldUp is true", walked.heldUp, true);
check("reports the margin", Math.round(walked.oosEdge ?? 0), 40);

// Most of the dataset is never walked forward. Absent must not read as failed.
const untested = edgeOf(row({ ret: 147, bh: 39.4, n: 27, t: 4.13 }), YEARS);
check("no walk-forward is not a failure", untested.cls, "candidate");
check("heldUp is null when untested", untested.heldUp, null);
check("oosEdge is null when untested", untested.oosEdge, null);

// --- Ranking behaviour -----------------------------------------------------
console.log("\nRanking");
const loud = edgeOf(row({ ret: 200, bh: 10, n: 12, t: 2.1 }), YEARS);
const solid = edgeOf(row({ ret: 120, bh: 10, n: 60, t: 5 }), YEARS);
check(
  "a bigger edge from a thinner sample ranks below a smaller well-evidenced one",
  solid.score > loud.score,
  true,
);
check("both are candidates on their own merits", [loud.cls, solid.cls], ["candidate", "candidate"]);

// --- Against the real dataset ----------------------------------------------
console.log("\nThe shipped dataset");
type DataRow = EdgeRow & { s: string; f: string; lvl: string; state: "in" | "out" };
const data = (await import("../public/screen.json", { with: { type: "json" } })).default as {
  years: number;
  rows: DataRow[];
  cashRatePct?: number;
};
const cash = data.cashRatePct ?? DEFAULT_CASH_RATE_PCT;
const scored = data.rows.map((r) => ({ r, e: edgeOf(r, data.years, cash) }));
const candidates = scored.filter((x) => x.e.cls === "candidate");
const cushions = scored.filter((x) => x.e.cls === "cushion");

console.log(`  ${data.rows.length} pairs scanned`);
console.log(`  ${candidates.length} candidates`);
console.log(`  ${cushions.length} cushions (beat holding, not worth trading)`);
console.log(`  ${candidates.filter((x) => x.r.state === "in").length} candidates currently in a position`);

check(
  "no candidate loses money",
  candidates.every((x) => x.e.annStrategy > 0),
  true,
);
check(
  "no candidate earns less than cash",
  candidates.every((x) => x.e.annStrategy > cash),
  true,
);
check(
  "no candidate is beaten by holding",
  candidates.every((x) => x.e.vsHold > 0),
  true,
);
check(
  "every candidate survived both stress tests",
  candidates.every((x) => x.r.costOk && x.r.nbrOk),
  true,
);
check(
  "no candidate failed its walk-forward",
  candidates.every((x) => x.e.heldUp !== false),
  true,
);
check("the list is not empty", candidates.length > 0, true);

// The old ranking put these at the very top. Prove they are gone.
const topByRawEdge = [...data.rows].sort((a, b) => b.ret - b.bh - (a.ret - a.bh)).slice(0, 10);
const survivors = topByRawEdge.filter((r) => edgeOf(r, data.years, cash).cls === "candidate");
console.log(
  `  of the 10 loudest rows by raw "beat holding", ${survivors.length} survive as candidates`,
);
check("the raw ranking's top 10 is mostly rejected", survivors.length <= 3, true);

console.log(
  failures === 0 ? "\nAll edge checks passed.\n" : `\n${failures} edge check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
