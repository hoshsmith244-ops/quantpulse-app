/**
 * Why the IV rich/cheap badge ranks cross-sectionally.
 *
 * Tests the obvious alternative -- FIXED cutoffs on log(HV_252 / IV), set on
 * train -- and finds the bucket ordering reverses between train and test
 * (after 2020 every stock's one-year vol was inflated at once). The weekly
 * cross-sectional sort in iv-analysis.mts held up in both; that is the rule
 * the app ships.
 *
 *   RESEARCH_CACHE=... node scripts/research/badge-cutoffs.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cacheDir, loadAll } from "./fetch.mts";
import type { IvRow } from "./fetch-iv.mts";

// The live badge needs FIXED cutoffs on log(HV_252 / IV) -- one ticker, no
// cross-section. Set them on train (pooled quintiles), then check the buckets
// still separate long-premium returns on test.
const TRAIN_END = "2023-09-29", H = 21, T = 30 / 365, R = 0.04;
const nc = (x: number) => { const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2); return 0.5 * (1 + Math.sign(x) * y); };
const strad = (s: number) => { const v = s * Math.sqrt(T), d1 = (R * T + v * v / 2) / v, d2 = d1 - v, k = Math.exp(-R * T); return nc(d1) - k * nc(d2) + k * nc(-d2) - nc(-d1); };
const ivs: IvRow[] = JSON.parse(readFileSync(resolve(cacheDir(), "iv_weekly.json"), "utf8"));
const bars = new Map(loadAll().map((s) => [s.symbol, s]));
type O = { date: string; etf: boolean; x: number; ls: number; ratio: number };
const obs: O[] = [];
for (const r of ivs) {
  const s = bars.get(r.symbol); if (!s || !(r.iv > 0.02 && r.iv < 5)) continue;
  const i = s.bars.findIndex((b) => b.date === r.date); if (i < 253 || i + H >= s.bars.length) continue;
  let q = 0; for (let k = i - 251; k <= i; k++) { const l = Math.log(s.bars[k].close / s.bars[k - 1].close); q += l * l; }
  const hv = Math.sqrt(252 * q / 252);
  const move = Math.abs(s.bars[i + H].close / s.bars[i].close - 1);
  const spread = s.kind === "ETF" ? 0.04 : 0.08;
  obs.push({ date: r.date, etf: s.kind === "ETF", x: Math.log(hv / r.iv), ratio: r.iv / hv, ls: move / (strad(r.iv) * (1 + 0.5 * spread / 2)) - 1 });
}
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
for (const etf of [false, true]) {
  const tr = obs.filter((o) => o.etf === etf && o.date <= TRAIN_END).map((o) => o.x).sort((a, b) => a - b);
  const cut = [0.2, 0.4, 0.6, 0.8].map((p) => tr[Math.floor(tr.length * p)]);
  console.log(`\n${etf ? "ETFs" : "single stocks"}: cutoffs on log(HV/IV) ${cut.map((c) => c.toFixed(3)).join(", ")}  ==  IV/HV ${cut.map((c) => Math.exp(-c).toFixed(2)).join(", ")}`);
  for (const [pl, f] of [["train", (o: O) => o.date <= TRAIN_END], ["test", (o: O) => o.date > TRAIN_END]] as const) {
    const set = obs.filter((o) => o.etf === etf && f(o));
    const b = (o: O) => cut.filter((c) => o.x > c).length; // 0 = IV richest
    const cells = [0, 1, 2, 3, 4].map((k) => { const g = set.filter((o) => b(o) === k); return `B${k + 1} n${String(g.length).padStart(5)} ${(mean(g.map((o) => o.ls)) * 100).toFixed(1).padStart(6)}%`; });
    console.log(`  ${pl.padEnd(5)} long straddle, 50% spread, by bucket (B1 = IV richest vs history): ${cells.join(" | ")}`);
  }
  console.log(`  median IV/HV: ${med(obs.filter((o) => o.etf === etf).map((o) => o.ratio)).toFixed(2)}`);
}
