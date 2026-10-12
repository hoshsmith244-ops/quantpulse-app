/**
 * Calibrates the IV analysis against real option chains.
 *
 * iv-analysis.mts prices options with Black-Scholes at the snapshot's IV and
 * charges an ASSUMED spread. This samples real end-of-day chains for the same
 * stock-weeks and measures the two things that assumption stands in for:
 *
 *   - the actual quoted ATM bid-ask spread, as a share of mid
 *   - how a real ATM straddle's mid compares with the model's price
 *
 *   RESEARCH_CACHE=... node scripts/research/chain-calibrate.mts [sampleSize]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { cacheDir, loadAll } from "./fetch.mts";
import type { IvRow } from "./fetch-iv.mts";

const API = "https://www.dolthub.com/api/v1alpha1/post-no-preference/options/master";
const N = Number(process.argv[2] ?? 200);
const RATE = 0.04;

function ncdf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return 0.5 * (1 + Math.sign(x) * y);
}
function straddle(S: number, K: number, sigma: number, T: number) {
  const s = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + RATE * T + (s * s) / 2) / s;
  const d2 = d1 - s;
  const disc = Math.exp(-RATE * T);
  return S * ncdf(d1) - K * disc * ncdf(d2) + (K * disc * ncdf(-d2) - S * ncdf(-d1));
}

async function query(sql: string) {
  for (let a = 0; a < 3; a++) {
    try {
      const res = await fetch(`${API}?q=${encodeURIComponent(sql)}`, { signal: AbortSignal.timeout(75_000) });
      const j = (await res.json()) as { query_execution_status: string; rows?: Record<string, string>[] };
      if (j.query_execution_status === "Success") return j.rows ?? [];
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 4000 * (a + 1)));
  }
  return null;
}

const series = new Map(loadAll().map((s) => [s.symbol, s]));
const rows: IvRow[] = JSON.parse(readFileSync(resolve(cacheDir(), "iv_weekly.json"), "utf8"));

// Deterministic sample, stratified: a third ETFs, the rest single stocks.
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const usable = rows.filter((r) => series.has(r.symbol) && r.iv > 0.02 && r.iv < 5);
const etfs = usable.filter((r) => series.get(r.symbol)!.kind === "ETF");
const stocks = usable.filter((r) => series.get(r.symbol)!.kind !== "ETF");
const pick = (a: IvRow[], k: number) => Array.from({ length: k }, () => a[Math.floor(rand() * a.length)]);
const sample = [...pick(etfs, Math.round(N / 3)), ...pick(stocks, N - Math.round(N / 3))];

type Out = { date: string; symbol: string; etf: boolean; days: number; spreadCall: number; spreadPut: number; midOverModel: number; contractIv: number; snapIv: number; zeroBid: boolean };
const out: Out[] = [];
let k = 0;
const worker = async () => {
  for (;;) {
    const r = sample.shift();
    if (!r) return;
    const s = series.get(r.symbol)!;
    const bar = s.bars.find((b) => b.date === r.date);
    if (!bar) continue;
    const chain = await query(
      `SELECT expiration, strike, call_put, bid, ask, vol FROM option_chain WHERE date='${r.date}' AND act_symbol='${r.symbol.replace("-", ".")}'`,
    );
    k++;
    if (!chain || !chain.length) continue;
    const exps = [...new Set(chain.map((c) => String(c.expiration).slice(0, 10)))];
    const dte = (e: string) => (Date.parse(e) - Date.parse(r.date)) / 864e5;
    const exp = exps.filter((e) => dte(e) >= 7).sort((a, b) => Math.abs(dte(a) - 30) - Math.abs(dte(b) - 30))[0];
    if (!exp) continue;
    const at = chain.filter((c) => String(c.expiration).slice(0, 10) === exp);
    const strikes = [...new Set(at.map((c) => Number(c.strike)))];
    const K = strikes.sort((a, b) => Math.abs(a - bar.close) - Math.abs(b - bar.close))[0];
    const call = at.find((c) => Number(c.strike) === K && c.call_put === "Call");
    const put = at.find((c) => Number(c.strike) === K && c.call_put === "Put");
    if (!call || !put) continue;
    const cb = Number(call.bid), ca = Number(call.ask), pb = Number(put.bid), pa = Number(put.ask);
    const cm = (cb + ca) / 2, pm = (pb + pa) / 2;
    if (!(cm > 0 && pm > 0)) continue;
    const T = dte(exp) / 365;
    out.push({
      date: r.date,
      symbol: r.symbol,
      etf: s.kind === "ETF",
      days: Math.round(dte(exp)),
      spreadCall: (ca - cb) / cm,
      spreadPut: (pa - pb) / pm,
      midOverModel: (cm + pm) / straddle(bar.close, K, r.iv, T),
      contractIv: (Number(call.vol) + Number(put.vol)) / 2,
      snapIv: r.iv,
      zeroBid: cb <= 0 || pb <= 0,
    });
    if (k % 25 === 0) console.log(`  ${k} queried, ${out.length} usable`);
  }
};
await Promise.all(Array.from({ length: 3 }, worker));
writeFileSync(resolve(cacheDir(), "chain_calibration.json"), JSON.stringify(out));

const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const pc = (v: number) => (v * 100).toFixed(1) + "%";
for (const [label, set] of [["ETFs", out.filter((o) => o.etf)], ["single stocks", out.filter((o) => !o.etf)]] as const) {
  if (!set.length) continue;
  console.log(`\n${label}: ${set.length} real ATM straddles (median ${med(set.map((o) => o.days))} days to expiry)`);
  console.log(`  quoted spread, % of mid   calls: median ${pc(med(set.map((o) => o.spreadCall)))}  75th ${pc([...set.map((o) => o.spreadCall)].sort((a, b) => a - b)[Math.floor(set.length * 0.75)])}   puts: median ${pc(med(set.map((o) => o.spreadPut)))}`);
  console.log(`  real straddle mid / model price at snapshot IV: median ${med(set.map((o) => o.midOverModel)).toFixed(3)}`);
  console.log(`  contract IV / snapshot IV: median ${med(set.map((o) => o.contractIv / o.snapIv)).toFixed(3)}    zero bid on a leg: ${set.filter((o) => o.zeroBid).length}`);
}
