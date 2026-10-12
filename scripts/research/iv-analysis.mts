/**
 * Options research with REAL implied vol (DoltHub weekly IV, mid-2020 on).
 *
 * Tests the questions the literature review ranked as worth testing, using the
 * design it says credible work needs: three cost levels, signals known at the
 * snapshot close, train through 2023-09-29 and test after.
 *
 *   0. Data checks   -- does this source's IV behave like IV? SPY vs VIX, and
 *                       what window its "hv" is.
 *   1. Variance premium on single stocks vs index ETFs, real IV.
 *   2. Goyal-Saretto: does log(HV_252 / IV) sort straddle returns?
 *   3. Our strategies vs option pricing: is IV rich or cheap when each
 *      strategy fires, and what do calls / straddles on those names return
 *      when priced at the real IV? (Settles last round's "breaks even at
 *      IV = 1.1x realised" coin flip.)
 *   4. One-month IV change as a stock-return and straddle predictor.
 *
 * Pricing: Black-Scholes at the snapshot's own IV, 30 calendar days, held to
 * expiry (21 sessions), so only the entry side of the spread is paid. Quoted
 * ATM spread assumed 8% of mid for stocks and 4% for ETFs (Bryzgalova,
 * Pavlova & Sikorskaya 2023 report 8.7% ATM / 8.4% ETF, all retail trades);
 * paid share of the HALF-spread: 0 (mid), 50%, 100%.
 *
 *   RESEARCH_CACHE=... node scripts/research/iv-analysis.mts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { computeFactor, FACTORS, type FactorId } from "../../src/lib/alpha.ts";

import { expandingRanks, WARMUP } from "./engine.mts";
import { cacheDir, loadAll } from "./fetch.mts";
import type { IvRow } from "./fetch-iv.mts";

const TRAIN_END = "2023-09-29";
const H = 21;
const T = 30 / 365;
const RATE = 0.04;
const PAID = [0, 0.5, 1];

const f = (v: number, d = 1) => (Number.isFinite(v) ? (v >= 0 ? "+" : "") + v.toFixed(d) : "  n/a");
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);

function ncdf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return 0.5 * (1 + Math.sign(x) * y);
}
function atm(sigma: number) {
  const s = sigma * Math.sqrt(T);
  const d1 = (RATE * T + (s * s) / 2) / s;
  const d2 = d1 - s;
  const disc = Math.exp(-RATE * T);
  const call = ncdf(d1) - disc * ncdf(d2);
  const put = disc * ncdf(-d2) - ncdf(-d1);
  return { call, put, straddle: call + put };
}

/** Newey-West t-stat of a weekly series whose holding periods overlap ~4 weeks. */
function nwT(x: number[], lags = 4) {
  const n = x.length;
  if (n < 10) return NaN;
  const m = mean(x);
  const d = x.map((v) => v - m);
  let s = d.reduce((a, v) => a + v * v, 0) / n;
  for (let l = 1; l <= lags; l++) {
    let c = 0;
    for (let i = l; i < n; i++) c += d[i] * d[i - l];
    s += 2 * (1 - l / (lags + 1)) * (c / n);
  }
  return m / Math.sqrt(s / n);
}

// ---------------------------------------------------------------------------
// Load and align
// ---------------------------------------------------------------------------

const series = loadAll();
const ivRows: IvRow[] = JSON.parse(readFileSync(resolve(cacheDir(), "iv_weekly.json"), "utf8"));
const vix = new Map<string, number>(
  (JSON.parse(readFileSync(resolve(cacheDir(), "vol_VIX.json"), "utf8")) as { date: string; iv: number }[]).map((p) => [p.date, p.iv]),
);

const STRATS = FACTORS.filter((x) => !x.external).map((x) => x.id);

type Obs = {
  date: string;
  symbol: string;
  etf: boolean;
  iv: number;
  hvSrc: number;
  hv252: number;
  rv20: number;
  rvFwd: number;
  move: number;
  ivMonthAgo: number | null;
  ret21: number;
  /** strategy -> rule holding at the snapshot close / entered within 5 sessions */
  inRule: Record<string, boolean>;
  fresh: Record<string, boolean>;
};

const obs: Obs[] = [];
const bySym = new Map(series.map((s) => [s.symbol, s]));
const ivBySym = new Map<string, IvRow[]>();
for (const r of ivRows) {
  if (!(r.iv > 0.02 && r.iv < 5)) continue;
  if (!ivBySym.has(r.symbol)) ivBySym.set(r.symbol, []);
  ivBySym.get(r.symbol)!.push(r);
}

for (const [sym, rows] of ivBySym) {
  const s = bySym.get(sym);
  if (!s || s.bars.length < 300) continue;
  const bars = s.bars;
  const idx = new Map(bars.map((b, i) => [b.date, i]));
  const r = new Float64Array(bars.length);
  for (let i = 1; i < bars.length; i++) r[i] = Math.log(bars[i].close / bars[i - 1].close);
  const rvOver = (a: number, b: number) => {
    let q = 0;
    for (let k = a; k <= b; k++) q += r[k] * r[k];
    return Math.sqrt((252 * q) / (b - a + 1));
  };
  const ranks = Object.fromEntries(
    STRATS.map((id) => [id, expandingRanks(computeFactor(bars, id, FACTORS.find((x) => x.id === id)!.def, {}))]),
  );
  const holds = (id: FactorId, i: number) => {
    const rk = ranks[id];
    return rk.le[i] >= 0 && rk.len[i] >= WARMUP && rk.le[i] >= Math.floor((rk.len[i] * 60) / 100) + 1;
  };

  // The source stopped filling iv_month_ago in late 2023, so a month-ago IV
  // is taken from this series itself: the snapshot 24-32 days earlier. Used
  // for every period, so train and test measure the same thing.
  const snaps = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const monthAgo = (date: string) => {
    const t = Date.parse(date);
    for (let k = snaps.length - 1; k >= 0; k--) {
      const gap = (t - Date.parse(snaps[k].date)) / 864e5;
      if (gap >= 24 && gap <= 32) return snaps[k].iv;
      if (gap > 32) break;
    }
    return null;
  };

  for (const row of rows) {
    const i = idx.get(row.date);
    if (i === undefined || i < 253 || i + H >= bars.length) continue;
    const inRule: Record<string, boolean> = {};
    const fresh: Record<string, boolean> = {};
    for (const id of STRATS) {
      inRule[id] = holds(id, i);
      let entered = false;
      for (let k = i; k > i - 5; k--) if (holds(id, k) && !holds(id, k - 1)) entered = true;
      fresh[id] = entered;
    }
    obs.push({
      date: row.date,
      symbol: sym,
      etf: s.kind === "ETF",
      iv: row.iv,
      hvSrc: row.hv,
      hv252: rvOver(i - 251, i),
      rv20: rvOver(i - 19, i),
      rvFwd: rvOver(i + 1, i + H),
      move: bars[i + H].close / bars[i].close - 1,
      ivMonthAgo: monthAgo(row.date),
      ret21: Math.log(bars[i + H].close / bars[i].close),
      inRule,
      fresh,
    });
  }
}

const isTrain = (o: Obs) => o.date <= TRAIN_END;
const periods: [string, (o: Obs) => boolean][] = [["train", isTrain], ["test", (o) => !isTrain(o)]];
const weeks = [...new Set(obs.map((o) => o.date))].sort();
const byDate = new Map<string, Obs[]>();
for (const o of obs) {
  if (!byDate.has(o.date)) byDate.set(o.date, []);
  byDate.get(o.date)!.push(o);
}
/** Per-week cross-sectional means of fn over a subset, in date order. */
const weekly = (set: Obs[], fn: (o: Obs) => number) => {
  const g = new Map<string, number[]>();
  for (const o of set) {
    const v = fn(o);
    if (!Number.isFinite(v)) continue;
    if (!g.has(o.date)) g.set(o.date, []);
    g.get(o.date)!.push(v);
  }
  return [...g.keys()].sort().map((d) => mean(g.get(d)!));
};

console.log(`${obs.length.toLocaleString()} stock-weeks with real IV, ${weeks[0]} .. ${weeks.at(-1)}, ` +
  `${new Set(obs.map((o) => o.symbol)).size} symbols; train ${obs.filter(isTrain).length.toLocaleString()} / test ${obs.filter((o) => !isTrain(o)).length.toLocaleString()}`);

// ---------------------------------------------------------------------------
// 0. Data checks
// ---------------------------------------------------------------------------

console.log(`\n0. DATA CHECKS`);
const spy = obs.filter((o) => o.symbol === "SPY" && vix.has(o.date));
console.log(`   SPY: this source's IV averages ${(mean(spy.map((o) => o.iv)) * 100).toFixed(1)}% vs VIX ${(mean(spy.map((o) => vix.get(o.date)!)) * 100).toFixed(1)}% on the same ${spy.length} days` +
  ` (VIX includes OTM skew, so it should read higher)`);
const corr = (a: number[], b: number[]) => {
  const ma = mean(a), mb = mean(b);
  let n = 0, x = 0, y = 0;
  for (let k = 0; k < a.length; k++) { n += (a[k] - ma) * (b[k] - mb); x += (a[k] - ma) ** 2; y += (b[k] - mb) ** 2; }
  return n / Math.sqrt(x * y);
};
console.log(`   correlation SPY IV vs VIX: ${corr(spy.map((o) => o.iv), spy.map((o) => vix.get(o.date)!)).toFixed(3)}`);
console.log(`   source "hv" vs our trailing 20-day realised vol: correlation ${corr(obs.map((o) => o.hvSrc), obs.map((o) => o.rv20)).toFixed(3)}, ` +
  `mean ${(mean(obs.map((o) => o.hvSrc)) * 100).toFixed(1)}% vs ${(mean(obs.map((o) => o.rv20)) * 100).toFixed(1)}%`);

// ---------------------------------------------------------------------------
// Option P&L helpers
// ---------------------------------------------------------------------------

const quoted = (o: Obs) => (o.etf ? 0.04 : 0.08);
/** long straddle return per $ premium paid */
const longStraddle = (o: Obs, paid: number) => {
  const p = atm(o.iv).straddle;
  return Math.abs(o.move) / (p * (1 + (paid * quoted(o)) / 2)) - 1;
};
/** short straddle P&L per $ premium received */
const shortStraddle = (o: Obs, paid: number) => {
  const p = atm(o.iv).straddle;
  return 1 - (paid * quoted(o)) / 2 - Math.abs(o.move) / p;
};
const longCall = (o: Obs, paid: number) => {
  const p = atm(o.iv).call;
  return Math.max(o.move, 0) / (p * (1 + (paid * quoted(o)) / 2)) - 1;
};

// ---------------------------------------------------------------------------
// 1. Variance premium
// ---------------------------------------------------------------------------

console.log(`\n1. VARIANCE PREMIUM with real IV -- 30-day IV vs the vol realised over the next 21 sessions`);
console.log("   group        period  stock-weeks  IV avg  RV avg  IV>RV   gap    short straddle per $ premium: mid / 50% spread / full spread");
for (const [label, pick] of [["index ETFs", (o: Obs) => o.etf], ["single stocks", (o: Obs) => !o.etf]] as const) {
  for (const [pl, pp] of periods) {
    const set = obs.filter((o) => pick(o) && pp(o));
    const cells = PAID.map((p) => {
      const wk = weekly(set, (o) => shortStraddle(o, p));
      return `${f(mean(set.map((o) => shortStraddle(o, p))) * 100)}% (t ${f(nwT(wk), 1)})`;
    });
    console.log(`   ${label.padEnd(13)}${pl.padEnd(7)}${String(set.length).padStart(9)}   ${(mean(set.map((o) => o.iv)) * 100).toFixed(1).padStart(5)}%  ${(mean(set.map((o) => o.rvFwd)) * 100).toFixed(1).padStart(5)}%  ` +
      `${((set.filter((o) => o.iv > o.rvFwd).length / set.length) * 100).toFixed(0).padStart(4)}%  ${f((mean(set.map((o) => o.iv)) - mean(set.map((o) => o.rvFwd))) * 100).padStart(5)}pt   ${cells.join("  ")}`);
  }
}

// ---------------------------------------------------------------------------
// 2. Goyal-Saretto sort
// ---------------------------------------------------------------------------

console.log(`\n2. GOYAL-SARETTO -- each week, sort single stocks by log(HV_252 / IV); long straddle return per $ premium`);
console.log("   (Q1 = IV richest vs history, Q5 = IV cheapest. The paper: buy Q5, sell Q1.)");
for (const [pl, pp] of periods) {
  for (const p of PAID) {
    const qret: number[][] = [[], [], [], [], []];
    const spreadWk: number[] = [];
    for (const w of weeks) {
      const set = (byDate.get(w) ?? []).filter((o) => !o.etf && pp(o));
      if (set.length < 25) continue;
      set.sort((a, b) => Math.log(a.hv252 / a.iv) - Math.log(b.hv252 / b.iv));
      const qs = [0, 1, 2, 3, 4].map((q) => set.slice(Math.floor((q * set.length) / 5), Math.floor(((q + 1) * set.length) / 5)));
      const m = qs.map((g) => mean(g.map((o) => longStraddle(o, p))));
      m.forEach((v, q) => qret[q].push(v));
      // long Q5 straddles, short Q1 straddles (each per $ premium, each paying its spread)
      spreadWk.push(m[4] + mean(qs[0].map((o) => shortStraddle(o, p))));
    }
    console.log(`   ${pl.padEnd(5)} ${p === 0 ? "mid       " : p === 0.5 ? "50% spread" : "full sprd "}  ` +
      qret.map((q, k) => `Q${k + 1} ${f(mean(q) * 100).padStart(6)}%`).join("  ") +
      `   | long Q5 + short Q1: ${f(mean(spreadWk) * 100)}% per 30 days (t ${f(nwT(spreadWk), 1)})`);
  }
}

// ---------------------------------------------------------------------------
// 3. Our strategies vs option pricing
// ---------------------------------------------------------------------------

console.log(`\n3. OUR STRATEGIES vs OPTION PRICING -- single stocks, fresh entries (rule entered within the last 5 sessions)`);
console.log("   IV/RV = implied vol at the signal / vol realised over the next 21 sessions. Call and straddle returns per $ premium, 50% of spread paid.");
console.log("   strategy                 period    n   IV/RV med | stock 21d | long ATM call         | long straddle        | short straddle");
for (const [pl, pp] of periods) {
  const all = obs.filter((o) => !o.etf && pp(o));
  const line = (label: string, set: Obs[]) => {
    if (set.length < 20) return;
    const ratio = set.map((o) => o.iv / o.rvFwd).sort((a, b) => a - b);
    const callW = weekly(set, (o) => longCall(o, 0.5));
    const lsW = weekly(set, (o) => longStraddle(o, 0.5));
    const ssW = weekly(set, (o) => shortStraddle(o, 0.5));
    console.log(`   ${label.padEnd(24)} ${pl.padEnd(6)}${String(set.length).padStart(6)}    ${ratio[ratio.length >> 1].toFixed(2)}   | ${f(mean(set.map((o) => o.ret21)) * 100).padStart(6)}%  | ` +
      `${f(mean(set.map((o) => longCall(o, 0.5))) * 100).padStart(6)}% (t ${f(nwT(callW), 1).padStart(5)}) | ` +
      `${f(mean(set.map((o) => longStraddle(o, 0.5))) * 100).padStart(6)}% (t ${f(nwT(lsW), 1).padStart(5)}) | ` +
      `${f(mean(set.map((o) => shortStraddle(o, 0.5))) * 100).padStart(6)}% (t ${f(nwT(ssW), 1).padStart(5)})`);
  };
  line("all stocks (baseline)", all);
  for (const id of STRATS) line(FACTORS.find((x) => x.id === id)!.name, all.filter((o) => o.fresh[id]));
}

// ---------------------------------------------------------------------------
// 4. One-month IV change
// ---------------------------------------------------------------------------

console.log(`\n4. ONE-MONTH IV CHANGE (An, Ang, Bali & Cakici style, aggregate IV only) -- single stocks, weekly quintiles of IV / IV a month ago`);
for (const [pl, pp] of periods) {
  const ret: number[][] = [[], [], [], [], []];
  const str: number[][] = [[], [], [], [], []];
  const ls: number[] = [];
  for (const w of weeks) {
    const set = (byDate.get(w) ?? []).filter((o) => !o.etf && o.ivMonthAgo && pp(o));
    if (set.length < 25) continue;
    set.sort((a, b) => a.iv / a.ivMonthAgo! - b.iv / b.ivMonthAgo!);
    const qs = [0, 1, 2, 3, 4].map((q) => set.slice(Math.floor((q * set.length) / 5), Math.floor(((q + 1) * set.length) / 5)));
    qs.forEach((g, q) => {
      ret[q].push(mean(g.map((o) => o.ret21)));
      str[q].push(mean(g.map((o) => longStraddle(o, 0.5))));
    });
    ls.push(mean(qs[0].map((o) => o.ret21)) - mean(qs[4].map((o) => o.ret21)));
  }
  console.log(`   ${pl.padEnd(5)} next-21d stock return by quintile (Q1 = IV fell most, Q5 = rose most): ` +
    ret.map((q, k) => `Q${k + 1} ${f(mean(q) * 100, 2)}%`).join("  ") + `   Q1-Q5 ${f(mean(ls) * 100, 2)}% (t ${f(nwT(ls), 1)})`);
  console.log(`   ${"".padEnd(5)} long straddle, 50% spread:                                ` + str.map((q, k) => `Q${k + 1} ${f(mean(q) * 100)}%`).join("  "));
}
