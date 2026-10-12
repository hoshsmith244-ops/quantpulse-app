/**
 * Strategy research: choose settings on the past, judge them on the present.
 *
 * Two stages, run separately, so the choice is committed before the test data
 * is ever opened:
 *
 *   node scripts/research/sweep.mts train   -> selection.json
 *   node scripts/research/sweep.mts test    -> reads selection.json
 *
 * Every evaluation uses the app's own procedure exactly: 756 bars (three
 * years), a 252-bar warmup, then two years of trading. Train is three earlier
 * windows whose trading periods do not overlap -- Oct 2017-Sep 2019, Oct
 * 2019-Sep 2021, Oct 2021-Sep 2023 -- covering the 2018 selloff, the 2020
 * crash, the 2021 boom and the 2022 bear. Test is the window the app shows
 * today. Its warmup begins after the last train window ends.
 *
 * THE MEASURE. Timing excess: on each day a rule holds a stock, its net return
 * minus what random timing with the same exposure would have earned in that
 * same stock. Averaged across stocks per date, then a t-statistic over dates,
 * so correlated stocks are not counted as independent evidence. Subtracting
 * each stock's own drift also cancels most of the survivorship bias in a
 * universe made of today's survivors.
 *
 * PRE-REGISTERED SELECTION, per factor:
 *   1. positive timing excess in all three train windows
 *   2. highest pooled train t-statistic among those
 *   3. adopted only if it beats the app's current setting on test
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { FACTORS, type FactorId } from "../../src/lib/alpha.ts";

import { prepare, simulate, WINDOW_BARS, type Rule } from "./engine.mts";
import { loadAll, type Series } from "./fetch.mts";

const OUT = resolve(import.meta.dirname, "results");

const TRAIN_ENDS = ["2019-09-30", "2021-09-30", "2023-09-29"];

const PARAMS: Partial<Record<FactorId, number[]>> = {
  momentum: [21, 63, 126, 252],
  reversal: [2, 3, 5, 10, 21],
  riskAdjMomentum: [21, 63, 90, 126],
  trendDistance: [10, 20, 50, 100, 200],
  volumeThrust: [10, 20, 50],
};

function rules(): Rule[] {
  const out: Rule[] = [];
  for (const entryPct of [60, 70, 80, 90])
    for (const band of [0, 20])
      for (const maxHold of [null, 5, 10, 20])
        for (const trend of [false, true])
          out.push({ entryPct, exitPct: entryPct - band, maxHold, trend, costBps: 10 });
  return out;
}

export function ruleKey(f: FactorId, p: number, r: Rule): string {
  return `${f}|${p}|e${r.entryPct}|x${r.exitPct}|h${r.maxHold ?? "-"}|t${r.trend ? 1 : 0}`;
}

type WindowStats = {
  /** annualised timing excess, percent per year */
  excessAnn: number;
  tStat: number;
  days: number;
  trades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  medianHold: number;
  /** share of tickers where the rule beat holding over the trading period */
  beatHoldShare: number;
  exposure: number;
  tickers: number;
};

type Acc = {
  sum: Float64Array;
  cnt: Int32Array;
  trades: number;
  wins: number;
  sumWin: number;
  sumLoss: number;
  holdHist: Int32Array;
  beat: number;
  tickers: number;
  expoSum: number;
};

function newAcc(dates: number): Acc {
  return {
    sum: new Float64Array(dates),
    cnt: new Int32Array(dates),
    trades: 0,
    wins: 0,
    sumWin: 0,
    sumLoss: 0,
    holdHist: new Int32Array(WINDOW_BARS + 1),
    beat: 0,
    tickers: 0,
    expoSum: 0,
  };
}

function finish(a: Acc): WindowStats {
  const d: number[] = [];
  for (let i = 0; i < a.sum.length; i++) if (a.cnt[i] > 0) d.push(a.sum[i] / a.cnt[i]);
  const T = d.length;
  const mean = T ? d.reduce((x, y) => x + y, 0) / T : 0;
  const sd = T > 1 ? Math.sqrt(d.reduce((x, y) => x + (y - mean) ** 2, 0) / (T - 1)) : 0;

  let med = 0;
  let seen = 0;
  for (let h = 0; h < a.holdHist.length; h++) {
    seen += a.holdHist[h];
    if (seen * 2 >= a.trades) {
      med = h;
      break;
    }
  }
  const losses = a.trades - a.wins;
  return {
    excessAnn: mean * 252 * 100,
    tStat: sd > 0 ? (mean / sd) * Math.sqrt(T) : 0,
    days: T,
    trades: a.trades,
    winRate: a.trades ? (a.wins / a.trades) * 100 : 0,
    avgWin: a.wins ? a.sumWin / a.wins : 0,
    avgLoss: losses ? a.sumLoss / losses : 0,
    expectancy: a.trades ? (a.sumWin + a.sumLoss) / a.trades : 0,
    medianHold: med,
    beatHoldShare: a.tickers ? (a.beat / a.tickers) * 100 : 0,
    exposure: a.tickers ? (a.expoSum / a.tickers) * 100 : 0,
    tickers: a.tickers,
  };
}

/** One evaluation window: the app's 756 bars ending on or before `end`. */
function windowSlices(all: Series[], end: string) {
  const out: { symbol: string; bars: Series["bars"] }[] = [];
  for (const s of all) {
    let last = -1;
    for (let i = s.bars.length - 1; i >= 0; i--) {
      if (s.bars[i].date <= end) {
        last = i;
        break;
      }
    }
    if (last + 1 < WINDOW_BARS) continue;
    out.push({ symbol: s.symbol, bars: s.bars.slice(last + 1 - WINDOW_BARS, last + 1) });
  }
  return out;
}

/**
 * Evaluates every configuration of one factor+param on one window.
 * Returns stats keyed by rule key.
 */
function evaluateWindow(
  slices: ReturnType<typeof windowSlices>,
  dateIndex: Map<string, number>,
  factor: FactorId,
  param: number,
  ruleSet: Rule[],
) {
  const accs = ruleSet.map(() => newAcc(dateIndex.size));

  for (const { bars } of slices) {
    const di = new Int32Array(bars.length);
    for (let i = 0; i < bars.length; i++) di[i] = dateIndex.get(bars[i].date) ?? -1;
    const { ranks, trendMa } = prepare(bars, factor, param);

    for (let r = 0; r < ruleSet.length; r++) {
      const sim = simulate(bars, ranks, ruleSet[r], trendMa);
      const from = sim.liveFrom + 1;
      if (from >= bars.length - 20) continue;
      const a = accs[r];

      let held = 0;
      for (let i = from; i < bars.length; i++) held += sim.heldInto[i];
      const e = held / (bars.length - from);

      let strat = 1;
      for (let i = from; i < bars.length; i++) {
        const mkt = bars[i].close / bars[i - 1].close - 1;
        const x = sim.stratFactor[i] - 1 - e * mkt;
        const d = di[i];
        if (d >= 0) {
          a.sum[d] += x;
          a.cnt[d]++;
        }
        strat *= sim.stratFactor[i];
      }
      const hold = bars[bars.length - 1].close / bars[from - 1].close;
      if (strat > hold) a.beat++;
      a.tickers++;
      a.expoSum += e;

      for (const t of sim.trades) {
        if (t.exit === null) continue;
        a.trades++;
        if (t.returnPct > 0) {
          a.wins++;
          a.sumWin += t.returnPct;
        } else {
          a.sumLoss += t.returnPct;
        }
        a.holdHist[Math.min(t.barsHeld, WINDOW_BARS)]++;
      }
    }
  }
  return accs;
}

function merge(parts: Acc[]): Acc {
  const out = newAcc(parts[0].sum.length);
  for (const a of parts) {
    for (let i = 0; i < a.sum.length; i++) {
      out.sum[i] += a.sum[i];
      out.cnt[i] += a.cnt[i];
    }
    for (let h = 0; h < a.holdHist.length; h++) out.holdHist[h] += a.holdHist[h];
    out.trades += a.trades;
    out.wins += a.wins;
    out.sumWin += a.sumWin;
    out.sumLoss += a.sumLoss;
    out.beat += a.beat;
    out.tickers += a.tickers;
    out.expoSum += a.expoSum;
  }
  return out;
}

function run(stage: "train" | "test") {
  const all = loadAll();
  const lastDate = all.find((s) => s.symbol === "SPY")!.bars.at(-1)!.date;
  const ends = stage === "train" ? TRAIN_ENDS : [lastDate];

  const dates = [...new Set(all.flatMap((s) => s.bars.map((b) => b.date)))].sort();
  const dateIndex = new Map(dates.map((d, i) => [d, i]));
  const windows = ends.map((end) => windowSlices(all, end));
  const ruleSet = rules();

  const results: Record<string, { factor: FactorId; param: number; rule: Rule; windows: WindowStats[]; pooled: WindowStats }> = {};
  const t0 = Date.now();

  for (const f of FACTORS) {
    const params = PARAMS[f.id];
    if (!params) continue;
    for (const p of params) {
      const perWindow = windows.map((w) => evaluateWindow(w, dateIndex, f.id, p, ruleSet));
      ruleSet.forEach((r, i) => {
        results[ruleKey(f.id, p, r)] = {
          factor: f.id,
          param: p,
          rule: r,
          windows: perWindow.map((w) => finish(w[i])),
          // Trading periods never overlap, so summing per-date accumulators
          // is the same as concatenating the daily series.
          pooled: finish(merge(perWindow.map((w) => w[i]))),
        };
      });
      process.stderr.write(`  ${f.id} ${p} done (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`);
    }
  }
  return { results, ends, windows: windows.map((w) => w.length) };
}

function main() {
  const stage = process.argv[2] as "train" | "test";
  if (stage !== "train" && stage !== "test") {
    console.error("usage: sweep.mts train|test");
    process.exit(2);
  }
  mkdirSync(OUT, { recursive: true });

  if (stage === "train") {
    const { results, ends, windows } = run("train");
    writeFileSync(resolve(OUT, "train.json"), JSON.stringify({ ends, windows, results }));

    // --- Pre-registered selection. Reads ONLY train results. ---------------
    const selection: Record<string, { key: string; baseline: string }> = {};
    for (const f of FACTORS) {
      if (!PARAMS[f.id]) continue;
      const rows = Object.entries(results).filter(([, v]) => v.factor === f.id);
      const consistent = rows.filter(([, v]) => v.windows.every((w) => w.excessAnn > 0));
      const best = (consistent.length ? consistent : rows).reduce((a, b) =>
        b[1].pooled.tStat > a[1].pooled.tStat ? b : a,
      );
      const baseline = ruleKey(f.id, f.def, { entryPct: 60, exitPct: 60, maxHold: null, trend: false, costBps: 10 });
      selection[f.id] = { key: best[0], baseline };
    }
    writeFileSync(
      resolve(OUT, "selection.json"),
      JSON.stringify({ committedAt: new Date().toISOString(), selection }, null, 2),
    );
    console.log(`train: ${Object.keys(results).length} configurations over windows ending ${ends.join(", ")} (${windows.join("/")} tickers)`);
    console.log("selection committed to results/selection.json");
  } else {
    const sel = JSON.parse(readFileSync(resolve(OUT, "selection.json"), "utf8"));
    const { results, ends, windows } = run("test");
    writeFileSync(resolve(OUT, "test.json"), JSON.stringify({ ends, windows, results, selection: sel }));
    console.log(`test: window ending ${ends[0]} (${windows[0]} tickers); selection committed ${sel.committedAt}`);
  }
}

main();
