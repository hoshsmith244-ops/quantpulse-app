/**
 * Options research #2: trade volatility instead of direction.
 *
 *   A. Variance premium  -- on the six underlyings with free implied-vol
 *      history, how often and by how much does implied vol exceed the vol
 *      that is then realised? Priced as a short ATM straddle held to expiry.
 *   B. Forecasting       -- can daily bars forecast a stock's next-month
 *      realised vol? HAR model (the standard: yesterday, last week, last
 *      month) fitted on train across the universe, scored on test.
 *   C. Rich vs cheap     -- does "implied vol above our forecast" pick better
 *      times to sell than selling every day? Terciles set on train.
 *   D. Strategies -> vol -- do the five existing strategies predict a stock's
 *      coming volatility better than the forecast does? They barely predict
 *      direction; volatility is a different question.
 *
 * Train is everything up to 2023-09-29; test is after. The HAR coefficients and
 * the tercile thresholds are fitted on train only.
 *
 *   RESEARCH_CACHE=... node scripts/research/vol.mts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { FACTORS } from "../../src/lib/alpha.ts";
import type { Bar } from "../../src/lib/types.ts";

import { expandingRanks, WARMUP } from "./engine.mts";
import { computeFactor } from "../../src/lib/alpha.ts";
import { cacheDir, loadAll } from "./fetch.mts";
import { VOL_INDICES, type VolPoint } from "./fetch-vol.mts";

const TRAIN_END = "2023-09-29";
const RATE = 0.04;
const FLOOR = 1e-4;

const f = (v: number, d = 2) => (v >= 0 ? "+" : "") + v.toFixed(d);
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const pctl = (a: number[], p: number) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(s.length * p)))];
};

// ---------------------------------------------------------------------------
// Realised vol
// ---------------------------------------------------------------------------

function logRets(bars: Bar[]) {
  const r = new Float64Array(bars.length);
  for (let i = 1; i < bars.length; i++) r[i] = Math.log(bars[i].close / bars[i - 1].close);
  return r;
}

/** Annualised realised vol over r[a..b] inclusive, zero-mean convention. */
function rv(r: Float64Array, a: number, b: number) {
  let s = 0;
  for (let k = a; k <= b; k++) s += r[k] * r[k];
  return Math.sqrt((252 * s) / (b - a + 1));
}

type Feat = { d: number; w: number; m: number };
/** HAR inputs at the close of day i, all logs of annualised vol. */
function har(r: Float64Array, i: number): Feat | null {
  if (i < 22) return null;
  return {
    d: Math.log(Math.max(FLOOR, Math.abs(r[i]) * Math.sqrt(252))),
    w: Math.log(Math.max(FLOOR, rv(r, i - 4, i))),
    m: Math.log(Math.max(FLOOR, rv(r, i - 21, i))),
  };
}

// ---------------------------------------------------------------------------
// OLS for the HAR fit (4 coefficients, normal equations)
// ---------------------------------------------------------------------------

function ols(X: number[][], y: number[]) {
  const k = X[0].length;
  const A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (let n = 0; n < X.length; n++) {
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) A[i][j] += X[n][i] * X[n][j];
      A[i][k] += X[n][i] * y[n];
    }
  }
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const m = A[r][c] / A[c][c];
      for (let j = c; j <= k; j++) A[r][j] -= m * A[c][j];
    }
  }
  return A.map((row, i) => row[k] / A[i][i]);
}

const predict = (b: number[], x: Feat) => b[0] + b[1] * x.d + b[2] * x.w + b[3] * x.m;

// ---------------------------------------------------------------------------
// Black-Scholes ATM straddle, as a fraction of spot
// ---------------------------------------------------------------------------

function ncdf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return 0.5 * (1 + Math.sign(x) * y);
}
function straddle(sigma: number, years: number) {
  const s = sigma * Math.sqrt(years);
  const d1 = (RATE * years + (s * s) / 2) / s;
  const d2 = d1 - s;
  const disc = Math.exp(-RATE * years);
  return ncdf(d1) - disc * ncdf(d2) + (disc * ncdf(-d2) - ncdf(-d1));
}

// ===========================================================================

const all = loadAll();
const H = 21; // ~30 calendar days

// ---------------------------- B. Forecasting ------------------------------

const trainX: number[][] = [];
const trainY: number[] = [];
type Row = { sym: string; i: number; date: string; x: Feat; y: number; r: Float64Array; hv63: number; ewma: number };
const testRows: Row[] = [];
const allRows = new Map<string, Row[]>();

for (const s of all) {
  if (s.bars.length < 300) continue;
  const r = logRets(s.bars);
  let ew = r[1] * r[1];
  const rows: Row[] = [];
  for (let i = 1; i < s.bars.length; i++) {
    ew = 0.94 * ew + 0.06 * r[i] * r[i];
    if (i < 63 || i + H >= s.bars.length) continue;
    const x = har(r, i);
    if (!x) continue;
    const y = Math.log(Math.max(FLOOR, rv(r, i + 1, i + H)));
    const row: Row = { sym: s.symbol, i, date: s.bars[i].date, x, y, r, hv63: Math.log(Math.max(FLOOR, rv(r, i - 62, i))), ewma: Math.log(Math.max(FLOOR, Math.sqrt(252 * ew))) };
    rows.push(row);
    // A training target must END inside train, or test data leaks into the fit.
    if (s.bars[i + H].date <= TRAIN_END) {
      trainX.push([1, x.d, x.w, x.m]);
      trainY.push(y);
    } else if (s.bars[i].date > TRAIN_END) {
      testRows.push(row);
    }
  }
  allRows.set(s.symbol, rows);
}

const beta = ols(trainX, trainY);
const score = (name: string, fc: (r: Row) => number) => {
  const yh = testRows.map(fc);
  const y = testRows.map((r) => r.y);
  const my = mean(y);
  const sst = y.reduce((a, v) => a + (v - my) ** 2, 0);
  const sse = y.reduce((a, v, k) => a + (v - yh[k]) ** 2, 0);
  const mae = mean(y.map((v, k) => Math.abs(Math.exp(v) - Math.exp(yh[k])))) * 100;
  console.log(`   ${name.padEnd(30)} R2 (log vol) ${f(1 - sse / sst).padStart(6)}   mean abs error ${mae.toFixed(1)} vol pts`);
};
console.log(`B. FORECASTING next-month realised vol from daily bars -- ${testRows.length.toLocaleString()} stock-days on test`);
console.log(`   HAR fitted on train: log vol = ${beta[0].toFixed(2)} + ${beta[1].toFixed(2)}*day + ${beta[2].toFixed(2)}*week + ${beta[3].toFixed(2)}*month`);
score("last month's vol (naive)", (r) => r.x.m);
score("last quarter's vol", (r) => r.hv63);
score("EWMA (RiskMetrics 0.94)", (r) => r.ewma);
score("HAR (fitted on train)", (r) => predict(beta, r.x));

// ------------------------ A + C. Implied vs realised -----------------------

console.log(`\nA. VARIANCE PREMIUM -- implied vol vs the vol realised over its horizon, real CBOE indices`);
console.log(`   short ATM straddle priced at the index's implied vol, held to expiry; P&L as % of premium collected`);
console.log("   index   period  days  IV avg  RV avg  IV>RV  premium   straddle mean   worst 5%    worst");

type Trade = { date: string; iv: number; rvf: number; pnl: number; rich: number };
const byIndex: Record<string, Trade[]> = {};

for (const [sym, meta] of Object.entries(VOL_INDICES)) {
  const pts: VolPoint[] = JSON.parse(readFileSync(resolve(cacheDir(), `vol_${sym.replace("^", "")}.json`), "utf8"));
  const iv = new Map(pts.map((p) => [p.date, p.iv]));
  const und = all.find((s) => s.symbol === meta.underlying)!;
  const r = logRets(und.bars);
  const h = meta.days === 9 ? 6 : 21;
  const trades: Trade[] = [];
  for (let i = 63; i + h < und.bars.length; i++) {
    const v = iv.get(und.bars[i].date);
    const x = har(r, i);
    if (!v || !x) continue;
    const rvf = rv(r, i + 1, i + h);
    const prem = straddle(v, meta.days / 365);
    const move = Math.abs(und.bars[i + h].close / und.bars[i].close - 1);
    trades.push({ date: und.bars[i].date, iv: v, rvf, pnl: (prem - move) / prem, rich: Math.log(v) - predict(beta, x) });
  }
  byIndex[sym] = trades;
  for (const [label, set] of [["train", trades.filter((t) => t.date <= TRAIN_END)], ["test", trades.filter((t) => t.date > TRAIN_END)]] as const) {
    const pnl = set.map((t) => t.pnl * 100);
    console.log(
      `   ${sym.padEnd(7)} ${label.padEnd(6)} ${String(set.length).padStart(5)}  ${(mean(set.map((t) => t.iv)) * 100).toFixed(1).padStart(5)}%  ${(mean(set.map((t) => t.rvf)) * 100).toFixed(1).padStart(5)}%  ` +
        `${((set.filter((t) => t.iv > t.rvf).length / set.length) * 100).toFixed(0).padStart(4)}%  ${f(mean(set.map((t) => (t.iv - t.rvf) * 100)), 1).padStart(6)}pt   ` +
        `${f(mean(pnl), 1).padStart(8)}%   ${f(pctl(pnl, 0.05), 0).padStart(7)}%  ${f(Math.min(...pnl), 0).padStart(6)}%`,
    );
  }
}

console.log(`\nC. RICH vs CHEAP -- does "implied vol above our HAR forecast" pick better times to sell?`);
console.log("   terciles of (implied - forecast) set on TRAIN, applied unchanged to TEST; short straddle P&L % of premium");
console.log("   index    | TRAIN: cheap      middle     rich       | TEST: cheap      middle     rich");
for (const [sym, trades] of Object.entries(byIndex)) {
  const tr = trades.filter((t) => t.date <= TRAIN_END);
  const te = trades.filter((t) => t.date > TRAIN_END);
  const lo = pctl(tr.map((t) => t.rich), 1 / 3);
  const hi = pctl(tr.map((t) => t.rich), 2 / 3);
  const cell = (set: Trade[]) => {
    const p = set.map((t) => t.pnl * 100);
    return `${f(mean(p), 0).padStart(4)}% w${f(pctl(p, 0.05), 0).padStart(5)}`;
  };
  const split = (set: Trade[]) => [set.filter((t) => t.rich <= lo), set.filter((t) => t.rich > lo && t.rich <= hi), set.filter((t) => t.rich > hi)];
  console.log(`   ${sym.padEnd(8)} | ${split(tr).map(cell).join("  ")} | ${split(te).map(cell).join("  ")}`);
}
console.log("   (mean P&L, and w = worst 5% of trades)");

// ------------------------ D. Strategies -> volatility ----------------------

console.log(`\nD. DO THE STRATEGIES PREDICT VOLATILITY? next-month realised vol vs the HAR forecast, on signal days`);
console.log("   + means the stock got MORE volatile than forecast after the signal (options were cheap); - means less");
console.log("   strategy (fresh entry, app rule)   | TRAIN signals  vol surprise     t | TEST signals  vol surprise     t");
for (const fm of FACTORS) {
  if (fm.external) continue;
  const acc = { train: new Map<string, number[]>(), test: new Map<string, number[]>() };
  const base = { train: [] as number[], test: [] as number[] };
  for (const s of all) {
    const rows = allRows.get(s.symbol);
    if (!rows) continue;
    const ranks = expandingRanks(computeFactor(s.bars, fm.id, fm.def, {}));
    const inRule = (i: number) =>
      ranks.le[i] >= 0 && ranks.len[i] >= WARMUP && ranks.le[i] >= Math.floor((ranks.len[i] * 60) / 100) + 1;
    for (const row of rows) {
      const resid = row.y - predict(beta, row.x);
      const k = row.date <= TRAIN_END ? "train" : "test";
      if (k === "train" && s.bars[row.i + H].date > TRAIN_END) continue;
      base[k].push(resid);
      if (inRule(row.i) && !inRule(row.i - 1)) {
        const m = acc[k];
        if (!m.has(row.date)) m.set(row.date, []);
        m.get(row.date)!.push(resid);
      }
    }
  }
  const cells = (["train", "test"] as const).map((k) => {
    const b = mean(base[k]);
    // per-signal mean, standard error clustered by date
    const groups = [...acc[k].values()].map((g) => g.map((v) => v - b));
    const N = groups.reduce((a, g) => a + g.length, 0);
    const m = groups.reduce((a, g) => a + g.reduce((x, y) => x + y, 0), 0) / N;
    const ss = groups.reduce((a, g) => a + (g.reduce((x, y) => x + y, 0) - g.length * m) ** 2, 0);
    const se = Math.sqrt((ss * groups.length) / (groups.length - 1)) / N;
    return `${String(N).padStart(8)}    ${f((Math.exp(m) - 1) * 100, 1).padStart(6)}%  ${f(m / se, 1).padStart(5)}`;
  });
  console.log(`   ${fm.name.padEnd(34)} | ${cells[0]}   | ${cells[1]}`);
}
