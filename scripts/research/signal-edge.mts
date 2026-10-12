/**
 * Options research #1: is any version of the existing signals strong enough,
 * PER SIGNAL, to survive option costs?
 *
 * The strategy sweep optimised edge per calendar year, which rewards firing
 * often. An option charges its spread and its implied-vol markup on every
 * trade, so what matters here is how much each individual signal moves the
 * odds -- measured in units of the stock's own volatility, the unit options
 * are priced in.
 *
 * Signals are built only from the five existing strategies at their current
 * settings. Nothing about how any strategy scores a stock changes; the
 * variants differ only in WHICH of its readings count as a signal:
 *
 *   - extremity     fresh crossing into the top 40/20/10/5% of its own history
 *   - agreement     two mean-reversion strategies at once; or any k of five
 *   - regime        trend distance only when VIX is high/low, SPY above/below
 *                   its 200-day average
 *
 * Bearish counts. A strategy that reliably points the wrong way is useless to
 * a long-only stock rule and potentially useful to a put buyer, so a variant's
 * direction is whatever its train-window edge says it is.
 *
 * Same discipline as the strategy sweep: app procedure (756 bars, expanding
 * percentiles), three train windows, selection committed to disk before the
 * test window is opened.
 *
 *   node scripts/research/signal-edge.mts train
 *   node scripts/research/signal-edge.mts test
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { FACTORS, type FactorId } from "../../src/lib/alpha.ts";
import type { Bar } from "../../src/lib/types.ts";

import { prepare, WARMUP, WINDOW_BARS } from "./engine.mts";
import { cacheDir, loadAll } from "./fetch.mts";

const OUT = resolve(import.meta.dirname, "results");
const TRAIN_ENDS = ["2019-09-30", "2021-09-30", "2023-09-29"];
export const H = [1, 3, 5, 10];
const PRIMARY = 2; // index into H -> 5 trading days, a weekly-option horizon
const SIGMA_DAYS = 60;
const RATE = 0.04;
/** Implied vol as a multiple of trailing realised vol, and half-spread as a share of premium. */
export const MARKUPS = [1.0, 1.1, 1.2];
export const SPREADS = [0.03, 0.08];

const STRATS = FACTORS.filter((f) => !f.external).map((f) => f.id);

// ---------------------------------------------------------------------------
// Per ticker-window context
// ---------------------------------------------------------------------------

type Ctx = {
  bars: Bar[];
  le: Record<string, Int32Array>;
  len: Record<string, Int32Array>;
  sigma: Float64Array;
  z: Float64Array[];
  base: number[];
};

function context(bars: Bar[]): Ctx {
  const n = bars.length;
  const le: Record<string, Int32Array> = {};
  const len: Record<string, Int32Array> = {};
  for (const f of STRATS) {
    const meta = FACTORS.find((x) => x.id === f)!;
    const { ranks } = prepare(bars, f, meta.def);
    le[f] = ranks.le;
    len[f] = ranks.len;
  }
  const lr = new Float64Array(n);
  for (let i = 1; i < n; i++) lr[i] = Math.log(bars[i].close / bars[i - 1].close);
  const sigma = new Float64Array(n).fill(NaN);
  for (let i = SIGMA_DAYS; i < n; i++) {
    let m = 0;
    for (let k = i - SIGMA_DAYS + 1; k <= i; k++) m += lr[k];
    m /= SIGMA_DAYS;
    let v = 0;
    for (let k = i - SIGMA_DAYS + 1; k <= i; k++) v += (lr[k] - m) ** 2;
    sigma[i] = Math.sqrt(v / (SIGMA_DAYS - 1));
  }
  const z = H.map((h) => {
    const a = new Float64Array(n).fill(NaN);
    for (let i = WARMUP; i + h < n; i++) {
      if (sigma[i] > 0) a[i] = Math.log(bars[i + h].close / bars[i].close) / (sigma[i] * Math.sqrt(h));
    }
    return a;
  });
  // The stock's ordinary drift over this window, so an edge is measured
  // against this stock's normal day rather than against zero.
  const base = z.map((a) => {
    let s = 0;
    let c = 0;
    for (const v of a) if (Number.isFinite(v)) { s += v; c++; }
    return c ? s / c : 0;
  });
  return { bars, le, len, sigma, z, base };
}

const top = (c: Ctx, f: FactorId, pct: number, i: number) => {
  const L = c.len[f][i];
  return c.le[f][i] >= 0 && L >= WARMUP && c.le[f][i] >= Math.floor((L * pct) / 100) + 1;
};

// ---------------------------------------------------------------------------
// Market regime, known at the close of each day -- no lookahead
// ---------------------------------------------------------------------------

function regimes(all: ReturnType<typeof loadAll>) {
  const vix: { date: string; iv: number }[] = JSON.parse(
    readFileSync(resolve(cacheDir(), "vol_VIX.json"), "utf8"),
  );
  const vixHigh = new Map<string, boolean>();
  for (let i = 252; i < vix.length; i++) {
    const w = vix.slice(i - 252, i).map((p) => p.iv).sort((a, b) => a - b);
    vixHigh.set(vix[i].date, vix[i].iv > w[w.length >> 1]);
  }
  const spy = all.find((s) => s.symbol === "SPY")!.bars;
  const spyUp = new Map<string, boolean>();
  let sum = 0;
  for (let i = 0; i < spy.length; i++) {
    sum += spy[i].close;
    if (i >= 200) sum -= spy[i - 200].close;
    if (i >= 199) spyUp.set(spy[i].date, spy[i].close > sum / 200);
  }
  return { vixHigh, spyUp };
}

// ---------------------------------------------------------------------------
// Variants -- the full list, fixed before any result is seen
// ---------------------------------------------------------------------------

type Variant = { id: string; cond: (c: Ctx, i: number) => boolean };

function variants(reg: ReturnType<typeof regimes>): Variant[] {
  const v: Variant[] = [];
  for (const f of STRATS)
    for (const p of [60, 80, 90, 95]) v.push({ id: `${f} top${100 - p}%`, cond: (c, i) => top(c, f, p, i) });
  for (const p of [60, 80, 90])
    v.push({
      id: `reversal+trendDistance both top${100 - p}%`,
      cond: (c, i) => top(c, "reversal", p, i) && top(c, "trendDistance", p, i),
    });
  for (const k of [2, 3])
    for (const p of [80, 90])
      v.push({
        id: `any ${k} of 5 top${100 - p}%`,
        cond: (c, i) => STRATS.filter((f) => top(c, f, p, i)).length >= k,
      });
  const d = (c: Ctx, i: number) => c.bars[i].date;
  for (const p of [60, 90]) {
    v.push({ id: `trendDistance top${100 - p}% | VIX high`, cond: (c, i) => top(c, "trendDistance", p, i) && reg.vixHigh.get(d(c, i)) === true });
    v.push({ id: `trendDistance top${100 - p}% | VIX low`, cond: (c, i) => top(c, "trendDistance", p, i) && reg.vixHigh.get(d(c, i)) === false });
    v.push({ id: `trendDistance top${100 - p}% | SPY bull`, cond: (c, i) => top(c, "trendDistance", p, i) && reg.spyUp.get(d(c, i)) === true });
    v.push({ id: `trendDistance top${100 - p}% | SPY bear`, cond: (c, i) => top(c, "trendDistance", p, i) && reg.spyUp.get(d(c, i)) === false });
  }
  return v;
}

// ---------------------------------------------------------------------------
// Option pricing -- Black-Scholes, ATM, held to expiry
// ---------------------------------------------------------------------------

function ncdf(x: number) {
  // Abramowitz-Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return 0.5 * (1 + Math.sign(x) * y);
}

/** ATM call and put premiums as a fraction of spot. */
function atm(sigmaAnnual: number, years: number) {
  const s = sigmaAnnual * Math.sqrt(years);
  const d1 = (RATE * years + (s * s) / 2) / s;
  const d2 = d1 - s;
  const disc = Math.exp(-RATE * years);
  return { call: ncdf(d1) - disc * ncdf(d2), put: disc * ncdf(-d2) - ncdf(-d1) };
}

// ---------------------------------------------------------------------------
// Accumulation
// ---------------------------------------------------------------------------

type Acc = {
  n: number[];
  edge: number[];
  up: number[];
  bySum: Float64Array[];
  byCnt: Int32Array[];
  /** [h][markup][spread] summed option return, calls and puts */
  call: number[][][];
  put: number[][][];
  callWin: number[][][];
  putWin: number[][][];
};

const grid = () => H.map(() => MARKUPS.map(() => SPREADS.map(() => 0)));
const newAcc = (D: number): Acc => ({
  n: H.map(() => 0),
  edge: H.map(() => 0),
  up: H.map(() => 0),
  bySum: H.map(() => new Float64Array(D)),
  byCnt: H.map(() => new Int32Array(D)),
  call: grid(),
  put: grid(),
  callWin: grid(),
  putWin: grid(),
});

function merge(parts: Acc[], D: number): Acc {
  const o = newAcc(D);
  for (const a of parts)
    H.forEach((_, h) => {
      o.n[h] += a.n[h];
      o.edge[h] += a.edge[h];
      o.up[h] += a.up[h];
      for (let d = 0; d < D; d++) {
        o.bySum[h][d] += a.bySum[h][d];
        o.byCnt[h][d] += a.byCnt[h][d];
      }
      MARKUPS.forEach((_, m) =>
        SPREADS.forEach((_, s) => {
          o.call[h][m][s] += a.call[h][m][s];
          o.put[h][m][s] += a.put[h][m][s];
          o.callWin[h][m][s] += a.callWin[h][m][s];
          o.putWin[h][m][s] += a.putWin[h][m][s];
        }),
      );
    });
  return o;
}

export type Stats = {
  n: number;
  edge: number[];
  t: number[];
  upRate: number[];
  /** mean return per option trade, percent, [h][markup][spread] */
  call: number[][][];
  put: number[][][];
  callWin: number[][][];
  putWin: number[][][];
};

function finish(a: Acc): Stats {
  /**
   * t of the PER-SIGNAL mean, with standard errors clustered by date.
   *
   * An earlier version took the mean of per-date means, which weights a crash
   * day carrying 200 signals the same as a quiet day carrying one -- a
   * different estimator from the per-signal edge reported beside it, and on
   * clustered signals the two disagreed in sign. Clustering the error instead
   * keeps one estimator: each signal is one trade, but signals on the same day
   * are not independent evidence.
   */
  const t = H.map((_, h) => {
    const N = a.n[h];
    if (N < 3) return 0;
    const mean = a.edge[h] / N;
    let ss = 0;
    let G = 0;
    for (let k = 0; k < a.byCnt[h].length; k++) {
      if (!a.byCnt[h][k]) continue;
      G++;
      ss += (a.bySum[h][k] - a.byCnt[h][k] * mean) ** 2;
    }
    if (G < 3) return 0;
    const se = Math.sqrt((ss * G) / (G - 1)) / N;
    return se > 0 ? mean / se : 0;
  });
  const per = (g: number[][][], dn: number[]) =>
    g.map((row, h) => row.map((r) => r.map((v) => (dn[h] ? (v / dn[h]) * 100 : 0))));
  return {
    n: a.n[PRIMARY],
    edge: a.edge.map((v, h) => (a.n[h] ? v / a.n[h] : 0)),
    t,
    upRate: a.up.map((v, h) => (a.n[h] ? (v / a.n[h]) * 100 : 0)),
    call: per(a.call, a.n),
    put: per(a.put, a.n),
    callWin: per(a.callWin, a.n),
    putWin: per(a.putWin, a.n),
  };
}

function evaluate(ends: string[]) {
  const all = loadAll();
  const reg = regimes(all);
  const vs = variants(reg);
  const dates = [...new Set(all.flatMap((s) => s.bars.map((b) => b.date)))].sort();
  const di = new Map(dates.map((d, i) => [d, i]));
  const D = dates.length;

  const perWindow: Acc[][] = ends.map(() => vs.map(() => newAcc(D)));

  ends.forEach((end, w) => {
    for (const s of all) {
      let last = -1;
      for (let i = s.bars.length - 1; i >= 0; i--) if (s.bars[i].date <= end) { last = i; break; }
      if (last + 1 < WINDOW_BARS) continue;
      const c = context(s.bars.slice(last + 1 - WINDOW_BARS, last + 1));
      const n = c.bars.length;

      vs.forEach((v, k) => {
        const a = perWindow[w][k];
        let prev = v.cond(c, WARMUP - 1);
        for (let i = WARMUP; i < n; i++) {
          const now = v.cond(c, i);
          const fresh = now && !prev;
          prev = now;
          if (!fresh || !(c.sigma[i] > 0)) continue;
          const dIdx = di.get(c.bars[i].date)!;
          const sAnn = c.sigma[i] * Math.sqrt(252);
          H.forEach((h, hi) => {
            const z = c.z[hi][i];
            if (!Number.isFinite(z)) return;
            const e = z - c.base[hi];
            a.n[hi]++;
            a.edge[hi] += e;
            if (z > 0) a.up[hi]++;
            a.bySum[hi][dIdx] += e;
            a.byCnt[hi][dIdx]++;
            const move = c.bars[i + h].close / c.bars[i].close - 1;
            MARKUPS.forEach((mk, m) => {
              const p = atm(sAnn * mk, h / 252);
              SPREADS.forEach((sp, si) => {
                const callRet = Math.max(move, 0) / (p.call * (1 + sp)) - 1;
                const putRet = Math.max(-move, 0) / (p.put * (1 + sp)) - 1;
                a.call[hi][m][si] += callRet;
                a.put[hi][m][si] += putRet;
                if (callRet > 0) a.callWin[hi][m][si]++;
                if (putRet > 0) a.putWin[hi][m][si]++;
              });
            });
          });
        }
      });
    }
    process.stderr.write(`  window ending ${end} done\n`);
  });

  return vs.map((v, k) => ({
    id: v.id,
    windows: perWindow.map((pw) => finish(pw[k])),
    pooled: finish(merge(perWindow.map((pw) => pw[k]), D)),
  }));
}

// ---------------------------------------------------------------------------

function main() {
  const stage = process.argv[2];
  mkdirSync(OUT, { recursive: true });
  const selFile = resolve(OUT, "signal-selection.json");

  if (stage === "train") {
    const res = evaluate(TRAIN_ENDS);
    writeFileSync(resolve(OUT, "signal-train.json"), JSON.stringify(res));
    // Pre-registered: enough signals, the same direction in every train
    // window, significant when pooled; then the largest edge per signal.
    const ok = res.filter(
      (r) =>
        r.pooled.n >= 300 &&
        Math.abs(r.pooled.t[PRIMARY]) >= 2 &&
        r.windows.every((w) => Math.sign(w.edge[PRIMARY]) === Math.sign(r.pooled.edge[PRIMARY])),
    );
    ok.sort((a, b) => Math.abs(b.pooled.edge[PRIMARY]) - Math.abs(a.pooled.edge[PRIMARY]));
    const picks = ok.slice(0, 5).map((r) => ({
      id: r.id,
      direction: r.pooled.edge[PRIMARY] > 0 ? "bullish" : "bearish",
    }));
    writeFileSync(selFile, JSON.stringify({ committedAt: new Date().toISOString(), qualified: ok.length, picks }, null, 2));
    console.log(`train: ${res.length} variants, ${ok.length} qualified; top picks committed`);
    picks.forEach((p, i) => console.log(`  ${i + 1}. ${p.id} (${p.direction})`));
  } else if (stage === "test") {
    const sel = JSON.parse(readFileSync(selFile, "utf8"));
    const train: ReturnType<typeof evaluate> = JSON.parse(readFileSync(resolve(OUT, "signal-train.json"), "utf8"));
    const test = evaluate([loadAll().find((s) => s.symbol === "SPY")!.bars.at(-1)!.date]);
    writeFileSync(resolve(OUT, "signal-test.json"), JSON.stringify(test));
    report(train, test, sel);
  } else {
    console.error("usage: signal-edge.mts train|test");
    process.exit(2);
  }
}

function report(train: ReturnType<typeof evaluate>, test: ReturnType<typeof evaluate>, sel: { committedAt: string; qualified: number; picks: { id: string; direction: string }[] }) {
  const f = (v: number, d = 2) => (v >= 0 ? "+" : "") + v.toFixed(d);
  const byId = (rs: typeof train, id: string) => rs.find((r) => r.id === id)!;
  console.log(`selection committed ${sel.committedAt}; ${sel.qualified} variants qualified on train\n`);
  console.log("ALL VARIANTS, 5-day edge per signal in sd units (train pooled -> test). * = committed pick");
  console.log("variant".padEnd(46) + "train n   edge     t |  test n   edge     t");
  for (const r of train) {
    const t = byId(test, r.id);
    const star = sel.picks.some((p) => p.id === r.id) ? "*" : " ";
    console.log(
      `${star} ${r.id.padEnd(44)}${String(r.pooled.n).padStart(7)} ${f(r.pooled.edge[PRIMARY], 3).padStart(7)} ${f(r.pooled.t[PRIMARY], 1).padStart(5)} |` +
        `${String(t.pooled.n).padStart(7)} ${f(t.pooled.edge[PRIMARY], 3).padStart(7)} ${f(t.pooled.t[PRIMARY], 1).padStart(5)}`,
    );
  }
  console.log("\nCOMMITTED PICKS ON THE TEST WINDOW, as option trades (ATM, held to expiry)");
  console.log("mean return per trade; IV = trailing realised vol x markup; spread = half-spread paid on entry");
  for (const p of sel.picks) {
    const t = byId(test, p.id).pooled;
    const side = p.direction === "bullish" ? t.call : t.put;
    const wins = p.direction === "bullish" ? t.callWin : t.putWin;
    console.log(`\n  ${p.id} -> buy ${p.direction === "bullish" ? "calls" : "puts"}   (test signals ${t.n})`);
    H.forEach((h, hi) => {
      const cells = MARKUPS.flatMap((mk, m) =>
        SPREADS.map((sp, s) => `IVx${mk} sp${(sp * 100).toFixed(0)}% ${f(side[hi][m][s], 1).padStart(6)}%`),
      );
      console.log(`    ${String(h).padStart(2)}d  edge ${f(t.edge[hi], 3)} t ${f(t.t[hi], 1).padStart(5)}  win ${wins[hi][0][0].toFixed(0)}% | ${cells.join("  ")}`);
    });
  }
}

main();
